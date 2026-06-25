<script setup>
import { computed } from 'vue'
import { WORKS_BY_ID, TYPES } from '../data/works.js'

const props = defineProps({
  paths: { type: Array, required: true }, // [{ key,label,path,hops,length }]
  colors: { type: Array, required: true },
  ends: { type: Object, required: true }, // { from, to }
  activePath: { type: Number, default: null },
})
defineEmits(['set-active', 'select-node', 'close'])

const a = computed(() => WORKS_BY_ID[props.ends.from])
const b = computed(() => WORKS_BY_ID[props.ends.to])

function sharedOf(hop) {
  // junta os atributos compartilhados de todas as dimensões do elo
  return hop.breakdown.flatMap((d) => d.shared).slice(0, 5)
}
</script>

<template>
  <div class="pp">
    <div class="pp-head">
      <span class="pp-tag">O que une as duas</span>
      <button class="pp-x" @click="$emit('close')">✕</button>
    </div>

    <div class="pp-ends">
      <b>{{ a?.title }}</b> <span>→</span> <b>{{ b?.title }}</b>
    </div>

    <p v-if="!paths.length" class="pp-empty">Sem caminho entre essas duas obras no acervo.</p>

    <p v-else class="pp-sub">
      {{ paths.length }} {{ paths.length > 1 ? 'rotas' : 'rota' }}. Passe o mouse para destacar no grafo.
    </p>

    <div
      v-for="(r, i) in paths" :key="r.key"
      class="route" :class="{ on: activePath === i }"
      :style="{ '--rc': colors[i] }"
      @mouseenter="$emit('set-active', i)"
      @mouseleave="$emit('set-active', null)"
    >
      <div class="route-top">
        <i class="route-dot"></i>
        <b>{{ r.label }}</b>
        <span class="route-len">{{ r.length }} {{ r.length > 1 ? 'saltos' : 'salto' }}</span>
      </div>

      <div class="chain">
        <template v-for="(id, k) in r.path" :key="id">
          <button class="chain-node" @click="$emit('select-node', id)">
            <i :style="{ background: TYPES[WORKS_BY_ID[id].type].color }">{{ WORKS_BY_ID[id].title.charAt(0) }}</i>
            <span>{{ WORKS_BY_ID[id].title }}</span>
          </button>
          <div v-if="k < r.hops.length" class="hop">
            <span class="hop-score">{{ Math.round(r.hops[k].score * 100) }}%</span>
            <span v-for="s in sharedOf(r.hops[k])" :key="s" class="hop-chip">{{ s }}</span>
          </div>
        </template>
      </div>
    </div>
  </div>
</template>

<style scoped>
.pp { display: flex; flex-direction: column; gap: 12px; }
.pp-head { display: flex; align-items: center; justify-content: space-between; }
.pp-tag { font-size: 12px; font-weight: 700; letter-spacing: .04em; text-transform: uppercase; color: var(--accent-2); }
.pp-x { color: var(--text-faint); font-size: 14px; }
.pp-x:hover { color: var(--text); }
.pp-ends { font-size: 14px; line-height: 1.5; }
.pp-ends b { color: var(--text); }
.pp-ends span { color: var(--text-faint); margin: 0 6px; }
.pp-sub { font-size: 12px; color: var(--text-dim); margin: 0; }
.pp-empty { font-size: 13px; color: var(--text-dim); }

.route {
  border: 1px solid var(--border); border-left: 3px solid var(--rc); border-radius: 11px;
  padding: 12px 13px; background: var(--panel); transition: .15s; cursor: default;
}
.route.on { background: var(--panel-2); border-color: var(--rc); }
.route-top { display: flex; align-items: center; gap: 8px; margin-bottom: 10px; }
.route-dot { width: 10px; height: 10px; border-radius: 50%; background: var(--rc); }
.route-top b { font-size: 13px; }
.route-len { margin-left: auto; font-size: 11px; color: var(--text-faint); }

.chain { display: flex; flex-direction: column; gap: 0; }
.chain-node { display: flex; align-items: center; gap: 9px; padding: 5px 6px; border-radius: 8px; width: 100%; transition: .12s; }
.chain-node:hover { background: var(--panel); }
.route.on .chain-node:hover { background: var(--bg-2); }
.chain-node i { width: 24px; height: 24px; border-radius: 50%; display: grid; place-items: center; font-weight: 800; font-size: 11px; color: #0a0d14; flex-shrink: 0; }
.chain-node span { font-size: 12.5px; color: var(--text-dim); text-align: left; }

.hop { display: flex; flex-wrap: wrap; align-items: center; gap: 5px; padding: 3px 0 3px 30px; margin: 1px 0; position: relative; }
.hop::before { content: ''; position: absolute; left: 17px; top: 0; bottom: 0; width: 2px; background: var(--rc); opacity: .4; }
.hop-score { font-size: 10.5px; font-weight: 700; color: var(--rc); }
.hop-chip { font-size: 10px; padding: 1px 7px; border-radius: 999px; background: var(--panel-2); border: 1px solid var(--border); color: var(--text-faint); }
</style>
