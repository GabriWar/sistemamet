<script setup>
import { TYPES } from '../data/works.js'

defineProps({
  hidden: { type: Object, required: true }, // Set de tipos ocultos
  view: { type: String, required: true },
  counts: { type: Object, default: () => ({}) },
})
defineEmits(['toggle-type', 'navigate'])

const nav = [
  { icon: '⌂', label: 'Início', key: 'inicio' },
  { icon: '⊞', label: 'Explorar', key: 'explorar' },
  { icon: '⌕', label: 'Buscar', key: 'buscar' },
  { icon: '☰', label: 'Minha Lista', key: 'lista', badge: 'lista' },
  { icon: '✦', label: 'Recomendações', key: 'recomendacoes' },
  { icon: '♥', label: 'Favoritos', key: 'favoritos', badge: 'favoritos' },
  { icon: '↺', label: 'Histórico', key: 'historico', badge: 'historico' },
]
</script>

<template>
  <aside class="sidebar">
    <div class="brand">
      <div class="brand-mark">M<span>e</span>T</div>
      <div class="brand-sub">Mapa de Engajamento<br />Transmídia</div>
    </div>

    <nav class="nav">
      <button
        v-for="n in nav" :key="n.key" class="nav-item"
        :class="{ active: view === n.key }"
        @click="$emit('navigate', n.key)"
      >
        <span class="nav-icon">{{ n.icon }}</span>{{ n.label }}
        <span v-if="n.badge && counts[n.badge]" class="nav-badge">{{ counts[n.badge] }}</span>
      </button>
    </nav>

    <div class="cats">
      <div class="cats-title">Categorias <small>filtrar grafo</small></div>
      <button
        v-for="(t, k) in TYPES" :key="k" class="cat"
        :class="{ off: hidden.has(k) }"
        @click="$emit('toggle-type', k)"
      >
        <i :style="{ background: t.color }"></i>{{ t.label }}
      </button>
    </div>

  </aside>
</template>

<style scoped>
.sidebar {
  width: 232px; flex-shrink: 0; height: 100%; padding: 20px 16px;
  display: flex; flex-direction: column; gap: 22px;
  background: var(--bg-2); border-right: 1px solid var(--border);
}
.brand { display: flex; align-items: center; gap: 12px; padding: 0 6px; }
.brand-mark {
  font-size: 26px; font-weight: 800; letter-spacing: -1px; color: var(--text);
}
.brand-mark span { color: #f5c518; }
.brand-sub { font-size: 9.5px; color: var(--text-faint); line-height: 1.35; letter-spacing: .03em; }

.nav { display: flex; flex-direction: column; gap: 2px; }
.nav-item {
  display: flex; align-items: center; gap: 12px; padding: 9px 12px; border-radius: 9px;
  font-size: 13.5px; color: var(--text-dim); transition: .12s; text-align: left;
}
.nav-item:hover { background: var(--panel); color: var(--text); }
.nav-item.active { background: var(--panel-2); color: var(--text); }
.nav-icon { width: 18px; text-align: center; opacity: .8; }
.nav-badge {
  margin-left: auto; min-width: 20px; height: 18px; padding: 0 6px; border-radius: 9px;
  background: var(--accent); color: #0a0d14; font-size: 10.5px; font-weight: 700;
  display: inline-grid; place-items: center;
}

.cats { display: flex; flex-direction: column; gap: 3px; }
.cats-title { font-size: 10.5px; text-transform: uppercase; letter-spacing: .06em; color: var(--text-faint); padding: 0 12px 6px; display: flex; gap: 6px; align-items: baseline; }
.cats-title small { font-size: 9px; text-transform: none; letter-spacing: 0; opacity: .7; }
.cat {
  display: flex; align-items: center; gap: 10px; padding: 7px 12px; border-radius: 8px;
  font-size: 12.5px; color: var(--text-dim); transition: .12s; text-align: left;
}
.cat:hover { background: var(--panel); }
.cat i { width: 11px; height: 11px; border-radius: 50%; transition: .15s; }
.cat.off { color: var(--text-faint); }
.cat.off i { background: var(--text-faint) !important; opacity: .4; transform: scale(.8); }
.cats { margin-bottom: 6px; }
</style>
