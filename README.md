# starter-pack-universal

Briiq Slides **starter pack** — o conteúdo funcional de um tenant novo. Quando o
Briiq Cloud git-clona este repo para um tenant, o clone já vira um repo pronto
para o **Engine** renderizar e o **brand-checker** validar.

É um **GitHub Template repo**: clone/fork = repo de tenant pronto.

## Estrutura

```
ds/                  Design System universal (neutro, personalizável)
  tokens.css         Tokens de cor, tipo, espaçamento, radius, shadows
  components.css     CSS de layout/slide (.slide, .bg-*, grids) — consome tokens.css
  brand.json         Config do brand-checker (classes válidas, regras, contraste)
  branding.json      Identidade do tenant (nome, logo, favicon) — preenchida no onboarding
templates/           Catálogo de layouts
  index.html         18 layouts anotados com data-briiq-* (fonte do catálogo)
  catalog.json       Catálogo v1 gerado (consumido pelo Engine via createCatalog)
  build-catalog.mjs  Extrator: index.html -> catalog.json
  deck-stage.js      Runtime do viewer (<deck-stage>, escala 1920×1080)
decks/               Apresentações
  exemplo/           Deck exemplo renderizável (Acme Cloud)
```

## Como o Engine consome

`templates/catalog.json` é **catalog v1**, 1-to-1 com `createCatalog` do Engine.
Cada layout traz `id`, `intent`, `intent_keywords`, `arity_hint`, `slots[]` e
`html_clone_template` (HTML do `<section>` com placeholders `{{slot:X}}`). O Engine
clona o template, preenche os slots e o brand-checker valida o resultado.

## Personalizar para sua marca

1. Edite `ds/tokens.css` — troque os ramps (`--brand-*`, `--ink-*`, `--accent-*`)
   pelas cores da sua marca. `ds/components.css` e os decks se atualizam sozinhos.
2. Substitua o `.logo-mark` + o texto `Sua Marca` nas capas pelo seu logo.
3. Preencha `ds/branding.json`.

## Comandos

```bash
npm install            # node-html-parser (só para regerar o catálogo)
npm run build:catalog  # regenera templates/catalog.json a partir do index.html
npm test               # valida o catálogo (>=10 layouts + contrato catalog v1)
```

`catalog.json` já vem pré-gerado e versionado — o Engine funciona sem `npm install`.
Rode `build:catalog` só depois de editar `templates/index.html`.

## Adicionar um layout

1. Adicione um `<section class="slide bg-...">` em `templates/index.html` com:
   - `data-briiq-layout-id`, `data-briiq-intent`, `data-briiq-keywords`, `data-briiq-arity`
   - elementos editáveis com `data-briiq-slot="..."` (+ `data-briiq-slot-max` opcional)
2. `npm run build:catalog && npm test`
