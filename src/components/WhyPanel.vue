<script setup>
import { computed } from 'vue'
import { WORKS_BY_ID, TYPES } from '../data/works.js'

const props = defineProps({ link: { type: Object, required: true } })
defineEmits(['select-node', 'close'])

const a = computed(() => WORKS_BY_ID[props.link.source.id || props.link.source])
const b = computed(() => WORKS_BY_ID[props.link.target.id || props.link.target])
const pct = computed(() => Math.round(props.link.score * 100))
</script>

<template>
  <div class="why">
    <div class="why-head">
      <span class="why-tag">Por que conectados?</span>
      <button class="why-close" @click="$emit('close')">✕</button>
    </div>

    <div class="why-pair">
      <button class="pair-node" @click="$emit('select-node', a.id)">
        <i :style="{ background: TYPES[a.type].color }">{{ a.title.charAt(0) }}</i>
        <span>{{ a.title }}</span>
      </button>
      <div class="pair-score">
        <strong>{{ pct }}%</strong>
        <small>similaridade</small>
      </div>
      <button class="pair-node" @click="$emit('select-node', b.id)">
        <i :style="{ background: TYPES[b.type].color }">{{ b.title.charAt(0) }}</i>
        <span>{{ b.title }}</span>
      </button>
    </div>

    <p class="why-explain">
      A nota é a soma da sobreposição de atributos em cada dimensão, ponderada
      pelo peso da dimensão. Veja a contribuição de cada uma:
    </p>

    <div class="dims">
      <div v-for="d in link.breakdown" :key="d.key" class="dim">
        <div class="dim-top">
          <span class="dim-name">{{ d.label }}</span>
          <span class="dim-weight">peso {{ d.peso.toFixed(2) }}</span>
          <span class="dim-contrib">+{{ (d.score * d.peso).toFixed(2) }}</span>
        </div>
        <div class="dim-bar">
          <div class="dim-fill" :style="{ width: (d.score * 100) + '%' }"></div>
        </div>
        <div class="dim-shared">
          <template v-if="d.shared.length">
            <span v-for="s in d.shared" :key="s" class="chip">{{ s }}</span>
          </template>
          <span v-else class="dim-none">nada em comum</span>
        </div>
      </div>
    </div>

    <div class="why-total">
      <span>Nota final</span>
      <strong>{{ link.score.toFixed(2) }}</strong>
    </div>
  </div>
</template>

<style scoped>
.why { display: flex; flex-direction: column; gap: 14px; }
.why-head { display: flex; align-items: center; justify-content: space-between; }
.why-tag {
  font-size: 12px; font-weight: 700; letter-spacing: .04em; text-transform: uppercase;
  color: var(--accent-2);
}
.why-close { color: var(--text-faint); font-size: 14px; }
.why-close:hover { color: var(--text); }

.why-pair { display: flex; align-items: center; gap: 10px; }
.pair-node {
  flex: 1; display: flex; flex-direction: column; align-items: center; gap: 8px;
  text-align: center; padding: 12px 8px; border-radius: 12px;
  background: var(--panel-2); border: 1px solid var(--border); transition: .15s;
}
.pair-node:hover { border-color: var(--accent); }
.pair-node i {
  width: 38px; height: 38px; border-radius: 50%; display: grid; place-items: center;
  font-weight: 800; color: #0a0d14; font-size: 16px;
}
.pair-node span { font-size: 12px; font-weight: 600; line-height: 1.25; color: var(--text-dim); }
.pair-score { display: flex; flex-direction: column; align-items: center; min-width: 64px; }
.pair-score strong { font-size: 22px; color: var(--text); }
.pair-score small { font-size: 9.5px; color: var(--text-faint); text-transform: uppercase; letter-spacing: .05em; }

.why-explain { font-size: 12px; color: var(--text-dim); line-height: 1.5; margin: 0; }

.dims { display: flex; flex-direction: column; gap: 14px; }
.dim-top { display: flex; align-items: baseline; gap: 8px; margin-bottom: 5px; }
.dim-name { font-size: 12.5px; font-weight: 600; color: var(--text); }
.dim-weight { font-size: 10px; color: var(--text-faint); }
.dim-contrib { margin-left: auto; font-size: 12px; font-weight: 700; color: #6ee7a8; }
.dim-bar { height: 6px; border-radius: 4px; background: var(--panel-2); overflow: hidden; }
.dim-fill { height: 100%; background: var(--accent); border-radius: 4px; transition: width .4s; }
.dim-shared { display: flex; flex-wrap: wrap; gap: 5px; margin-top: 8px; }
.dim-none { font-size: 11px; color: var(--text-faint); font-style: italic; }

.why-total {
  display: flex; align-items: center; justify-content: space-between;
  padding: 12px 14px; border-radius: 12px; margin-top: 2px;
  background: var(--panel-2);
  border: 1px solid var(--border);
}
.why-total span { font-size: 12px; color: var(--text-dim); }
.why-total strong { font-size: 20px; color: var(--text); }
</style>
