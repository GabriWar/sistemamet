<script setup>
import { ref, shallowRef, watch, onMounted, onBeforeUnmount, computed } from 'vue'
import {
  forceSimulation, forceLink, forceManyBody, forceCollide, forceCenter, forceX, forceY,
} from 'd3-force'
import { TYPES, egoGraph, fixedGraph, seedWorks } from '../data/works.js'

const props = defineProps({
  selectedId: { type: String, default: null },
  hoverLinkKey: { type: String, default: null },
  hidden: { type: Object, default: () => new Set() },
  perNode: { type: Number, default: 7 },
})
const emit = defineEmits(['select-node', 'select-link', 'hover-link', 'recenter'])

const svgEl = ref(null)
const W = ref(900)
const H = ref(640)
const frame = ref(0)
const sim = shallowRef(null)
let simNodes = []
let simLinks = []
const posCache = new Map()

const pan = ref({ x: 0, y: 0 })
const zoom = ref(1)
const gravity = ref(0.05) // força que puxa os nós ao centro

// obras "abertas" (cada uma traz seus vizinhos). vazio = sementes iniciais.
const expanded = ref(new Set())

// subgrafo visível: sem nada aberto = só as sementes; senão, ego das abertas
const visible = computed(() => {
  if (!expanded.value.size) return fixedGraph(seedWorks(14), props.hidden)
  return egoGraph([...expanded.value], { perNode: props.perNode, exclude: props.hidden })
})

function nodeRadius(n) {
  const base = 15 + (n.rating / (n.ratingMax === 5 ? 5 : 10)) * 11
  return n.id === props.selectedId ? base + 8 : base
}

const neighborIds = computed(() => {
  if (!props.selectedId) return null
  const ids = new Set([props.selectedId])
  for (const l of simLinks) {
    const s = l.source.id || l.source
    const t = l.target.id || l.target
    if (s === props.selectedId) ids.add(t)
    if (t === props.selectedId) ids.add(s)
  }
  return ids
})

function linkKey(l) {
  const s = l.source.id || l.source
  const t = l.target.id || l.target
  return `${s}__${t}`
}

const positioned = computed(() => {
  frame.value
  return { nodes: simNodes, links: simLinks }
})

function isNodeActive(n) {
  if (!neighborIds.value) return true
  return neighborIds.value.has(n.id)
}
function isLinkActive(l) {
  if (!props.selectedId) return true
  const s = l.source.id || l.source
  const t = l.target.id || l.target
  return s === props.selectedId || t === props.selectedId
}
function isExpandable(n) {
  return n.id !== props.selectedId && !expanded.value.has(n.id)
}

function makeForces(s) {
  return s
    .velocityDecay(0.62)
    .force('link', forceLink(simLinks).id((d) => d.id)
      .distance((l) => 110 + (1 - l.score) * 170)
      .strength((l) => 0.04 + l.score * 0.16))
    .force('charge', forceManyBody().strength(-820).distanceMax(520))
    .force('collide', forceCollide().radius((d) => nodeRadius(d) + 30).strength(0.9))
    .force('center', forceCenter(W.value / 2, H.value / 2))
    .force('x', forceX(W.value / 2).strength(gravity.value))
    .force('y', forceY(H.value / 2).strength(gravity.value))
}

function rebuild(reheat = 0.7) {
  // guarda posições atuais antes de recriar
  for (const n of simNodes) posCache.set(n.id, { x: n.x, y: n.y, vx: n.vx, vy: n.vy })

  const cx = W.value / 2
  const cy = H.value / 2
  simNodes = visible.value.nodes.map((n) => {
    const p = posCache.get(n.id)
    return p
      ? { ...n, x: p.x, y: p.y, vx: p.vx, vy: p.vy }
      : { ...n, x: cx + (Math.random() - 0.5) * 140, y: cy + (Math.random() - 0.5) * 140 }
  })
  const byId = Object.fromEntries(simNodes.map((n) => [n.id, n]))
  simLinks = visible.value.links
    .filter((l) => byId[l.source] && byId[l.target])
    .map((l) => ({ ...l, source: byId[l.source], target: byId[l.target] }))

  sim.value?.stop()
  sim.value = makeForces(forceSimulation(simNodes)).on('tick', () => { frame.value++ })
  sim.value.alpha(reheat).restart()
}

// ---- interação -------------------------------------------------------------
let dragNode = null

function toGraph(evt) {
  const r = svgEl.value.getBoundingClientRect()
  return {
    x: (evt.clientX - r.left - pan.value.x) / zoom.value,
    y: (evt.clientY - r.top - pan.value.y) / zoom.value,
  }
}

function onNodePointerDown(n, evt) {
  evt.stopPropagation()
  dragNode = n
  n._moved = false
  sim.value.alphaTarget(0.3).restart()
  window.addEventListener('pointermove', onPointerMove)
  window.addEventListener('pointerup', onPointerUp)
}

let panning = null
function onBgPointerDown(evt) {
  panning = { sx: evt.clientX, sy: evt.clientY, ox: pan.value.x, oy: pan.value.y }
  window.addEventListener('pointermove', onPointerMove)
  window.addEventListener('pointerup', onPointerUp)
}

function onPointerMove(evt) {
  if (dragNode) {
    const p = toGraph(evt)
    dragNode.fx = p.x
    dragNode.fy = p.y
    dragNode._moved = true
  } else if (panning) {
    pan.value = { x: panning.ox + (evt.clientX - panning.sx), y: panning.oy + (evt.clientY - panning.sy) }
  }
}

function onPointerUp() {
  if (dragNode) {
    sim.value.alphaTarget(0)
    dragNode.fx = null
    dragNode.fy = null
    if (!dragNode._moved) emit('select-node', dragNode.id) // clicar = focar + expandir
    dragNode = null
  }
  panning = null
  window.removeEventListener('pointermove', onPointerMove)
  window.removeEventListener('pointerup', onPointerUp)
}

function onWheel(evt) {
  evt.preventDefault()
  const r = svgEl.value.getBoundingClientRect()
  const mx = evt.clientX - r.left
  const my = evt.clientY - r.top
  const factor = evt.deltaY < 0 ? 1.12 : 1 / 1.12
  const nz = Math.min(2.4, Math.max(0.35, zoom.value * factor))
  pan.value = {
    x: mx - (mx - pan.value.x) * (nz / zoom.value),
    y: my - (my - pan.value.y) * (nz / zoom.value),
  }
  zoom.value = nz
}

function resetView() {
  pan.value = { x: 0, y: 0 }
  zoom.value = 1
  expanded.value = new Set()
  emit('recenter')
}

let ro
onMounted(() => {
  const measure = () => {
    if (!svgEl.value) return
    W.value = svgEl.value.clientWidth
    H.value = svgEl.value.clientHeight
  }
  measure()
  rebuild(0.9)
  ro = new ResizeObserver(measure)
  ro.observe(svgEl.value)
})

onBeforeUnmount(() => {
  sim.value?.stop()
  ro?.disconnect()
})

// abrir a obra selecionada → entra no conjunto expandido
watch(() => props.selectedId, (id) => {
  if (id && !expanded.value.has(id)) {
    expanded.value = new Set([...expanded.value, id])
  } else if (sim.value) {
    sim.value.alpha(0.3).restart()
  }
})

// quando o subgrafo visível muda, reconstrói a simulação (preservando posições)
watch(visible, () => rebuild(0.7))

// gravidade ao vivo
watch(gravity, (g) => {
  if (!sim.value) return
  sim.value.force('x').strength(g)
  sim.value.force('y').strength(g)
  sim.value.alpha(0.4).restart()
})
</script>

<template>
  <div class="graph-wrap">
    <svg ref="svgEl" class="graph-svg" @pointerdown="onBgPointerDown" @wheel="onWheel">
      <g :transform="`translate(${pan.x},${pan.y}) scale(${zoom})`">
        <TransitionGroup tag="g" name="link" class="links">
          <g
            v-for="l in positioned.links"
            :key="linkKey(l)"
            class="link-g"
            :class="{ active: isLinkActive(l), hovered: hoverLinkKey === linkKey(l) }"
            @pointerenter="emit('hover-link', linkKey(l))"
            @pointerleave="emit('hover-link', null)"
            @pointerdown.stop="emit('select-link', l)"
          >
            <line class="link-hit" :x1="l.source.x" :y1="l.source.y" :x2="l.target.x" :y2="l.target.y" />
            <line
              class="link-line"
              :x1="l.source.x" :y1="l.source.y" :x2="l.target.x" :y2="l.target.y"
              :stroke-width="1 + l.score * 5"
            />
            <text
              v-if="(isLinkActive(l) && selectedId) || hoverLinkKey === linkKey(l)"
              class="link-label"
              :x="(l.source.x + l.target.x) / 2"
              :y="(l.source.y + l.target.y) / 2"
            >{{ l.score.toFixed(2) }}</text>
          </g>
        </TransitionGroup>

        <TransitionGroup tag="g" name="node" class="nodes">
          <g
            v-for="n in positioned.nodes"
            :key="n.id"
            class="node-g"
            :class="{ dim: !isNodeActive(n), selected: n.id === selectedId }"
            :transform="`translate(${n.x || 0},${n.y || 0})`"
            @pointerdown="onNodePointerDown(n, $event)"
          >
            <g class="node-inner">
              <circle v-if="n.id === selectedId" class="node-ring" :r="nodeRadius(n) + 6" :stroke="TYPES[n.type].color" />
              <circle
                class="node-dot"
                :r="nodeRadius(n)"
                :fill="TYPES[n.type].color"
                :style="{ filter: `drop-shadow(0 0 9px ${TYPES[n.type].glow})` }"
              />
              <circle v-if="isExpandable(n)" class="node-expand" :cx="nodeRadius(n) * 0.72" :cy="-nodeRadius(n) * 0.72" r="6" />
              <text v-if="isExpandable(n)" class="node-expand-plus" :x="nodeRadius(n) * 0.72" :y="-nodeRadius(n) * 0.72" dy="0.32em">+</text>
              <text class="node-emoji" dy="0.35em">{{ n.title.charAt(0) }}</text>
              <text class="node-label" :y="nodeRadius(n) + 15">{{ n.title }}</text>
            </g>
          </g>
        </TransitionGroup>
      </g>
    </svg>

    <div class="graph-controls">
      <button @click="zoom = Math.min(2.4, zoom * 1.15)">＋</button>
      <button @click="zoom = Math.max(0.35, zoom / 1.15)">－</button>
      <button @click="resetView" title="Recomeçar (voltar às sementes)">⟳</button>
    </div>

    <div class="gravity-ctl">
      <label>Gravidade</label>
      <input type="range" min="0" max="0.18" step="0.005" v-model.number="gravity" />
      <span>{{ gravity.toFixed(3) }}</span>
    </div>

    <div class="graph-legend">
      <span v-for="(t, k) in TYPES" :key="k" class="legend-item">
        <i :style="{ background: t.color }"></i>{{ t.label }}
      </span>
    </div>

    <div class="graph-hint">
      {{ positioned.nodes.length }} obras à vista · clique num nó p/ focar e <b>expandir</b> ·
      clique numa aresta p/ ver o porquê · ⟳ recomeça
    </div>
  </div>
</template>

<style scoped>
.graph-wrap {
  position: relative; height: 100%; width: 100%;
  border: 1px solid var(--border); border-radius: 16px; background: var(--panel); overflow: hidden;
}
.graph-svg { width: 100%; height: 100%; display: block; cursor: grab; touch-action: none; }
.graph-svg:active { cursor: grabbing; }

.link-line { stroke: #36415f; opacity: .5; transition: stroke .2s, opacity .2s; }
.link-hit { stroke: transparent; stroke-width: 14; }
.link-g { cursor: pointer; }
.link-g.active .link-line { stroke: #6b7ce0; opacity: .9; }
.link-g.hovered .link-line { stroke: var(--accent-2); opacity: 1; }
.link-g:not(.active) { opacity: .3; }
.link-label {
  fill: #cdd6ea; font-size: 11px; font-weight: 700; text-anchor: middle;
  paint-order: stroke; stroke: var(--panel); stroke-width: 4px;
}

.node-g { cursor: pointer; transition: opacity .25s; }
.node-g.dim { opacity: .2; }
.node-dot { transition: r .2s; }
.node-ring { fill: none; stroke-width: 2.5; opacity: .9; }
.node-expand { fill: var(--panel-2); stroke: var(--accent); stroke-width: 1.5; }
.node-expand-plus { text-anchor: middle; font-size: 9px; font-weight: 800; fill: var(--accent); pointer-events: none; }
.node-emoji { text-anchor: middle; font-weight: 800; font-size: 14px; fill: #0a0d14; pointer-events: none; }
.node-label {
  text-anchor: middle; font-size: 11px; font-weight: 600; fill: var(--text-dim);
  pointer-events: none; paint-order: stroke; stroke: var(--panel); stroke-width: 3px;
}
.node-g.selected .node-label { fill: var(--text); }

/* aparecer / sumir */
.node-inner { transform-box: fill-box; transform-origin: center; }
.node-enter-active .node-inner { transition: transform .42s cubic-bezier(.34, 1.56, .64, 1), opacity .3s ease; }
.node-leave-active { pointer-events: none; }
.node-leave-active .node-inner { transition: transform .28s ease, opacity .28s ease; }
.node-enter-from .node-inner, .node-leave-to .node-inner { opacity: 0; transform: scale(0); }

.link-g { transition: opacity .35s ease; }
.link-leave-active { pointer-events: none; }
.link-enter-from, .link-leave-to { opacity: 0 !important; }

.graph-controls { position: absolute; top: 14px; right: 14px; display: flex; flex-direction: column; gap: 6px; }
.graph-controls button {
  width: 34px; height: 34px; border-radius: 9px; background: var(--panel-2);
  border: 1px solid var(--border); color: var(--text-dim); font-size: 16px;
  display: grid; place-items: center; transition: .15s;
}
.graph-controls button:hover { color: var(--text); border-color: var(--accent); }

.gravity-ctl {
  position: absolute; top: 14px; left: 14px; display: flex; align-items: center; gap: 9px;
  background: rgba(10,13,20,.6); padding: 8px 12px; border-radius: 10px;
  border: 1px solid var(--border); backdrop-filter: blur(6px);
}
.gravity-ctl label { font-size: 11px; color: var(--text-dim); font-weight: 600; }
.gravity-ctl span { font-size: 10.5px; color: var(--text-faint); font-variant-numeric: tabular-nums; min-width: 34px; }
.gravity-ctl input[type='range'] {
  width: 110px; height: 4px; -webkit-appearance: none; appearance: none;
  background: var(--panel-2); border-radius: 3px; outline: none; cursor: pointer;
}
.gravity-ctl input[type='range']::-webkit-slider-thumb {
  -webkit-appearance: none; appearance: none; width: 14px; height: 14px; border-radius: 50%;
  background: var(--accent); cursor: pointer; border: 2px solid var(--panel);
}
.gravity-ctl input[type='range']::-moz-range-thumb {
  width: 14px; height: 14px; border-radius: 50%; background: var(--accent); cursor: pointer; border: 2px solid var(--panel);
}

.graph-legend {
  position: absolute; left: 14px; bottom: 12px; display: flex; gap: 14px; flex-wrap: wrap;
  background: rgba(10,13,20,.6); padding: 7px 12px; border-radius: 10px;
  border: 1px solid var(--border); backdrop-filter: blur(6px);
}
.legend-item { display: inline-flex; align-items: center; gap: 6px; font-size: 11.5px; color: var(--text-dim); }
.legend-item i { width: 10px; height: 10px; border-radius: 50%; display: inline-block; }

.graph-hint {
  position: absolute; right: 14px; bottom: 12px; font-size: 10.5px; color: var(--text-faint);
  background: rgba(10,13,20,.6); padding: 6px 10px; border-radius: 8px; border: 1px solid var(--border);
  max-width: 300px; text-align: right;
}
.graph-hint b { color: var(--text-dim); }
</style>
