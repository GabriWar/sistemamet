<script setup>
import { ref, computed } from 'vue'
import { TYPES } from '../data/works.js'

const props = defineProps({
  title: { type: String, required: true },
  subtitle: { type: String, default: '' },
  works: { type: Array, required: true },
  favorites: { type: Object, required: true },
  myList: { type: Object, required: true },
  filterable: { type: Boolean, default: false },
  emptyTitle: { type: String, default: 'Nada por aqui ainda' },
  emptyText: { type: String, default: '' },
  showClear: { type: Boolean, default: false },
})
defineEmits(['open', 'toggle-fav', 'toggle-list', 'clear'])

const activeType = ref('todos')
const shown = computed(() => {
  if (!props.filterable || activeType.value === 'todos') return props.works
  return props.works.filter((w) => w.type === activeType.value)
})
</script>

<template>
  <div class="coll">
    <header class="coll-head">
      <div>
        <h1>{{ title }}</h1>
        <p v-if="subtitle">{{ subtitle }}</p>
      </div>
      <button v-if="showClear && works.length" class="clear-btn" @click="$emit('clear')">Limpar</button>
    </header>

    <div v-if="filterable" class="filters">
      <button :class="{ on: activeType === 'todos' }" @click="activeType = 'todos'">Todos</button>
      <button
        v-for="(t, k) in TYPES" :key="k"
        :class="{ on: activeType === k }" @click="activeType = k"
      >
        <i :style="{ background: t.color }"></i>{{ t.label }}
      </button>
    </div>

    <div v-if="shown.length" class="grid">
      <div v-for="w in shown" :key="w.id" class="card" @click="$emit('open', w.id)">
        <div class="card-poster" :style="{ background: TYPES[w.type].color + '1a', borderColor: TYPES[w.type].color + '40' }">
          <span :style="{ color: TYPES[w.type].color }">{{ w.title.charAt(0) }}</span>
          <div class="card-actions" @click.stop>
            <button :class="{ on: favorites.has(w.id) }" title="Favoritar" @click="$emit('toggle-fav', w.id)">♥</button>
            <button :class="{ on: myList.has(w.id) }" title="Minha Lista" @click="$emit('toggle-list', w.id)">{{ myList.has(w.id) ? '✓' : '+' }}</button>
          </div>
        </div>
        <div class="card-body">
          <strong class="card-title">{{ w.title }}</strong>
          <div class="card-meta">
            <span class="chip" :style="{ color: TYPES[w.type].color, borderColor: TYPES[w.type].color + '55' }">{{ TYPES[w.type].label }}</span>
            <span class="card-rating">★ {{ w.rating }}</span>
          </div>
        </div>
      </div>
    </div>

    <div v-else class="empty">
      <div class="empty-icon">∅</div>
      <strong>{{ emptyTitle }}</strong>
      <p v-if="emptyText">{{ emptyText }}</p>
    </div>
  </div>
</template>

<style scoped>
.coll { height: 100%; overflow-y: auto; padding: 24px 28px 32px; }
.coll-head { display: flex; align-items: flex-start; justify-content: space-between; margin-bottom: 18px; }
.coll-head h1 { font-size: 22px; margin: 0; }
.coll-head p { font-size: 13px; color: var(--text-dim); margin: 6px 0 0; max-width: 560px; line-height: 1.5; }
.clear-btn { font-size: 12px; color: var(--text-dim); padding: 7px 13px; border: 1px solid var(--border); border-radius: 9px; }
.clear-btn:hover { color: var(--text); border-color: var(--accent); }

.filters { display: flex; flex-wrap: wrap; gap: 8px; margin-bottom: 20px; }
.filters button {
  display: inline-flex; align-items: center; gap: 7px; font-size: 12.5px; color: var(--text-dim);
  padding: 7px 13px; border: 1px solid var(--border); border-radius: 999px; transition: .12s;
}
.filters button:hover { color: var(--text); }
.filters button.on { background: var(--panel-2); color: var(--text); border-color: var(--accent); }
.filters button i { width: 9px; height: 9px; border-radius: 50%; }

.grid { display: grid; grid-template-columns: repeat(auto-fill, minmax(168px, 1fr)); gap: 16px; }
.card { background: var(--panel); border: 1px solid var(--border); border-radius: 14px; overflow: hidden; cursor: pointer; transition: .15s; }
.card:hover { border-color: var(--accent); transform: translateY(-2px); }
.card-poster { position: relative; height: 116px; display: grid; place-items: center; border-bottom: 1px solid; }
.card-poster > span { font-size: 46px; font-weight: 800; opacity: .9; }
.card-actions { position: absolute; top: 8px; right: 8px; display: flex; gap: 6px; }
.card-actions button {
  width: 28px; height: 28px; border-radius: 8px; background: rgba(10,13,20,.7); border: 1px solid var(--border);
  color: var(--text-dim); font-size: 13px; display: grid; place-items: center; transition: .12s; backdrop-filter: blur(4px);
}
.card-actions button:hover { color: var(--text); border-color: var(--accent); }
.card-actions button.on { color: #ff5d7a; border-color: #ff5d7a55; }
.card-actions button.on:last-child { color: #6ee7a8; border-color: #6ee7a855; }
.card-body { padding: 12px 13px 14px; }
.card-title { font-size: 13px; line-height: 1.3; display: block; }
.card-meta { display: flex; align-items: center; justify-content: space-between; margin-top: 9px; }
.card-rating { font-size: 12px; font-weight: 700; color: #f5c518; }

.empty { height: 60%; display: flex; flex-direction: column; align-items: center; justify-content: center; gap: 10px; text-align: center; color: var(--text-dim); }
.empty-icon { font-size: 40px; color: var(--text-faint); }
.empty strong { font-size: 15px; color: var(--text); }
.empty p { font-size: 12.5px; max-width: 320px; line-height: 1.5; margin: 0; }
</style>
