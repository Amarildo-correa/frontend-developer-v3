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
- NÃO definir `background`, `background-color` ou qualquer cor de fundo em elementos de superfície (`surface`). A cor do fundo sempre será `--color-bg`, por isso todos os elementos terão bordas (linhas) para separá-los.
- NÃO utilizar sombras (`box-shadow`, `filter: drop-shadow()` ou equivalentes).
- NÃO utilizar cantos arredondados (`border-radius`). Todos os componentes DEVEM possuir cantos retos (`border-radius: 0`).
- Todos os valores (cores, medidas, z-index) DEVEM vir de tokens em `:root` (ex.: `var(--color-line)`, `var(--bloco-padding)`). NÃO usar valores hardcoded no corpo das regras.
- Fontes e espaçamentos DEVEM usar `rem`, NUNCA `px`. Única exceção: a linha de 1px das bordas da grade, que é intencionalmente física.
- Grade e blocos DEVEM reaproveitar as classes `.mosaico` e `.mosaico__bloco`.
- Colunas com preenchimento automático DEVEM usar `auto-fill`, NUNCA `auto-fit` (auto-fit estica os blocos em retângulos e quebra a proporção 1:1).
- Altura de viewport DEVE usar `100dvh`, NUNCA `100vh` (que não desconta a barra de endereço móvel e causa saltos de layout).
- Botões representados apenas por ícone DEVEM ter `aria-label` descritivo; o `<i class="bi ...">` sozinho não é acessível.
- O `<head>` DEVE incluir `viewport-fit=cover` (habilita `env(safe-area-inset-*)`) e `theme-color` igual a `--color-bg`.

## Testes automatizados (Playwright)

Infraestrutura de testes end-to-end/visuais baseada em **Projects** do Playwright.
Cada perfil simula um dispositivo real via **device descriptor oficial**
(`devices[...]`), que já traz viewport, user agent, `deviceScaleFactor`, touch e
motor de navegador corretos — nunca viewports customizadas soltas.

### Arquivos

| Arquivo                                              | Papel                                                                                                                                     |
| ---------------------------------------------------- | ----------------------------------------------------------------------------------------------------------------------------------------- |
| [`playwright.config.js`](playwright.config.js)       | Config: a matriz de `projects` (perfis), `webServer` e `baseURL`.                                                                         |
| [`tests/static-server.mjs`](tests/static-server.mjs) | Servidor estático sem dependências que serve `project/` com `Cache-Control: no-store` (garante que o teste leia sempre o CSS/HTML atual). |
| [`tests/*.spec.js`](tests/)                          | Os testes. Um arquivo por assunto; `tests/navbar.spec.js` é a regressão do mosaico da navbar.                                             |

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
npm install            # instala @playwright/test (devDependency já no package.json)
npm run pw:install     # baixa os navegadores (Chromium, Firefox, WebKit)
```

O `webServer` sobe sozinho — NÃO é preciso iniciar servidor manualmente.

### Executar

```bash
npm test                 # TODOS os perfis
npm run test:android     # só Android (Chromium)
npm run test:ios         # só iOS (WebKit)
npm run test:tablet      # só Tablets (Chromium + WebKit)
npm run test:desktop     # só Desktop (Chromium, Firefox, WebKit)
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

Com `--debug=cli`, rode em segundo plano até imprimir as "Debugging
Instructions" com o nome da sessão, então conecte o inspetor:
`playwright-cli attach tw-xxxx` (ver a Skill `playwright-cli`). Cada ação no
`playwright-cli` gera o código Playwright equivalente, que pode ser colado no
teste.

### Criar um novo teste

1. Crie `tests/<assunto>.spec.js` (um arquivo por assunto; o nome espelha o que testa).
2. Use `baseURL` — navegue por caminho relativo: `await page.goto("/feed.html")`.
3. Um perfil pode estar em modo **faixa** (largura < 441px) ou **rail** (≥ 441px).
   Ramifique por `page.viewportSize().width` quando o invariante depender do modo,
   e use `test.skip(width < 441, ...)` para testes que só valem no rail.
4. Meça geometria real com `page.evaluate(...)` sobre o DOM renderizado (ver o
   helper `collectMetrics` em `tests/navbar.spec.js`) em vez de cravar pixels.
5. Rode o novo teste em toda a matriz antes de concluir: `npm test`.

Artefatos gerados (`test-results/`, `playwright-report/`) são ignorados pelo
Git (ver `.gitignore`) — não commitar.
