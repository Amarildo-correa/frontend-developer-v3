// Configuração do Playwright — arquitetura baseada em PROJECTS.
//
// Cada "project" é um PERFIL de dispositivo derivado de um device descriptor
// OFICIAL do Playwright (`devices[...]`), que já traz viewport, userAgent,
// deviceScaleFactor, isMobile, hasTouch e o motor de navegador corretos — em
// vez de viewports customizadas soltas.
//
// Convenção de nomes: `<plataforma>-<dispositivo>`. O prefixo de plataforma é
// o que permite rodar um grupo inteiro (ver os scripts `test:<plataforma>` no
// package.json, que apenas listam os `--project` daquela plataforma). Rodar um
// perfil isolado é `--project=<nome-exato>`.
//
// Referências oficiais:
//   • Projects .......... https://playwright.dev/docs/test-projects
//   • Emulação/devices .. https://playwright.dev/docs/emulation
//   • webServer ......... https://playwright.dev/docs/test-webserver
const { defineConfig, devices } = require("@playwright/test");

module.exports = defineConfig({
    testDir: "./tests",
    // `fullyParallel` roda os testes de um mesmo arquivo em paralelo; com uma
    // matriz de 9 perfis isso encurta bastante a execução completa.
    fullyParallel: true,
    // Em CI: falha se alguém esqueceu um `test.only`, e liga retries.
    forbidOnly: !!process.env.CI,
    retries: process.env.CI ? 2 : 0,
    reporter: [["html", { open: "never" }], ["list"]],

    use: {
        // baseURL casa com o webServer abaixo — os testes usam caminhos
        // relativos (`page.goto("/feed.html")`), nunca URLs absolutas.
        baseURL: "http://127.0.0.1:4173/",
        // Colhe trace/screenshot só quando um teste falha, para depuração.
        trace: "on-first-retry",
        screenshot: "only-on-failure",
    },

    // Sobe o servidor estático uma vez antes da suíte e o reaproveita em dev.
    webServer: {
        command: "node tests/static-server.mjs",
        url: "http://127.0.0.1:4173/feed.html",
        reuseExistingServer: !process.env.CI,
        timeout: 30_000,
    },

    // ── Matriz de perfis ────────────────────────────────────────────────────
    // Todos os viewports vêm do device descriptor; nenhum número mágico aqui.
    projects: [
        // Android — Chromium (telefones; largura < 441px → modo FAIXA inferior).
        { name: "android-pixel-7", use: { ...devices["Pixel 7"] } },
        { name: "android-galaxy-s24", use: { ...devices["Galaxy S24"] } },

        // iOS — WebKit (telefones; modo FAIXA inferior).
        { name: "ios-iphone-15", use: { ...devices["iPhone 15"] } },
        { name: "ios-iphone-se", use: { ...devices["iPhone SE (3rd gen)"] } },

        // Tablets — um Chromium, um WebKit (largura ≥ 441px → modo RAIL lateral).
        { name: "tablet-galaxy-tab-s9", use: { ...devices["Galaxy Tab S9"] } },
        { name: "tablet-ipad-pro-11", use: { ...devices["iPad Pro 11"] } },

        // Desktop — os três motores (modo RAIL lateral).
        { name: "desktop-chromium", use: { ...devices["Desktop Chrome"] } },
        { name: "desktop-firefox", use: { ...devices["Desktop Firefox"] } },
        { name: "desktop-webkit", use: { ...devices["Desktop Safari"] } },
    ],
});
