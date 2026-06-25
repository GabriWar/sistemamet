<script setup>
import { computed } from 'vue'
import { TYPES, relatedTo } from '../data/works.js'

const props = defineProps({
  work: { type: Object, required: true },
  isFav: { type: Boolean, default: false },
  inList: { type: Boolean, default: false },
})
defineEmits(['select-node', 'select-link', 'toggle-fav', 'toggle-list'])

const type = computed(() => TYPES[props.work.type])
const related = computed(() => relatedTo(props.work.id, 8))

// agrupa relacionadas por tipo (como os "similares" do print)
const grouped = computed(() => {
  const g = {}
  for (const r of related.value) {
    ;(g[r.work.type] ||= []).push(r)
  }
  return g
})

function fakeLink(r) {
  // monta um objeto link p/ abrir o WhyPanel
  return { source: props.work.id, target: r.work.id, score: r.score, breakdown: r.breakdown }
}
</script>

<template>
  <div class="detail">
    <div class="poster" :style="{ background: type.color + '1a', borderColor: type.color + '55' }">
      <span class="poster-letter" :style="{ color: type.color }">{{ work.title.charAt(0) }}</span>
    </div>

    <h2 class="title">{{ work.title }}</h2>
    <div class="meta">
      <span class="chip" :style="{ color: type.color, borderColor: type.color + '66' }">{{ type.label }}</span>
      <span class="dot">{{ work.year }}</span>
      <span class="dot">{{ work.extra }}</span>
    </div>
    <div class="rating">★ {{ work.rating }} <small>/ {{ work.ratingMax }}</small></div>

    <div class="actions">
      <button :class="{ on: isFav }" @click="$emit('toggle-fav', work.id)">
        {{ isFav ? '♥ Favoritada' : '♡ Favoritar' }}
      </button>
      <button :class="{ on: inList }" @click="$emit('toggle-list', work.id)">
        {{ inList ? '✓ Na lista' : '+ Minha Lista' }}
      </button>
    </div>

    <p class="desc">{{ work.desc }}</p>

    <div class="attrs">
      <div v-for="(vals, k) in work.attrs" :key="k" class="attr-row">
        <span class="attr-key">{{ k }}</span>
        <div class="attr-vals">
          <span v-for="v in vals" :key="v" class="chip">{{ v }}</span>
        </div>
      </div>
    </div>

    <div class="related">
      <h3>Obras relacionadas <small>clique p/ ver o porquê</small></h3>
      <div v-for="(items, t) in grouped" :key="t" class="rel-group">
        <span class="rel-cat" :style="{ color: TYPES[t].color }">{{ TYPES[t].label }}</span>
        <button
          v-for="r in items" :key="r.work.id" class="rel-item"
          @click="$emit('select-link', fakeLink(r))"
        >
          <i :style="{ background: TYPES[r.work.type].color }">{{ r.work.title.charAt(0) }}</i>
          <span class="rel-name">{{ r.work.title }}</span>
          <span class="rel-score">{{ Math.round(r.score * 100) }}%</span>
        </button>
      </div>
    </div>
  </div>
</template>

<style scoped>
.detail { display: flex; flex-direction: column; gap: 12px; }
.poster {
  height: 150px; border-radius: 14px; border: 1px solid; display: grid; place-items: center;
}
.poster-letter { font-size: 64px; font-weight: 800; opacity: .85; }
.title { font-size: 20px; margin: 2px 0 0; line-height: 1.2; }
.meta { display: flex; flex-wrap: wrap; align-items: center; gap: 8px; }
.dot { font-size: 12px; color: var(--text-dim); }
.dot + .dot::before { content: '·'; margin-right: 8px; color: var(--text-faint); }
.rating { font-size: 15px; font-weight: 700; color: #f5c518; }
.rating small { color: var(--text-faint); font-weight: 500; }
.actions { display: flex; gap: 8px; }
.actions button {
  flex: 1; padding: 9px 10px; border-radius: 9px; font-size: 12px; font-weight: 600;
  background: var(--panel-2); border: 1px solid var(--border); color: var(--text-dim); transition: .12s;
}
.actions button:hover { color: var(--text); border-color: var(--accent); }
.actions button.on { color: var(--text); border-color: var(--accent); background: var(--panel); }
.desc { font-size: 12.5px; color: var(--text-dim); line-height: 1.55; margin: 0; }

.attrs { display: flex; flex-direction: column; gap: 8px; padding: 12px 0; border-top: 1px solid var(--border); border-bottom: 1px solid var(--border); }
.attr-row { display: grid; grid-template-columns: 92px 1fr; gap: 8px; align-items: start; }
.attr-key { font-size: 10.5px; text-transform: uppercase; letter-spacing: .04em; color: var(--text-faint); padding-top: 4px; }
.attr-vals { display: flex; flex-wrap: wrap; gap: 5px; }

.related h3 { font-size: 13px; margin: 4px 0 10px; display: flex; align-items: baseline; gap: 8px; }
.related h3 small { font-size: 10px; font-weight: 500; color: var(--text-faint); }
.rel-group { margin-bottom: 12px; }
.rel-cat { font-size: 10.5px; font-weight: 700; text-transform: uppercase; letter-spacing: .04em; display: block; margin-bottom: 6px; }
.rel-item {
  width: 100%; display: flex; align-items: center; gap: 10px; padding: 7px 8px; border-radius: 9px;
  transition: .12s;
}
.rel-item:hover { background: var(--panel-2); }
.rel-item i { width: 26px; height: 26px; border-radius: 50%; display: grid; place-items: center; font-weight: 800; font-size: 12px; color: #0a0d14; flex-shrink: 0; }
.rel-name { font-size: 12.5px; color: var(--text-dim); text-align: left; flex: 1; }
.rel-score { font-size: 12px; font-weight: 700; color: var(--text); }
</style>
