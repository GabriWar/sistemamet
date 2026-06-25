<script setup>
import { WORKS_BY_ID, TYPES } from '../data/works.js'

defineProps({
  pool: { type: Array, required: true }, // ids
  ranking: { type: Array, required: true }, // [{ work, score }]
})
defineEmits(['remove', 'clear', 'add', 'open'])
</script>

<template>
  <div class="pool">
    <div class="pool-head">
      <span class="pool-tag">Pool · {{ pool.length }}</span>
      <button class="pool-x" @click="$emit('clear')">limpar</button>
    </div>

    <p class="pool-sub">
      Botão direito num nó adiciona à pool. Mostramos as obras mais parecidas com
      <b>o conjunto</b> (média da similaridade com cada membro).
    </p>

    <div class="pool-chips">
      <button v-for="id in pool" :key="id" class="pool-chip" @click="$emit('remove', id)">
        <i :style="{ background: TYPES[WORKS_BY_ID[id].type].color }"></i>
        {{ WORKS_BY_ID[id].title }}
        <span class="x">✕</span>
      </button>
    </div>

    <h3 class="pool-h3">Mais parecidas com a pool <small>clique p/ somar</small></h3>
    <div v-if="ranking.length" class="pool-list">
      <button v-for="r in ranking" :key="r.work.id" class="pool-item" @click="$emit('add', r.work.id)">
        <i :style="{ background: TYPES[r.work.type].color }">{{ r.work.title.charAt(0) }}</i>
        <span class="pi-name">{{ r.work.title }}</span>
        <span class="pi-score">{{ Math.round(r.score * 100) }}%</span>
        <span class="pi-add">＋</span>
      </button>
    </div>
    <p v-else class="pool-empty">Sem obras parecidas o bastante.</p>
  </div>
</template>

<style scoped>
.pool { display: flex; flex-direction: column; gap: 12px; }
.pool-head { display: flex; align-items: center; justify-content: space-between; }
.pool-tag { font-size: 12px; font-weight: 700; letter-spacing: .04em; text-transform: uppercase; color: #e6eaf2; }
.pool-x { font-size: 11.5px; color: var(--text-faint); }
.pool-x:hover { color: var(--text); }
.pool-sub { font-size: 12px; color: var(--text-dim); line-height: 1.5; margin: 0; }
.pool-sub b { color: var(--text); }

.pool-chips { display: flex; flex-wrap: wrap; gap: 6px; }
.pool-chip {
  display: inline-flex; align-items: center; gap: 7px; font-size: 11.5px; font-weight: 600;
  padding: 5px 10px; border-radius: 999px; background: var(--panel-2);
  border: 1px solid var(--border); color: var(--text); transition: .12s;
}
.pool-chip:hover { border-color: #f87171; }
.pool-chip i { width: 8px; height: 8px; border-radius: 50%; }
.pool-chip .x { color: var(--text-faint); font-size: 10px; }
.pool-chip:hover .x { color: #f87171; }

.pool-h3 { font-size: 13px; margin: 2px 0 0; display: flex; align-items: baseline; gap: 8px; }
.pool-h3 small { font-size: 10px; font-weight: 500; color: var(--text-faint); }
.pool-list { display: flex; flex-direction: column; }
.pool-item { display: flex; align-items: center; gap: 10px; padding: 7px 8px; border-radius: 9px; transition: .12s; }
.pool-item:hover { background: var(--panel-2); }
.pool-item i { width: 26px; height: 26px; border-radius: 50%; display: grid; place-items: center; font-weight: 800; font-size: 12px; color: #0a0d14; flex-shrink: 0; }
.pi-name { flex: 1; font-size: 12.5px; color: var(--text-dim); text-align: left; }
.pi-score { font-size: 12px; font-weight: 700; color: var(--text); }
.pi-add { color: var(--text-faint); font-size: 14px; }
.pool-item:hover .pi-add { color: var(--accent); }
.pool-empty { font-size: 12.5px; color: var(--text-dim); }
</style>
