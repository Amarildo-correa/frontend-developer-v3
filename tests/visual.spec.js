// Regressão VISUAL — compara o render contra uma imagem de referência
// (baseline) versionada, por perfil de dispositivo.
//
// Papel na suíte, que é diferente dos outros dois arquivos:
//   • navbar.spec.js → geometria (retângulos): pega layout quebrado.
//   • malha.spec.js  → pixel de fronteiras específicas: pega linha dobrada.
//   • ESTE           → a imagem INTEIRA: pega o que ninguém pensou em medir —
//                      ícone trocado, cor fora do token, elemento que sumiu,
//                      espaçamento deslocado. É a rede que apara o resto.
//
// As baselines ficam em `tests/visual.spec.js-snapshots/` e SÃO versionadas;
// sem elas o teste não tem contra o que comparar. Ao mudar o visual de
// propósito, regenere com `npm run test:visual:update` e confira o diff das
// imagens antes de commitar — um baseline atualizado às cegas anula o teste.
const { test, expect } = require("@playwright/test");

// Sem transição: elimina a chance de capturar o quadro no meio de um fade.
test.use({ reducedMotion: "reduce" });

const SELETOR = ".mosaico--navbar .mosaico__bloco";

// Os ícones (Bootstrap Icons) e a fonte vêm de CDN. Sem esperar o webfont
// assentar, a captura pode sair com o glifo de fallback (retângulo vazio) e
// gerar uma diferença que não tem nada a ver com o CSS do projeto.
async function esperarFontes(page) {
    await page.evaluate(() => document.fonts.ready);
    await page.waitForFunction(() => document.fonts.check('1rem "bootstrap-icons"'), null, { timeout: 15_000 });
    await page.evaluate(() => new Promise((r) => requestAnimationFrame(() => requestAnimationFrame(r))));
}

test.describe("regressão visual", () => {
    test("feed em repouso", async ({ page }) => {
        await page.goto("/feed.html");
        await esperarFontes(page);
        await expect(page).toHaveScreenshot("feed-repouso.png", { maxDiffPixelRatio: 0.01 });
    });

    test("mosaico de preenchimento (index)", async ({ page }) => {
        await page.goto("/index.html");
        await esperarFontes(page);
        await expect(page).toHaveScreenshot("index-mosaico.png", { maxDiffPixelRatio: 0.01 });
    });

    // Cobre a APARÊNCIA do estado pressionado — preenchimento, cor e escala do
    // ícone, reforço de borda. É o complemento visual do que malha.spec.js
    // mede numericamente.
    test("navbar com um bloco pressionado", async ({ page }) => {
        await page.goto("/feed.html");
        await esperarFontes(page);

        const navbar = page.locator(".navbar");
        const alvo = page.locator(SELETOR).nth(1); // 2º bloco: tem vizinho dos dois lados
        const caixa = await alvo.boundingBox();

        await page.mouse.move(caixa.x + caixa.width / 2, caixa.y + caixa.height / 2);
        await page.mouse.down();
        await page.waitForFunction(
            ({ sel }) => getComputedStyle(document.querySelectorAll(sel)[1]).backgroundColor !== "rgba(0, 0, 0, 0)",
            { sel: SELETOR },
            { timeout: 5000 },
        );

        await expect(navbar).toHaveScreenshot("navbar-pressionado.png", { maxDiffPixelRatio: 0.01 });
        await page.mouse.up();
    });

    // Tamanho fixo (não o do perfil) porque é a combinação que já escondeu uma
    // regressão de pintura: rail logo acima do breakpoint, altura curta, último
    // bloco encostando na moldura inferior.
    test("441×240 — rail curto", async ({ page }) => {
        await page.setViewportSize({ width: 441, height: 240 });
        await page.goto("/feed.html");
        await esperarFontes(page);
        await expect(page).toHaveScreenshot("rail-441x240.png", { maxDiffPixelRatio: 0.01 });
    });
});
