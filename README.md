# MeT — Mapa de Engajamento Transmídia

Um explorador visual de obras (filmes, séries, livros e animes) baseado em **grafos**.
Em vez de uma lista de "recomendados", o MeT mostra **por que** duas obras se conectam:
cada obra é descrita por atributos em quatro dimensões — **gêneros, temas, tom e
ambientação** — e a similaridade é a sobreposição ponderada desses atributos. Nada de
caixa-preta: toda conexão é uma conta que você pode abrir e auditar.

## Dois grafos

- **Grafo de Obras** (modo *ego*): começa com obras-semente e você **expande clicando**,
  revelando os vizinhos mais similares de cada obra. Clique numa **aresta** para ver o
  detalhamento da similaridade (quais gêneros/temas/tom/ambientação as duas compartilham e
  quanto cada dimensão contribui para a nota).
- **Grafo de Conceitos**: aqui os **nós são as próprias palavras-chave**. As arestas são a
  **co-ocorrência** (quantas obras têm os dois conceitos juntos), o tamanho do nó é a
  frequência no acervo e as cores separam as quatro dimensões. É o "DNA" do catálogo.
  Clique num conceito para destacar com o que ele anda colado e listar as obras que o contêm.

## Recursos

- ~290 obras reais em quatro mídias, com similaridade explicável
- Layout *force-directed* (d3-force) com arraste, zoom, **gravidade configurável** e
  animação de entrada/saída dos nós
- Busca, **Favoritos**, **Minha Lista** e **Histórico** (persistidos em `localStorage`)
- **Recomendações** geradas a partir do que você favoritou / salvou / visitou
- Filtro por categoria de mídia

## Stack

[Vue 3](https://vuejs.org/) + [Vite](https://vitejs.dev/) + [d3-force](https://github.com/d3/d3-force).
Dados 100% locais (`src/data/catalog.js`) — roda offline, sem chaves de API.

## Rodando

```bash
npm install
npm run dev      # http://localhost:5173
npm run build    # build de produção em dist/
```

## Estrutura

```
src/
  data/
    catalog.js     # acervo (~290 obras) com atributos
    works.js       # modelo de similaridade, grafo ego e grafo de conceitos
  components/
    GraphView.vue      # grafo de obras (ego, expansível, animado)
    KeywordGraph.vue   # grafo de conceitos (co-ocorrência de keywords)
    WorkDetail.vue     # painel de detalhe da obra
    WhyPanel.vue       # "por que conectados?" — breakdown da similaridade
    CollectionView.vue # grades (Início/Explorar/Lista/Favoritos/Histórico/Recomendações)
    Sidebar.vue
  App.vue
```
