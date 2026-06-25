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

// Top-N obras MENOS similares (as mais distantes/opostas).
export function leastRelated(id, n = 8) {
  const base = WORKS_BY_ID[id]
  if (!base) return []
  return WORKS.filter((w) => w.id !== id)
    .map((w) => ({ work: w, ...similarity(base, w) }))
    .sort((a, b) => a.score - b.score)
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

// ---- Pool: obras mais parecidas com um CONJUNTO de obras --------------------
// Similaridade de uma obra com a pool = média da similaridade com cada membro.

export function poolRanking(poolIds, n = 12) {
  const pool = poolIds.filter((id) => WORKS_BY_ID[id])
  if (!pool.length) return []
  const set = new Set(pool)
  return WORKS.filter((w) => !set.has(w.id))
    .map((w) => ({
      work: w,
      score: pool.reduce((s, id) => s + similarity(w, WORKS_BY_ID[id]).score, 0) / pool.length,
    }))
    .filter((r) => r.score > 0)
    .sort((a, b) => b.score - a.score)
    .slice(0, n)
}

// Grafo da pool: membros + as top-N mais parecidas com a pool, e as arestas.
export function poolGraph(poolIds, n = 10, exclude = new Set()) {
  const top = poolRanking(poolIds, n + 6)
    .filter((r) => !exclude.has(r.work.type))
    .slice(0, n)
    .map((r) => r.work.id)
  const ids = [...new Set([...poolIds, ...top])].filter((id) => WORKS_BY_ID[id] && !exclude.has(WORKS_BY_ID[id].type))
  return { nodes: ids.map((id) => WORKS_BY_ID[id]), links: linksAmong(ids) }
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

// ---- Caminho entre duas obras ----------------------------------------------
// Constrói a vizinhança completa (arestas >= limiar) uma vez e acha o caminho
// mais "forte" entre A e B (Dijkstra com custo = 1 - similaridade). Responde
// "o que une essas duas obras": a corrente de obras-ponte e o que cada elo
// compartilha. Ex.: Batman → Coringa → Taxi Driver.

let _adj = null
function adjacency() {
  if (_adj) return _adj
  _adj = new Map(WORKS.map((w) => [w.id, []]))
  for (let i = 0; i < WORKS.length; i++) {
    for (let j = i + 1; j < WORKS.length; j++) {
      const { score } = similarity(WORKS[i], WORKS[j])
      if (score >= THRESHOLD) {
        _adj.get(WORKS[i].id).push({ id: WORKS[j].id, score })
        _adj.get(WORKS[j].id).push({ id: WORKS[i].id, score })
      }
    }
  }
  return _adj
}

// Custo de uma aresta: ~1 por salto (favorece menos saltos), com um empurrãozinho
// para elos mais fortes desempatarem caminhos de mesmo tamanho.
const edgeCost = (score) => 1 + (1 - score) * 0.01

// Dijkstra com nós/arestas removidos (usado pelo Yen para achar K caminhos).
function dijkstra(src, dst, remEdges = new Set(), remNodes = new Set()) {
  if (remNodes.has(src)) return null
  const adj = adjacency()
  const dist = new Map()
  const prev = new Map()
  const done = new Set()
  for (const id of adj.keys()) if (!remNodes.has(id)) dist.set(id, Infinity)
  dist.set(src, 0)
  while (true) {
    let u = null
    let best = Infinity
    for (const [id, d] of dist) if (!done.has(id) && d < best) { best = d; u = id }
    if (u === null || u === dst) break
    done.add(u)
    for (const { id: v, score } of adj.get(u)) {
      if (remNodes.has(v) || done.has(v) || remEdges.has(`${u}|${v}`)) continue
      const nd = dist.get(u) + edgeCost(score)
      if (nd < (dist.get(v) ?? Infinity)) { dist.set(v, nd); prev.set(v, u) }
    }
  }
  if (!dist.has(dst) || dist.get(dst) === Infinity) return null
  const path = [dst]
  let cur = dst
  while (cur !== src) { cur = prev.get(cur); if (cur == null) return null; path.unshift(cur) }
  return { path, cost: dist.get(dst) }
}

const sameArr = (a, b) => a.length === b.length && a.every((x, i) => x === b[i])
function pathCost(path) {
  let c = 0
  for (let i = 0; i < path.length - 1; i++) c += edgeCost(similarity(WORKS_BY_ID[path[i]], WORKS_BY_ID[path[i + 1]]).score)
  return c
}

// Yen — K caminhos sem repetição de nó, do mais barato ao mais caro.
function kShortest(aId, bId, K = 18) {
  const first = dijkstra(aId, bId)
  if (!first) return []
  const A = [first]
  const B = []
  for (let k = 1; k < K; k++) {
    const prev = A[k - 1].path
    for (let i = 0; i < prev.length - 1; i++) {
      const spur = prev[i]
      const root = prev.slice(0, i + 1)
      const remE = new Set()
      for (const p of A) {
        if (p.path.length > i && sameArr(p.path.slice(0, i + 1), root)) {
          remE.add(`${p.path[i]}|${p.path[i + 1]}`)
          remE.add(`${p.path[i + 1]}|${p.path[i]}`)
        }
      }
      const remN = new Set(root.slice(0, -1))
      const sp = dijkstra(spur, bId, remE, remN)
      if (!sp) continue
      const total = root.slice(0, -1).concat(sp.path)
      if (A.some((c) => sameArr(c.path, total)) || B.some((c) => sameArr(c.path, total))) continue
      B.push({ path: total, cost: pathCost(total) })
    }
    if (!B.length) break
    B.sort((x, y) => x.cost - y.cost)
    A.push(B.shift())
  }
  return A
}

function hopsOf(path) {
  const hops = []
  for (let i = 0; i < path.length - 1; i++) {
    const s = similarity(WORKS_BY_ID[path[i]], WORKS_BY_ID[path[i + 1]])
    hops.push({ from: path[i], to: path[i + 1], score: s.score, breakdown: s.breakdown })
  }
  return hops
}

// Três rotas entre duas obras: a mais curta, a média e a mais longa (por saltos).
export function pathsBetween(aId, bId) {
  if (!WORKS_BY_ID[aId] || !WORKS_BY_ID[bId] || aId === bId) return null
  const cands = kShortest(aId, bId, 18)
  if (!cands.length) return null
  const byLen = new Map() // menor custo por comprimento
  for (const c of cands) if (!byLen.has(c.path.length)) byLen.set(c.path.length, c)
  const lens = [...byLen.keys()].sort((x, y) => x - y)
  const chosen = []
  chosen.push({ key: 'curto', label: 'mais curto', path: byLen.get(lens[0]).path })
  if (lens.length > 2) {
    const mid = lens[Math.floor((lens.length - 1) / 2)]
    chosen.push({ key: 'medio', label: 'médio', path: byLen.get(mid).path })
  }
  if (lens.length > 1) {
    chosen.push({ key: 'longo', label: 'mais longo', path: byLen.get(lens[lens.length - 1]).path })
  }
  return chosen.map((c) => ({ ...c, hops: hopsOf(c.path), length: c.path.length - 1 }))
}

// Grafo da UNIÃO de várias rotas: nós e arestas-elo, marcando a quais rotas
// cada aresta pertence (para colorir/destacar por rota).
export function pathSetsGraph(pathSets) {
  const ids = new Set()
  const edges = new Map()
  pathSets.forEach((path, pi) => {
    path.forEach((id) => ids.add(id))
    for (let i = 0; i < path.length - 1; i++) {
      const a = path[i]
      const b = path[i + 1]
      const key = a < b ? `${a}|${b}` : `${b}|${a}`
      if (!edges.has(key)) {
        const s = similarity(WORKS_BY_ID[a], WORKS_BY_ID[b])
        edges.set(key, { source: a, target: b, score: s.score, breakdown: s.breakdown, paths: new Set() })
      }
      edges.get(key).paths.add(pi)
    }
  })
  return {
    nodes: [...ids].map((id) => WORKS_BY_ID[id]),
    links: [...edges.values()].map((e) => ({ ...e, paths: [...e.paths] })),
  }
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
