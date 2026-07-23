# AGENTS

Instruções para agentes de IA que atuam neste repositório.

## Objetivo

Desenvolver protótipos de frontend **mobile-first**, baseados em grid, utilizando exclusivamente HTML e CSS puros.

## Recursos

- Utilizar `--font-base` como fonte padrão em toda a interface.
- Quando necessário, utilizar Bootstrap Icons via `<i class="bi bi-*"></i>`; customizações (cor, tamanho) devem ser feitas em CSS, sempre com tokens (ex.: `color: var(--color-accent)`), nunca com estilo inline.

## Regras

- Todos os arquivos `.html` DEVEM compartilhar exclusivamente os estilos definidos em [`project/style.css`](project/style.css).
- NÃO utilizar gradientes (`linear-gradient`, `radial-gradient`, `conic-gradient` ou equivalentes).
- Cor de fundo em superfícies é PERMITIDA, desde que venha de token (ex.: `var(--color-surface)`). As bordas do mosaico permanecem: a malha de 1px em `--color-line` é o que estrutura o layout, e diferença de fundo não a substitui — as duas coexistem.
- NÃO utilizar sombras (`box-shadow`, `filter: drop-shadow()` ou equivalentes).
- NÃO utilizar cantos arredondados (`border-radius`). Todos os componentes DEVEM possuir cantos retos (`border-radius: 0`).
- Todos os valores (cores, medidas, z-index) DEVEM vir de tokens em `:root` (ex.: `var(--color-line)`, `var(--bloco-padding)`). NÃO usar valores hardcoded no corpo das regras.
- Fontes e espaçamentos DEVEM usar `rem`, NUNCA `px`. Única exceção: a linha de 1px das bordas da grade, que é intencionalmente física.
- Grade e blocos DEVEM reaproveitar as classes `.mosaico` e `.mosaico__bloco`.
- Colunas com preenchimento automático DEVEM usar `auto-fill`, NUNCA `auto-fit` (auto-fit estica os blocos em retângulos e quebra a proporção 1:1).
- Altura de viewport DEVE usar `100dvh`, NUNCA `100vh` (que não desconta a barra de endereço móvel e causa saltos de layout).
- Botões representados apenas por ícone DEVEM ter `aria-label` descritivo; o `<i class="bi ...">` sozinho não é acessível.
- O `<head>` DEVE incluir `viewport-fit=cover` (habilita `env(safe-area-inset-*)`) e `theme-color` igual a `--color-bg`.
- Toda interação iniciada pelo usuário (`hover`, `focus`, `active`, clique, abertura, fechamento, expansão, recolhimento, carregamento ou qualquer transição de estado) DEVE ter uma animação suave via `transition`/`transform` reforçando o feedback, em vez de uma troca abrupta. Preferir `opacity` e `transform` (não disparam reflow); a `transition` fica declarada no estado-base do elemento (não só no estado de destino), para animar tanto a entrada quanto a saída. Durações curtas (na casa de `0.1s`–`0.2s`) e sempre com um bloco `@media (prefers-reduced-motion: reduce)` desligando a transição para quem pede menos movimento.

## Testes automatizados (Playwright)

Infraestrutura de testes end-to-end/visuais baseada em **Projects** do Playwright.
Cada perfil simula um dispositivo real via **device descriptor oficial**
(`devices[...]`), que já traz viewport, user agent, `deviceScaleFactor`, touch e motor de navegador corretos — nunca viewports customizadas soltas.

### Arquivos

| Arquivo                                                  | Papel                                                                                                                                     |
| -------------------------------------------------------- | ----------------------------------------------------------------------------------------------------------------------------------------- |
| [`playwright.config.js`](playwright.config.js)           | Config: a matriz de `projects` (perfis), `webServer` e `baseURL`.                                                                         |
| [`tests/static-server.mjs`](tests/static-server.mjs)     | Servidor estático sem dependências que serve `project/` com `Cache-Control: no-store` (garante que o teste leia sempre o CSS/HTML atual). |
| [`tests/helpers/pixels.js`](tests/helpers/pixels.js)     | Leitura de pixel renderizado: decodifica PNG (`pngjs`), lê tokens do `:root`, mede tinta de linha e contraste WCAG.                        |
| [`tests/navbar.spec.js`](tests/navbar.spec.js)           | Geometria do mosaico (retângulos): sobreposição, uniformidade, proporção 1:1, overflow do botão "mais".                                    |
| [`tests/malha.spec.js`](tests/malha.spec.js)             | Pintura da malha: nenhuma divisória dobrada ou ausente, em repouso e com bloco pressionado.                                                |
| [`tests/a11y.spec.js`](tests/a11y.spec.js)               | Acessibilidade: varredura `axe-core` + alvo de toque 44px, `aria-label` e foco visível.                                                    |
| [`tests/visual.spec.js`](tests/visual.spec.js)           | Regressão visual: compara o render inteiro contra baselines versionadas.                                                                   |

### As quatro camadas, e o que cada uma NÃO vê

Cada camada é cega para o que a seguinte cobre. Um agente que rode só uma delas
vai dar por concluída uma tarefa que quebrou as outras três.

| Camada        | Instrumento                    | Pega                                     | É CEGA para                                              |
| ------------- | ------------------------------ | ---------------------------------------- | -------------------------------------------------------- |
| Geometria     | `getBoundingClientRect()`      | layout: sobreposição, célula esmagada    | tudo que é PINTURA — cor, espessura de linha, contraste  |
| Pintura       | leitura de pixel (`pngjs`)     | linha dobrada/ausente nas fronteiras     | qualquer região que não foi explicitamente varrida       |
| Acessibilidade| `axe-core` + medidas de alvo   | rótulo ausente, contraste, alvo pequeno  | estética, alinhamento, regressão de aparência            |
| Visual        | `toHaveScreenshot()` (baseline)| a imagem INTEIRA: o que ninguém previu   | intenção — só sabe que MUDOU, não se a mudança é correta |

Nenhuma substitui as outras: a de pintura existe porque a de geometria não vê
uma borda de 2px; a visual existe porque a de pintura só olha onde mandaram.

### Perfis (matriz de dispositivos)

Nome do perfil = `<plataforma>-<dispositivo>`. O prefixo é o que agrupa uma
plataforma inteira.

| Plataforma | Perfil (`--project`)   | Device descriptor     | Motor    | Modo do layout |
| ---------- | ---------------------- | --------------------- | -------- | -------------- |
| Android    | `android-pixel-7`      | `Pixel 7`             | Chromium | faixa inferior |
| Android    | `android-galaxy-s24`   | `Galaxy S24`          | Chromium | faixa inferior |
| iOS        | `ios-iphone-15`        | `iPhone 15`           | WebKit   | faixa inferior |
| iOS        | `ios-iphone-se`        | `iPhone SE (3rd gen)` | WebKit   | faixa inferior |
| Tablet     | `tablet-galaxy-tab-s9` | `Galaxy Tab S9`       | Chromium | rail lateral   |
| Tablet     | `tablet-ipad-pro-11`   | `iPad Pro 11`         | WebKit   | rail lateral   |
| Desktop    | `desktop-chromium`     | `Desktop Chrome`      | Chromium | rail lateral   |
| Desktop    | `desktop-firefox`      | `Desktop Firefox`     | Firefox  | rail lateral   |
| Desktop    | `desktop-webkit`       | `Desktop Safari`      | WebKit   | rail lateral   |

### Instalação (só na primeira vez, ou em máquina nova)

```bash
npm install            # @playwright/test, @axe-core/playwright, axe-core, pngjs
npm run pw:install     # baixa os navegadores (Chromium, Firefox, WebKit)
```

O `webServer` sobe sozinho — NÃO é preciso iniciar servidor manualmente.

Ferramental instalado, e por que cada peça existe:

| Pacote                  | Para quê                                                                                            |
| ----------------------- | ---------------------------------------------------------------------------------------------------- |
| `@playwright/test`      | Runner, matriz de dispositivos e `toHaveScreenshot()` (regressão visual, embutido).                  |
| `@axe-core/playwright`  | Varredura WCAG automática dentro da página.                                                          |
| `pngjs`                 | Decodifica o PNG do screenshot para ler o RGB de um pixel — é o que torna a camada de pintura possível. |

### Executar

```bash
npm test                 # TUDO: 4 arquivos × 9 perfis (~1 min)

npm run test:android     # por plataforma
npm run test:ios
npm run test:tablet
npm run test:desktop

npm run test:navbar      # por camada
npm run test:malha
npm run test:a11y
npm run test:visual
npm run test:visual:update   # regenera as baselines visuais (ver abaixo)
```

Um perfil específico, ou um arquivo/teste específico:

```bash
npx playwright test --project=ios-iphone-15                 # um perfil
npx playwright test tests/navbar.spec.js                    # um arquivo
npx playwright test -g "várias alturas"                     # por título (grep)
npx playwright test --project=desktop-webkit -g "rail"      # combinando
```

Para rodar um grupo arbitrário de perfis, encadeie `--project`:
`npx playwright test --project=android-pixel-7 --project=ios-iphone-15`.

### Depurar

```bash
npm run test:ui                              # modo UI interativo (time-travel)
npx playwright test --project=desktop-chromium --headed      # vê o navegador
npx playwright test --debug=cli              # pausa no início; imprime uma
                                             # sessão "tw-xxxx" para inspeção
npm run test:report                          # abre o relatório HTML da última run
```

Com `--debug=cli`, rode em segundo plano até imprimir as "Debugging Instructions" com o nome da sessão, então conecte o inspetor:
`playwright-cli attach tw-xxxx` (ver a Skill `playwright-cli`). Cada ação no `playwright-cli` gera o código Playwright equivalente, que pode ser colado no teste.

### Verificação visual (defeitos de PINTURA)

`getBoundingClientRect()` — base do `collectMetrics` — enxerga **layout**, não **pintura**. Borda duplicada (2px onde a malha exige 1px), divisória que sumiu, contraste que despencou: nenhum desses altera a geometria de um elemento sequer, então TODOS passam pelos testes de geometria existentes. Não adianta reforçar os testes atuais; é outra classe de defeito, que precisa de outro instrumento.

Olhar o screenshot também não resolve. Diferença de 1px e queda de contraste não são confiáveis a olho — menos ainda para um agente, que não faz varredura pré-atenta da imagem e tende a conferir só aquilo que mudou de propósito. Nesta base já aconteceram os dois erros simétricos: dar como quebrado o que estava intacto (contraste baixo lido como "borda sumiu") e dar como correto o que estava com 2px.

**Defeito de pintura só se dá por verificado lendo o valor RGB do pixel** — e o ferramental para isso já existe em [`tests/helpers/pixels.js`](tests/helpers/pixels.js). Use-o em vez de improvisar:

```js
const { lerTokens, capturarFaixa, espessuraDaLinha, contraste } = require("./helpers/pixels");

const corLinha = (await lerTokens(page))["--color-line"]; // nunca cravar hex no teste
const faixa = await capturarFaixa(page, { x: 30, y: 116, width: 1, height: 8 }); // faixa de 1px
const tinta = espessuraDaLinha(faixa, corLinha); // ~1.0 = linha normal; ~2.0 = dobrada
```

Duas armadilhas que já custaram diagnóstico errado, ambas resolvidas dentro do helper:

- **A faixa sai em px de DISPOSITIVO.** Num perfil com `dsf` 2.625, uma faixa de 1px de CSS chega com 3 fileiras no PNG; achatar todas conta cada pixel de linha 3× e infla a medida na mesma proporção. `capturarFaixa` lê só a fileira do meio e devolve o `dsf` para converter de volta a px de CSS.
- **Medir TINTA, não contar pixels.** Chromium/WebKit encaixam a linha num pixel inteiro; o **Firefox mistura**, pintando um pixel em alpha parcial — a MESMA linha de 1px lê `1.0` num motor e `0.5` no outro, variando de fronteira para fronteira descendo o rail. Contagem por igualdade de cor gera falso positivo; soma de tinta não. E como o antialiasing só DILUI (nunca infla além de ~1.0), o que denuncia uma linha dobrada é um **teto absoluto** — exigir uniformidade entre as linhas reprovaria o Firefox por comportamento legítimo.

Invariantes já cobertos por `malha.spec.js`, e como cada um falha na prática:

| Invariante                                                                           | Falha típica                                                                          |
| ------------------------------------------------------------------------------------ | --------------------------------------------------------------------------------------- |
| Nenhuma fronteira soma mais que ~1px de tinta de `--color-line`                       | `border` e `box-shadow` outset pintam em pixels ADJACENTES, não no mesmo — somam 2px     |
| Estado interativo (`:active`, `:hover`, `:focus-visible`) não engrossa linha nenhuma | reforço de aresta no bloco pressionado duplica a divisória que o vizinho já desenhava     |
| Toda fronteira tem tinta em repouso                                                  | divisória que sumiu numa refatoração de `box-shadow`                                     |

Os lugares onde isso quebra são o **primeiro** bloco, um do **meio** e o **último visível** (o que encosta na moldura da `.navbar`), nos DOIS modos. Foi exatamente o último visível, em 441×240, que escondeu uma borda de 2px por três rodadas de revisão a olho — daí existir um teste dedicado a esse tamanho.

**Teste novo de pintura DEVE passar por mutação antes de valer:** reintroduza o defeito de propósito, confirme que o teste falha com diagnóstico legível, e só então restaure. Um teste que passa mas não falharia com o bug presente é pior que teste nenhum, porque dá confiança falsa.

NOTA sobre contraste: `contraste()` está disponível no helper, mas não há teste travando um mínimo — a malha em repouso fica em ~1.6:1 contra o fundo e ~1.4:1 contra `--color-surface`, abaixo dos 3:1 que a WCAG 1.4.11 pede para fronteira de componente. É consequência direta da paleta atual, não uma regressão; travar o valor hoje deixaria a suíte vermelha. Se a paleta for revista, é o momento de virar asserção.

### Baselines visuais

`tests/visual.spec.js-snapshots/` É VERSIONADO — sem as imagens de referência a camada visual não tem contra o que comparar. Ícones e fonte vêm de CDN, então todo teste visual espera `document.fonts` assentar antes de capturar (ver `esperarFontes`); sem isso a captura pode sair com o glifo de fallback e acusar diferença que não tem nada a ver com o CSS.

Ao mudar o visual **de propósito**: `npm run test:visual:update` e então CONFIRA o diff das imagens antes de commitar. Baseline atualizada às cegas anula a camada inteira.

### Quando a tarefa está concluída

Implementar o que foi pedido não encerra a tarefa:

1. **`npm test` inteiro verde** — não só o arquivo ligado à mudança. As camadas se cobrem mutuamente, e a que você não rodou é justamente a que pegaria o efeito colateral.
2. **Avaliar como usuário final, não como autor do patch.** A mudança introduziu regressão visual, inconsistência de layout, problema de usabilidade, quebra de responsividade ou de acessibilidade em algum dos 9 perfis? O pedido original é o piso do que verificar, não o teto.
3. **Teste pré-existente vermelho: achar a causa antes de tocar nele.** Afrouxar asserção para ficar verde só é legítimo quando o invariante de fato deixou de valer — e a justificativa vai no comentário do teste, não na mensagem de commit.
4. **Relatar honestamente o que ficou de fora**: flanco não coberto, limitação conhecida do instrumento, achado que não foi corrigido.

### Criar um novo teste

1. Escolha a CAMADA primeiro (ver a tabela lá em cima) — ela decide o instrumento. Defeito de layout vai em `navbar.spec.js`; de pintura, em `malha.spec.js`; de acessibilidade, em `a11y.spec.js`; aparência geral, em `visual.spec.js`. Assunto novo ganha `tests/<assunto>.spec.js`.
2. Use `baseURL` — navegue por caminho relativo: `await page.goto("/feed.html")`.
3. Um perfil pode estar em modo **faixa** (largura < 441px) ou **rail** (≥ 441px). Ramifique por `page.viewportSize().width` quando o invariante depender do modo, e use `test.skip(width < 441, ...)` para testes que só valem no rail.
4. Meça o DOM renderizado com `page.evaluate(...)` (ver `collectMetrics` em `navbar.spec.js`) ou o pixel com `helpers/pixels.js` — nunca crave pixels nem hex de cor no teste; cores vêm de `lerTokens`.
5. `test.use({ reducedMotion: "reduce" })` em testes que capturam estado interativo: sem isso a captura pode pegar o quadro no meio da transição, e o teste fica intermitente.
6. Para medir estado pressionado, ESPERE a pintura assentar (ver `pressionar` em `malha.spec.js`) — `mouse.down()` retorna antes de o `:active` estar pintado.
7. Rode em toda a matriz antes de concluir: `npm test`.

Artefatos gerados (`test-results/`, `playwright-report/`) são ignorados pelo Git (ver `.gitignore`) — não commitar.
