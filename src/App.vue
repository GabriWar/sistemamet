<script setup>
import { ref, computed, watch } from 'vue'
import { WORKS, WORKS_BY_ID, relatedTo, totalConnections, worksWithTag, DIM_BY_KEY, TYPES, pathsBetween, poolRanking } from './data/works.js'
import Sidebar from './components/Sidebar.vue'
import GraphView from './components/GraphView.vue'
import KeywordGraph from './components/KeywordGraph.vue'
import WorkDetail from './components/WorkDetail.vue'
import WhyPanel from './components/WhyPanel.vue'
import PathPanel from './components/PathPanel.vue'
import PoolPanel from './components/PoolPanel.vue'
import CollectionView from './components/CollectionView.vue'

// cor por papel da rota: verde=curto, amarelo=médio, vermelho=longo
const PATH_COLOR = { curto: '#4ade80', medio: '#facc15', longo: '#f87171' }

const totalWorks = WORKS.length
const totalConns = totalConnections()
const view = ref('buscar')
const graphMode = ref('obras') // 'obras' | 'conceitos'
const selectedTag = ref(null)
const selectedId = ref(null)
const selectedLink = ref(null)
const pathResult = ref(null) // [{key,label,path,hops,length}] | [] (sem caminho) | null
const pathEnds = ref(null)
const activePath = ref(null)

const pathSets = computed(() => (pathResult.value?.length ? pathResult.value.map((p) => p.path) : null))
const pathColors = computed(() => (pathResult.value?.length ? pathResult.value.map((p) => PATH_COLOR[p.key]) : []))

// pool (botão direito) — obras parecidas com o conjunto
const pool = ref([])
const poolRank = computed(() => poolRanking(pool.value, 14))
function togglePool(id) {
  pool.value = pool.value.includes(id) ? pool.value.filter((x) => x !== id) : [...pool.value, id]
}
const hoverLinkKey = ref(null)
const hidden = ref(new Set())

// ---- estado persistido (favoritos / lista / histórico) ---------------------
const saved = JSON.parse(localStorage.getItem('met-state') || '{}')
// descarta ids que não existem mais no catálogo (estado antigo) — auto-corrige
const onlyValid = (arr) => (arr || []).filter((id) => WORKS_BY_ID[id])
const favorites = ref(new Set(onlyValid(saved.favorites)))
const myList = ref(new Set(onlyValid(saved.myList)))
const history = ref(onlyValid(saved.history))

watch([favorites, myList, history], () => {
  localStorage.setItem('met-state', JSON.stringify({
    favorites: [...favorites.value],
    myList: [...myList.value],
    history: history.value,
  }))
}, { deep: true })

function toggleFav(id) {
  const next = new Set(favorites.value)
  next.has(id) ? next.delete(id) : next.add(id)
  favorites.value = next
}
function toggleList(id) {
  const next = new Set(myList.value)
  next.has(id) ? next.delete(id) : next.add(id)
  myList.value = next
}
function pushHistory(id) {
  history.value = [id, ...history.value.filter((h) => h !== id)].slice(0, 30)
}

// ---- busca -----------------------------------------------------------------
const query = ref('')
const showResults = ref(false)
const results = computed(() => {
  const q = query.value.trim().toLowerCase()
  if (!q) return []
  return WORKS.filter((w) => w.title.toLowerCase().includes(q)).slice(0, 6)
})

const selectedWork = computed(() => (selectedId.value ? WORKS_BY_ID[selectedId.value] : null))

// ---- coleções por view -----------------------------------------------------
const featured = computed(() =>
  [...WORKS].sort((a, b) => b.rating / b.ratingMax - a.rating / a.ratingMax).slice(0, 8))
const favWorks = computed(() => WORKS.filter((w) => favorites.value.has(w.id)))
const listWorks = computed(() => WORKS.filter((w) => myList.value.has(w.id)))
const historyWorks = computed(() => history.value.map((id) => WORKS_BY_ID[id]).filter(Boolean))

// recomendações: agrega obras similares às que você favoritou / salvou / viu
const recommended = computed(() => {
  const seeds = new Set([...favorites.value, ...myList.value, ...history.value.slice(0, 5)])
  if (!seeds.size) return []
  const score = {}
  for (const id of seeds) {
    for (const r of relatedTo(id, 6)) {
      if (seeds.has(r.work.id)) continue
      score[r.work.id] = (score[r.work.id] || 0) + r.score
    }
  }
  return Object.entries(score)
    .sort((a, b) => b[1] - a[1])
    .slice(0, 12)
    .map(([id]) => WORKS_BY_ID[id])
})

const counts = computed(() => ({
  favoritos: favorites.value.size,
  lista: myList.value.size,
  historico: history.value.length,
}))

// ---- ações -----------------------------------------------------------------
function selectNode(id) {
  selectedId.value = id
  selectedLink.value = null
  clearPath()
  pushHistory(id)
}
function connect(fromId, toId) {
  pathResult.value = pathsBetween(fromId, toId) || []
  pathEnds.value = { from: fromId, to: toId }
  activePath.value = null
  selectedId.value = null
  selectedLink.value = null
  graphMode.value = 'obras'
  view.value = 'buscar'
}
function clearPath() {
  pathResult.value = null
  pathEnds.value = null
  activePath.value = null
}
function selectLink(link) {
  selectedLink.value = link
}
// abrir uma obra a partir de uma coleção → leva ao grafo já focado nela
function openWork(id) {
  selectNode(id)
  view.value = 'buscar'
  graphMode.value = 'obras'
}
function pickTag(t) {
  selectedTag.value = t
}
const tagWorks = computed(() => (selectedTag.value ? worksWithTag(selectedTag.value) : []))
const tagDim = computed(() => (selectedTag.value ? DIM_BY_KEY[
  // dimensão onde a keyword aparece (pega da primeira obra que a contém)
  Object.keys(DIM_BY_KEY).find((k) => tagWorks.value[0]?.attrs[k]?.includes(selectedTag.value))
] : null))
function pickResult(w) {
  openWork(w.id)
  query.value = ''
  showResults.value = false
}
function toggleType(k) {
  const next = new Set(hidden.value)
  next.has(k) ? next.delete(k) : next.add(k)
  hidden.value = next
}
function navigate(v) {
  view.value = v
  showResults.value = false
}
</script>

<template>
  <div class="app">
    <Sidebar
      :hidden="hidden" :view="view" :counts="counts"
      @toggle-type="toggleType" @navigate="navigate"
    />

    <main class="main">
      <header class="topbar">
        <div class="search">
          <span class="search-icon">⌕</span>
          <input
            v-model="query"
            placeholder="Buscar uma obra…"
            @focus="showResults = true"
            @input="showResults = true"
            @keydown.enter="results[0] && pickResult(results[0])"
          />
          <div v-if="showResults && results.length" class="results">
            <button v-for="w in results" :key="w.id" class="result" @click="pickResult(w)">
              <span class="r-name">{{ w.title }}</span>
              <span class="r-type">{{ w.type }}</span>
            </button>
          </div>
        </div>
        <div v-if="view === 'buscar'" class="gmode">
          <button :class="{ on: graphMode === 'obras' }" @click="graphMode = 'obras'">Obras</button>
          <button :class="{ on: graphMode === 'conceitos' }" @click="graphMode = 'conceitos'">Conceitos</button>
        </div>

        <div class="topbar-title">
          <strong>{{ graphMode === 'conceitos' ? 'Grafo de Conceitos' : 'Grafo de Relações Transmídia' }}</strong>
          <span>{{ totalWorks }} obras · {{ totalConns }} conexões</span>
        </div>
      </header>

      <!-- VIEW: BUSCAR (grafo) -->
      <div v-if="view === 'buscar'" class="workspace">
        <section class="graph-col">
          <GraphView
            v-if="graphMode === 'obras'"
            :selected-id="selectedId"
            :hover-link-key="hoverLinkKey"
            :hidden="hidden"
            :path-sets="pathSets"
            :path-colors="pathColors"
            :active-path="activePath"
            :pool-ids="pool"
            @select-node="selectNode"
            @select-link="selectLink"
            @hover-link="hoverLinkKey = $event"
            @toggle-pool="togglePool"
            @recenter="selectedId = null; selectedLink = null; clearPath()"
          />
          <KeywordGraph
            v-else
            :selected-tag="selectedTag"
            @pick="pickTag"
          />
        </section>

        <aside class="panel">
          <!-- modo conceitos: obras que têm a keyword clicada -->
          <template v-if="graphMode === 'conceitos'">
            <div v-if="selectedTag" class="tagp">
              <div class="tagp-head">
                <span class="chip" :style="{ color: tagDim?.color, borderColor: (tagDim?.color || '#888') + '66' }">{{ tagDim?.label }}</span>
                <button class="why-x" @click="pickTag(null)">✕</button>
              </div>
              <h2 class="tagp-title">{{ selectedTag }}</h2>
              <p class="tagp-sub">{{ tagWorks.length }} obras têm esse conceito. Clique para abrir no grafo de relações.</p>
              <button v-for="w in tagWorks" :key="w.id" class="tagp-item" @click="openWork(w.id)">
                <i :style="{ background: TYPES[w.type].color }">{{ w.title.charAt(0) }}</i>
                <span class="tagp-name">{{ w.title }}</span>
                <span class="tagp-rt">★ {{ w.rating }}</span>
              </button>
            </div>
            <div v-else class="intro">
              <div class="intro-badge">◆</div>
              <h2>Grafo de Conceitos</h2>
              <p>Aqui os <b>nós são as palavras-chave</b> — gêneros, temas, tom e ambientação. As arestas mostram <b>co-ocorrência</b>: dois conceitos se ligam quando aparecem juntos em muitas obras.</p>
              <p>O tamanho do nó = frequência no acervo. As cores separam as quatro dimensões. É o <b>DNA</b> do catálogo.</p>
              <ol class="steps">
                <li><span class="step-n">1</span><span class="step-t">Clique num <b>conceito</b> para destacar com o que ele anda colado.</span></li>
                <li><span class="step-n">2</span><span class="step-t">Veja ao lado as <b>obras</b> que carregam aquele conceito.</span></li>
                <li><span class="step-n">3</span><span class="step-t">Abra uma obra para pular ao grafo de <b>relações</b>.</span></li>
              </ol>
            </div>
          </template>

          <!-- modo obras: caminho entre duas obras -->
          <PathPanel
            v-else-if="pathResult"
            :paths="pathResult"
            :colors="pathColors"
            :ends="pathEnds"
            :active-path="activePath"
            @set-active="activePath = $event"
            @select-node="selectNode"
            @close="clearPath"
          />
          <PoolPanel
            v-else-if="pool.length"
            :pool="pool"
            :ranking="poolRank"
            @remove="togglePool"
            @add="togglePool"
            @clear="pool = []"
          />
          <WhyPanel
            v-else-if="selectedLink"
            :link="selectedLink"
            @select-node="selectNode"
            @close="selectedLink = null"
          />
          <WorkDetail
            v-else-if="selectedWork"
            :work="selectedWork"
            :is-fav="favorites.has(selectedWork.id)"
            :in-list="myList.has(selectedWork.id)"
            @select-node="selectNode"
            @select-link="selectLink"
            @toggle-fav="toggleFav"
            @toggle-list="toggleList"
            @connect="connect"
          />
          <div v-else class="intro">
            <div class="intro-badge">MeT</div>
            <h2>Como o mapa funciona</h2>
            <p>
              Cada <b>nó</b> é uma obra — filme, série, livro ou anime. Toda obra é descrita
              por atributos em 4 dimensões: <b>gêneros</b>, <b>temas</b>, <b>tom</b> e
              <b>ambientação</b>.
            </p>
            <p>
              As <b>arestas</b> nascem da sobreposição desses atributos. Quanto mais grossa
              a linha, maior a similaridade. Nada é mágico: cada conexão é uma conta que você
              pode abrir e auditar.
            </p>
            <ol class="steps">
              <li><span class="step-n">1</span><span class="step-t">Clique num <b>nó</b> para focar a obra e ver seus vizinhos.</span></li>
              <li><span class="step-n">2</span><span class="step-t">Clique numa <b>aresta</b> para ver <b>por que</b> duas obras se conectam.</span></li>
              <li><span class="step-n">3</span><span class="step-t">Use as <b>categorias</b> na lateral para filtrar tipos de mídia.</span></li>
              <li><span class="step-n">4</span><span class="step-t">Arraste os nós, ajuste a <b>gravidade</b> e dê <b>zoom</b>.</span></li>
            </ol>
            <button v-if="featured[0]" class="intro-cta" @click="openWork(featured[0].id)">Começar por {{ featured[0].title }} →</button>
          </div>
        </aside>
      </div>

      <!-- VIEWS de coleção -->
      <CollectionView
        v-else-if="view === 'inicio'"
        title="Início · Em destaque"
        subtitle="As obras mais bem avaliadas do acervo. Clique em qualquer uma para abri-la no grafo de relações e explorar conexões."
        :works="featured" :favorites="favorites" :my-list="myList"
        @open="openWork" @toggle-fav="toggleFav" @toggle-list="toggleList"
      />
      <CollectionView
        v-else-if="view === 'explorar'"
        title="Explorar" subtitle="Todo o acervo transmídia. Filtre por tipo de mídia."
        :works="WORKS" :favorites="favorites" :my-list="myList" :filterable="true"
        @open="openWork" @toggle-fav="toggleFav" @toggle-list="toggleList"
      />
      <CollectionView
        v-else-if="view === 'lista'"
        title="Minha Lista" subtitle="Obras que você marcou para ver depois."
        :works="listWorks" :favorites="favorites" :my-list="myList"
        empty-title="Sua lista está vazia"
        empty-text="Adicione obras com o botão + nos cards ou no painel de detalhe."
        @open="openWork" @toggle-fav="toggleFav" @toggle-list="toggleList"
      />
      <CollectionView
        v-else-if="view === 'recomendacoes'"
        title="Recomendações"
        subtitle="Geradas a partir do que você favoritou, salvou e visitou — agregando as obras mais similares a cada uma."
        :works="recommended" :favorites="favorites" :my-list="myList"
        empty-title="Ainda sem recomendações"
        empty-text="Favorite ou visite algumas obras e voltamos com sugestões baseadas nelas."
        @open="openWork" @toggle-fav="toggleFav" @toggle-list="toggleList"
      />
      <CollectionView
        v-else-if="view === 'favoritos'"
        title="Favoritos" subtitle="Suas obras favoritas."
        :works="favWorks" :favorites="favorites" :my-list="myList"
        empty-title="Nenhum favorito ainda"
        empty-text="Toque no ♥ em qualquer obra para guardá-la aqui."
        @open="openWork" @toggle-fav="toggleFav" @toggle-list="toggleList"
      />
      <CollectionView
        v-else-if="view === 'historico'"
        title="Histórico" subtitle="Obras que você abriu, da mais recente para a mais antiga."
        :works="historyWorks" :favorites="favorites" :my-list="myList" :show-clear="true"
        empty-title="Histórico vazio"
        empty-text="As obras que você abrir no grafo aparecem aqui."
        @open="openWork" @toggle-fav="toggleFav" @toggle-list="toggleList"
        @clear="history = []"
      />
    </main>

    <div v-if="showResults" class="overlay" @click="showResults = false"></div>
  </div>
</template>

<style scoped>
.app { display: flex; height: 100%; }
.main { flex: 1; min-width: 0; display: flex; flex-direction: column; }

.topbar { display: flex; align-items: center; gap: 24px; padding: 16px 24px; border-bottom: 1px solid var(--border); }
.search { position: relative; flex: 1; max-width: 560px; z-index: 30; }
.search-icon { position: absolute; left: 16px; top: 50%; transform: translateY(-50%); color: var(--text-faint); }
.search input {
  width: 100%; padding: 12px 16px 12px 42px; border-radius: 12px;
  background: var(--panel); border: 1px solid var(--border); color: var(--text); font-size: 14px;
  outline: none; transition: .15s;
}
.search input:focus { border-color: var(--accent); box-shadow: 0 0 0 3px rgba(124,140,248,.12); }
.results {
  position: absolute; top: calc(100% + 8px); left: 0; right: 0; background: var(--panel);
  border: 1px solid var(--border); border-radius: 12px; overflow: hidden; box-shadow: 0 20px 50px rgba(0,0,0,.5);
}
.result { width: 100%; display: flex; align-items: center; justify-content: space-between; padding: 11px 16px; transition: .1s; }
.result:hover { background: var(--panel-2); }
.r-name { font-size: 13.5px; }
.r-type { font-size: 10.5px; color: var(--text-faint); text-transform: uppercase; letter-spacing: .04em; }

.gmode { display: flex; gap: 4px; padding: 4px; background: var(--panel); border: 1px solid var(--border); border-radius: 11px; }
.gmode button { padding: 7px 16px; border-radius: 8px; font-size: 12.5px; font-weight: 600; color: var(--text-dim); transition: .12s; }
.gmode button:hover { color: var(--text); }
.gmode button.on { background: var(--panel-2); color: var(--text); border: 1px solid var(--border); }

.tagp { display: flex; flex-direction: column; gap: 10px; }
.tagp-head { display: flex; align-items: center; justify-content: space-between; }
.why-x { color: var(--text-faint); font-size: 14px; }
.why-x:hover { color: var(--text); }
.tagp-title { font-size: 21px; margin: 0; }
.tagp-sub { font-size: 12.5px; color: var(--text-dim); margin: 0 0 6px; line-height: 1.5; }
.tagp-item { width: 100%; display: flex; align-items: center; gap: 10px; padding: 8px; border-radius: 9px; transition: .12s; }
.tagp-item:hover { background: var(--panel-2); }
.tagp-item i { width: 26px; height: 26px; border-radius: 50%; display: grid; place-items: center; font-weight: 800; font-size: 12px; color: #0a0d14; flex-shrink: 0; }
.tagp-name { font-size: 12.5px; color: var(--text-dim); text-align: left; flex: 1; }
.tagp-rt { font-size: 11.5px; font-weight: 700; color: #f5c518; }

.topbar-title { margin-left: auto; text-align: right; }
.topbar-title strong { display: block; font-size: 13.5px; }
.topbar-title span { font-size: 11px; color: var(--text-faint); }

.workspace { flex: 1; min-height: 0; display: grid; grid-template-columns: 1fr 380px; gap: 18px; padding: 18px 24px 24px; }
.graph-col { min-width: 0; }
.panel { overflow-y: auto; padding: 20px; background: var(--panel); border: 1px solid var(--border); border-radius: 16px; }

.intro { display: flex; flex-direction: column; gap: 14px; }
.intro-badge {
  width: 48px; height: 48px; border-radius: 13px; display: grid; place-items: center;
  font-weight: 800; font-size: 17px; color: #0a0d14;
  background: var(--accent);
}
.intro h2 { font-size: 19px; margin: 2px 0 0; }
.intro p { font-size: 13px; color: var(--text-dim); line-height: 1.6; margin: 0; }
.intro b { color: var(--text); font-weight: 600; }
.steps { list-style: none; padding: 0; margin: 6px 0 4px; display: flex; flex-direction: column; gap: 10px; }
.steps li { display: flex; gap: 11px; font-size: 12.5px; color: var(--text-dim); line-height: 1.45; align-items: flex-start; }
.steps .step-n {
  flex-shrink: 0; width: 22px; height: 22px; border-radius: 7px; display: grid; place-items: center;
  background: var(--panel-2); border: 1px solid var(--border); font-size: 11px; font-weight: 700; color: var(--accent);
}
.steps .step-t { flex: 1; }
.steps .step-t b { color: var(--text); font-weight: 600; }
.intro-cta {
  margin-top: 6px; padding: 12px 16px; border-radius: 11px; font-size: 13px; font-weight: 600;
  background: var(--panel-2);
  border: 1px solid var(--border); color: var(--text); transition: .15s; text-align: left;
}
.intro-cta:hover { border-color: var(--accent); }

.overlay { position: fixed; inset: 0; z-index: 20; }
</style>
