<script setup>
import { ref, shallowRef, watch, onMounted, onBeforeUnmount, computed } from 'vue'
import { forceSimulation, forceLink, forceManyBody, forceCollide, forceCenter, forceX, forceY } from 'd3-force'
import { keywordGraph, DIMENSIONS, DIM_BY_KEY } from '../data/works.js'

const props = defineProps({
  selectedTag: { type: String, default: null },
})
const emit = defineEmits(['pick'])

const data = keywordGraph()
const maxCount = Math.max(...data.nodes.map((n) => n.count))
const maxWeight = Math.max(...data.links.map((l) => l.weight))

const svgEl = ref(null)
const W = ref(900)
const H = ref(640)
const frame = ref(0)
const sim = shallowRef(null)
let simNodes = []
let simLinks = []

const pan = ref({ x: 0, y: 0 })
const zoom = ref(1)
const gravity = ref(0.06)
const hoverTag = ref(null)

function radius(n) {
  const r = 7 + Math.sqrt(n.count / maxCount) * 22
  return n.id === props.selectedTag ? r + 5 : r
}

const neighborTags = computed(() => {
  if (!props.selectedTag) return null
  const ids = new Set([props.selectedTag])
  for (const l of simLinks) {
    const s = l.source.id || l.source
    const t = l.target.id || l.target
    if (s === props.selectedTag) ids.add(t)
    if (t === props.selectedTag) ids.add(s)
  }
  return ids
})

const positioned = computed(() => {
  frame.value
  return { nodes: simNodes, links: simLinks }
})

function nodeActive(n) {
  if (!neighborTags.value) return true
  return neighborTags.value.has(n.id)
}
function linkActive(l) {
  if (!props.selectedTag) return true
  const s = l.source.id || l.source
  const t = l.target.id || l.target
  return s === props.selectedTag || t === props.selectedTag
}
function labelVisible(n) {
  if (props.selectedTag) return nodeActive(n)
  return n.count >= maxCount * 0.3 || hoverTag.value === n.id
}

function makeForces(s) {
  return s
    .velocityDecay(0.6)
    .force('link', forceLink(simLinks).id((d) => d.id)
      .distance((l) => 60 + (1 - l.weight / maxWeight) * 130)
      .strength((l) => 0.05 + (l.weight / maxWeight) * 0.5))
    .force('charge', forceManyBody().strength(-540).distanceMax(460))
    .force('collide', forceCollide().radius((d) => radius(d) + 8).strength(0.9))
    .force('center', forceCenter(W.value / 2, H.value / 2))
    .force('x', forceX(W.value / 2).strength(gravity.value))
    .force('y', forceY(H.value / 2).strength(gravity.value))
}

function build() {
  simNodes = data.nodes.map((n) => ({ ...n }))
  const byId = Object.fromEntries(simNodes.map((n) => [n.id, n]))
  simLinks = data.links.map((l) => ({ ...l, source: byId[l.source], target: byId[l.target] }))
  sim.value = makeForces(forceSimulation(simNodes)).on('tick', () => { frame.value++ })
  sim.value.alpha(1).restart()
}

// ---- interação -------------------------------------------------------------
let dragNode = null
function toGraph(evt) {
  const r = svgEl.value.getBoundingClientRect()
  return { x: (evt.clientX - r.left - pan.value.x) / zoom.value, y: (evt.clientY - r.top - pan.value.y) / zoom.value }
}
function onNodePointerDown(n, evt) {
  evt.stopPropagation()
  dragNode = n
  n._moved = false
  sim.value.alphaTarget(0.3).restart()
  window.addEventListener('pointermove', onMove)
  window.addEventListener('pointerup', onUp)
}
let panning = null
function onBgPointerDown(evt) {
  panning = { sx: evt.clientX, sy: evt.clientY, ox: pan.value.x, oy: pan.value.y }
  window.addEventListener('pointermove', onMove)
  window.addEventListener('pointerup', onUp)
}
function onMove(evt) {
  if (dragNode) {
    const p = toGraph(evt)
    dragNode.fx = p.x; dragNode.fy = p.y; dragNode._moved = true
  } else if (panning) {
    pan.value = { x: panning.ox + (evt.clientX - panning.sx), y: panning.oy + (evt.clientY - panning.sy) }
  }
}
function onUp() {
  if (dragNode) {
    sim.value.alphaTarget(0)
    dragNode.fx = null; dragNode.fy = null
    if (!dragNode._moved) emit('pick', dragNode.id === props.selectedTag ? null : dragNode.id)
    dragNode = null
  }
  panning = null
  window.removeEventListener('pointermove', onMove)
  window.removeEventListener('pointerup', onUp)
}
function onWheel(evt) {
  evt.preventDefault()
  const r = svgEl.value.getBoundingClientRect()
  const mx = evt.clientX - r.left, my = evt.clientY - r.top
  const factor = evt.deltaY < 0 ? 1.12 : 1 / 1.12
  const nz = Math.min(2.4, Math.max(0.35, zoom.value * factor))
  pan.value = { x: mx - (mx - pan.value.x) * (nz / zoom.value), y: my - (my - pan.value.y) * (nz / zoom.value) }
  zoom.value = nz
}
function resetView() {
  pan.value = { x: 0, y: 0 }; zoom.value = 1
  emit('pick', null)
  sim.value.alpha(0.5).restart()
}

let ro
onMounted(() => {
  const measure = () => { if (svgEl.value) { W.value = svgEl.value.clientWidth; H.value = svgEl.value.clientHeight } }
  measure()
  build()
  ro = new ResizeObserver(measure)
  ro.observe(svgEl.value)
})
onBeforeUnmount(() => { sim.value?.stop(); ro?.disconnect() })

watch(() => props.selectedTag, () => { if (sim.value) sim.value.alpha(0.2).restart() })
watch(gravity, (g) => {
  if (!sim.value) return
  sim.value.force('x').strength(g); sim.value.force('y').strength(g)
  sim.value.alpha(0.4).restart()
})

function tagColor(n) { return DIM_BY_KEY[n.dim].color }
</script>

<template>
  <div class="kw-wrap">
    <svg ref="svgEl" class="kw-svg" @pointerdown="onBgPointerDown" @wheel="onWheel">
      <g :transform="`translate(${pan.x},${pan.y}) scale(${zoom})`">
        <g class="links">
          <line
            v-for="(l, i) in positioned.links" :key="i"
            class="kw-link" :class="{ on: linkActive(l) }"
            :x1="l.source.x" :y1="l.source.y" :x2="l.target.x" :y2="l.target.y"
            :stroke-width="0.6 + (l.weight / maxWeight) * 4"
          />
        </g>
        <g class="nodes">
          <g
            v-for="n in positioned.nodes" :key="n.id"
            class="kw-node" :class="{ dim: !nodeActive(n), sel: n.id === selectedTag }"
            :transform="`translate(${n.x || 0},${n.y || 0})`"
            @pointerdown="onNodePointerDown(n, $event)"
            @pointerenter="hoverTag = n.id" @pointerleave="hoverTag = null"
          >
            <circle :r="radius(n)" :fill="tagColor(n)" :style="{ filter: `drop-shadow(0 0 7px ${tagColor(n)}66)` }" />
            <text
              v-if="labelVisible(n)" class="kw-label" :y="radius(n) + 13"
              :style="{ fontSize: (n.count >= maxCount * 0.5 ? 13 : 11) + 'px' }"
            >{{ n.id }}</text>
          </g>
        </g>
      </g>
    </svg>

    <div class="kw-controls">
      <button @click="zoom = Math.min(2.4, zoom * 1.15)">＋</button>
      <button @click="zoom = Math.max(0.35, zoom / 1.15)">－</button>
      <button @click="resetView" title="Recentralizar">⟳</button>
    </div>

    <div class="kw-grav">
      <label>Gravidade</label>
      <input type="range" min="0" max="0.18" step="0.005" v-model.number="gravity" />
    </div>

    <div class="kw-legend">
      <span v-for="d in DIMENSIONS" :key="d.key"><i :style="{ background: d.color }"></i>{{ d.label }}</span>
    </div>

    <div class="kw-hint">
      {{ data.nodes.length }} conceitos · arestas = co-ocorrência (obras que têm os dois) ·
      clique num conceito p/ destacar e listar obras
    </div>
  </div>
</template>

<style scoped>
.kw-wrap { position: relative; height: 100%; width: 100%; border: 1px solid var(--border); border-radius: 16px; background: var(--panel); overflow: hidden; user-select: none; -webkit-user-select: none; -webkit-touch-callout: none; }
.kw-svg { width: 100%; height: 100%; display: block; cursor: grab; touch-action: none; }
.kw-svg:active { cursor: grabbing; }

.kw-link { stroke: #36415f; opacity: .4; transition: opacity .2s, stroke .2s; }
.kw-link.on { stroke: var(--accent-2); opacity: .9; }

.kw-node { cursor: pointer; transition: opacity .25s; }
.kw-node.dim { opacity: .18; }
.kw-node.sel circle { stroke: #fff; stroke-width: 2; }
.kw-label {
  text-anchor: middle; font-weight: 600; fill: var(--text-dim);
  pointer-events: none; paint-order: stroke; stroke: var(--panel); stroke-width: 3px;
}
.kw-node.sel .kw-label, .kw-node:hover .kw-label { fill: var(--text); }

.kw-controls { position: absolute; top: 14px; right: 14px; display: flex; flex-direction: column; gap: 6px; }
.kw-controls button { width: 34px; height: 34px; border-radius: 9px; background: var(--panel-2); border: 1px solid var(--border); color: var(--text-dim); font-size: 16px; display: grid; place-items: center; transition: .15s; }
.kw-controls button:hover { color: var(--text); border-color: var(--accent); }

.kw-grav { position: absolute; top: 14px; left: 14px; display: flex; align-items: center; gap: 9px; background: rgba(10,13,20,.6); padding: 8px 12px; border-radius: 10px; border: 1px solid var(--border); backdrop-filter: blur(6px); }
.kw-grav label { font-size: 11px; color: var(--text-dim); font-weight: 600; }
.kw-grav input[type='range'] { width: 100px; height: 4px; -webkit-appearance: none; appearance: none; background: var(--panel-2); border-radius: 3px; outline: none; cursor: pointer; }
.kw-grav input[type='range']::-webkit-slider-thumb { -webkit-appearance: none; appearance: none; width: 14px; height: 14px; border-radius: 50%; background: var(--accent); cursor: pointer; border: 2px solid var(--panel); }

.kw-legend { position: absolute; left: 14px; bottom: 12px; display: flex; gap: 14px; flex-wrap: wrap; background: rgba(10,13,20,.6); padding: 7px 12px; border-radius: 10px; border: 1px solid var(--border); backdrop-filter: blur(6px); }
.kw-legend span { display: inline-flex; align-items: center; gap: 6px; font-size: 11.5px; color: var(--text-dim); }
.kw-legend i { width: 10px; height: 10px; border-radius: 50%; }

.kw-hint { position: absolute; right: 14px; bottom: 12px; font-size: 10.5px; color: var(--text-faint); background: rgba(10,13,20,.6); padding: 6px 10px; border-radius: 8px; border: 1px solid var(--border); max-width: 300px; text-align: right; }

@media (max-width: 820px) {
  .kw-wrap { border-radius: 14px; }
  .kw-hint { display: none; }
  .kw-grav { top: 10px; left: 10px; }
  .kw-grav input[type='range'] { width: 74px; }
  .kw-controls { top: 10px; right: 10px; }
  .kw-controls button { width: 30px; height: 30px; }
  .kw-legend { left: 10px; bottom: 10px; gap: 8px; padding: 6px 9px; }
}
</style>
