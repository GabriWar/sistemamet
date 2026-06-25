// MeT — Mapa de Engajamento Transmídia
// Modelo de dados: cada obra tem ATRIBUTOS em 4 dimensões.
// A similaridade entre duas obras é calculada a partir da sobreposição
// desses atributos, ponderada por dimensão. Tudo é explicável: o grafo
// mostra O QUE duas obras compartilham e QUANTO isso pesa.

import { CATALOG } from './catalog.js'

export const TYPES = {
  filme: { label: 'Filme', color: '#ef4444', glow: 'rgba(239,68,68,.45)' },
  serie: { label: 'Série', color: '#eab308', glow: 'rgba(234,179,8,.45)' },
  livro: { label: 'Livro', color: '#22c55e', glow: 'rgba(34,197,94,.45)' },
  anime: { label: 'Anime / Desenho', color: '#3b82f6', glow: 'rgba(59,130,246,.45)' },
}

// Peso de cada dimensão na nota final de similaridade (soma = 1).
export const DIMENSIONS = [
  { key: 'generos', label: 'Gêneros', peso: 0.30, color: '#f472b6' },
  { key: 'temas', label: 'Temas', peso: 0.30, color: '#a855f7' },
  { key: 'tom', label: 'Tom', peso: 0.20, color: '#38bdf8' },
  { key: 'ambientacao', label: 'Ambientação', peso: 0.20, color: '#34d399' },
]
export const DIM_BY_KEY = Object.fromEntries(DIMENSIONS.map((d) => [d.key, d]))

// O acervo vem do catálogo (≈200 obras). id, title, type, year, extra,
// rating, ratingMax, desc, attrs{ generos, temas, tom, ambientacao }.
export const WORKS = CATALOG
export const WORKS_BY_ID = Object.fromEntries(WORKS.map((w) => [w.id, w]))

// ---- Cálculo de similaridade (explicável) ----------------------------------

// Coeficiente de sobreposição: |A ∩ B| / min(|A|,|B|). Vai a 1 quando um
// conjunto contém o outro — gera notas altas e fáceis de explicar
// ("3 de 3 temas em comum").
function overlap(a = [], b = []) {
  const set = new Set(b)
  const shared = a.filter((x) => set.has(x))
  const denom = Math.min(a.length, b.length) || 1
  return { score: shared.length / denom, shared }
}

// Retorna { score, breakdown[] } para um par de obras.
export function similarity(a, b) {
  let total = 0
  const breakdown = DIMENSIONS.map((dim) => {
    const { score, shared } = overlap(a.attrs[dim.key], b.attrs[dim.key])
    total += score * dim.peso
    return { ...dim, score, shared }
  })
  return { score: total, breakdown }
}

export const THRESHOLD = 0.45

// Top-N obras mais similares a uma dada, com o detalhamento.
export function relatedTo(id, n = 8) {
  const base = WORKS_BY_ID[id]
  if (!base) return []
  return WORKS.filter((w) => w.id !== id)
    .map((w) => ({ work: w, ...similarity(base, w) }))
    .sort((a, b) => b.score - a.score)
    .slice(0, n)
}

// ---- Subgrafo "ego": só o que está visível ---------------------------------
// Com ~290 obras não dá para mostrar tudo de uma vez. O grafo visível é montado
// a partir de um conjunto de obras "abertas": cada obra aberta traz seus K
// vizinhos mais similares, e desenhamos as arestas entre todos os nós visíveis.

// Arestas (com detalhamento) entre um conjunto de obras.
export function linksAmong(ids, threshold = THRESHOLD) {
  const list = ids.map((id) => WORKS_BY_ID[id]).filter(Boolean)
  const links = []
  for (let i = 0; i < list.length; i++) {
    for (let j = i + 1; j < list.length; j++) {
      const { score, breakdown } = similarity(list[i], list[j])
      if (score >= threshold) {
        links.push({ source: list[i].id, target: list[j].id, score, breakdown })
      }
    }
  }
  return links
}

// Ids dos K vizinhos mais similares de uma obra (respeitando tipos ocultos).
export function neighborsOf(id, perNode = 7, exclude = new Set()) {
  return relatedTo(id, perNode + 12)
    .filter((r) => !exclude.has(r.work.type))
    .slice(0, perNode)
    .map((r) => r.work.id)
}

// Subgrafo: obras abertas + seus vizinhos, com as arestas entre todos.
export function egoGraph(openIds, { perNode = 7, exclude = new Set() } = {}) {
  const ids = new Set()
  for (const id of openIds) {
    if (!WORKS_BY_ID[id] || exclude.has(WORKS_BY_ID[id].type)) continue
    ids.add(id)
    for (const nid of neighborsOf(id, perNode, exclude)) ids.add(nid)
  }
  const arr = [...ids]
  return { nodes: arr.map((id) => WORKS_BY_ID[id]).filter(Boolean), links: linksAmong(arr) }
}

// Subgrafo só com as obras dadas (sem puxar vizinhos) — estado inicial.
export function fixedGraph(ids, exclude = new Set()) {
  const arr = ids.filter((id) => WORKS_BY_ID[id] && !exclude.has(WORKS_BY_ID[id].type))
  return { nodes: arr.map((id) => WORKS_BY_ID[id]), links: linksAmong(arr) }
}

// ---- Grafo de CONCEITOS (keywords) -----------------------------------------
// Aqui os nós são as próprias palavras-chave (gêneros, temas, tom, ambientação)
// e as arestas são a CO-OCORRÊNCIA: quantas obras têm os dois conceitos juntos.
// Mostra o "DNA" do acervo — quais ideias andam coladas.

export function keywordGraph({ minCount = 5, minCooc = 8, topPerNode = 3 } = {}) {
  const count = {}
  const dim = {}
  const cooc = {}
  for (const w of WORKS) {
    const tags = []
    for (const d of DIMENSIONS) {
      for (const t of w.attrs[d.key] || []) {
        count[t] = (count[t] || 0) + 1
        if (!dim[t]) dim[t] = d.key
        tags.push(t)
      }
    }
    for (let i = 0; i < tags.length; i++) {
      for (let j = i + 1; j < tags.length; j++) {
        if (tags[i] === tags[j]) continue
        const key = tags[i] < tags[j] ? `${tags[i]}|${tags[j]}` : `${tags[j]}|${tags[i]}`
        cooc[key] = (cooc[key] || 0) + 1
      }
    }
  }
  const nodes = Object.keys(count)
    .filter((t) => count[t] >= minCount)
    .map((t) => ({ id: t, dim: dim[t], count: count[t] }))
  const present = new Set(nodes.map((n) => n.id))
  const all = []
  for (const [key, v] of Object.entries(cooc)) {
    if (v < minCooc) continue
    const [a, b] = key.split('|')
    if (present.has(a) && present.has(b)) all.push({ source: a, target: b, weight: v })
  }
  // poda: cada conceito guarda só suas K co-ocorrências mais fortes (anti-novelo)
  const byNode = {}
  for (const l of all) {
    ;(byNode[l.source] ||= []).push(l)
    ;(byNode[l.target] ||= []).push(l)
  }
  const keep = new Set()
  for (const n in byNode) {
    byNode[n].sort((a, b) => b.weight - a.weight).slice(0, topPerNode).forEach((l) => keep.add(l))
  }
  return { nodes, links: [...keep] }
}

// Obras que contêm um dado conceito (keyword), com a dimensão onde ele aparece.
export function worksWithTag(tag) {
  return WORKS.filter((w) => DIMENSIONS.some((d) => (w.attrs[d.key] || []).includes(tag)))
}

// Obras "semente" para o estado inicial do grafo: as mais bem avaliadas,
// variando os tipos para dar uma amostra de cada mídia.
export function seedWorks(n = 12) {
  return [...WORKS]
    .sort((a, b) => b.rating / b.ratingMax - a.rating / a.ratingMax)
    .slice(0, n)
    .map((w) => w.id)
}

// Estatística leve: quantas conexões existem acima do limiar (amostra real).
export function totalConnections() {
  let c = 0
  for (let i = 0; i < WORKS.length; i++) {
    for (let j = i + 1; j < WORKS.length; j++) {
      if (similarity(WORKS[i], WORKS[j]).score >= THRESHOLD) c++
    }
  }
  return c
}
