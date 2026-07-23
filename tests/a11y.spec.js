// Acessibilidade — varredura automática (axe-core) + os invariantes que o axe
// NÃO consegue checar sozinho.
//
// O axe pega o que é inspecionável no DOM/CSS (rótulo acessível, papel,
// contraste de texto, ordem de cabeçalhos). Ele NÃO mede alvo de toque em
// px reais nem sabe que este layout tem dois modos — daí os testes manuais
// abaixo, que rodam na matriz inteira de dispositivos.
const { test, expect } = require("@playwright/test");
const AxeBuilder = require("@axe-core/playwright").default;

const PAGINAS = ["/index.html", "/feed.html"];
// WCAG 2.5.5 (Target Size). É o piso que define --bloco-min e toda a escada de
// "degraus" do style.css: quando 44px × colunas não cabe na largura, o CSS
// reduz as COLUNAS em vez de espremer os botões.
const ALVO_MINIMO = 44;
const TOL = 0.5; // subpixel

test.describe("acessibilidade", () => {
    for (const caminho of PAGINAS) {
        test(`axe sem violações em ${caminho}`, async ({ page }) => {
            await page.goto(caminho);
            const { violations } = await new AxeBuilder({ page }).withTags(["wcag2a", "wcag2aa", "wcag21a", "wcag21aa"]).analyze();

            const resumo = violations.map((v) => `${v.id} (${v.impact}, ${v.nodes.length}×): ${v.help}`).join("\n");
            expect(violations, `violações em ${caminho}:\n${resumo}`).toEqual([]);
        });
    }

    // O botão só é alcançável se tiver área suficiente — e este projeto trata
    // o alvo de toque como prioridade sobre densidade (é o motivo de existir o
    // botão de overflow "mais" em vez de espremer mais itens na faixa).
    test("todo botão visível respeita o alvo de toque de 44px", async ({ page }) => {
        await page.goto("/feed.html");
        const caixas = await page.evaluate(() =>
            [...document.querySelectorAll(".mosaico--navbar .mosaico__bloco")]
                .map((el) => ({ rect: el.getBoundingClientRect(), rotulo: el.getAttribute("aria-label") }))
                .filter(({ rect }) => rect.width > 0.5 && rect.height > 0.5)
                .map(({ rect, rotulo }) => ({ rotulo, width: rect.width, height: rect.height })),
        );

        expect(caixas.length, "nenhum botão visível").toBeGreaterThan(0);
        for (const c of caixas) {
            expect(c.width, `largura do botão "${c.rotulo}"`).toBeGreaterThanOrEqual(ALVO_MINIMO - TOL);
            expect(c.height, `altura do botão "${c.rotulo}"`).toBeGreaterThanOrEqual(ALVO_MINIMO - TOL);
        }
    });

    // Botão só com ícone é invisível para leitor de tela sem rótulo — o
    // <i class="bi ..."> não carrega texto acessível nenhum.
    test("todo botão de ícone tem aria-label descritivo", async ({ page }) => {
        await page.goto("/feed.html");
        const semRotulo = await page.evaluate(() =>
            [...document.querySelectorAll("button.mosaico__bloco")]
                .filter((el) => !(el.getAttribute("aria-label") || "").trim() && !el.textContent.trim())
                .map((el) => el.outerHTML.slice(0, 80)),
        );
        expect(semRotulo, "botões sem nome acessível").toEqual([]);
    });

    // O foco de teclado precisa ser VISÍVEL (WCAG 2.4.7) — o reset do projeto
    // apaga o anel nativo, então a regra :focus-visible tem de repor algo.
    test("foco por teclado produz indicador visível", async ({ page }) => {
        await page.goto("/feed.html");
        await page.locator("button.mosaico__bloco").first().focus();
        const estilo = await page.evaluate(() => {
            const s = getComputedStyle(document.activeElement, null);
            return { outlineWidth: s.outlineWidth, outlineStyle: s.outlineStyle, tag: document.activeElement.tagName };
        });
        expect(estilo.tag, "o foco não pousou num <button>").toBe("BUTTON");
        expect(estilo.outlineStyle, "sem estilo de outline no foco").not.toBe("none");
        expect(parseFloat(estilo.outlineWidth), "outline de espessura zero no foco").toBeGreaterThan(0);
    });
});
