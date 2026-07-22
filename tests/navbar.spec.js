// Regressão do mosaico de navegação (.mosaico--navbar) em feed.html.
//
// O layout tem dois modos, separados pelo breakpoint de 441px (27.5625rem):
//   • FAIXA inferior (largura < 441px): colunas em UMA linha na base; cada
//     coluna mede largura ÷ N (auto-fill + 1fr).
//   • RAIL lateral   (largura ≥ 441px): o MESMO mecanismo espelhado na
//     vertical — N = floor(altura / 56) linhas, cada uma medindo altura ÷ N.
//     O excedente de itens colapsa a 0px e desaparece.
//
// Invariantes centrais do rail, todos verificados aqui:
//   1. nenhuma célula se sobrepõe a outra;
//   2. as células PREENCHEM a altura toda — sobra ≈ 0, sem meia-célula
//      cortada nem esmagada no fim (era o defeito corrigido);
//   3. todas as células visíveis têm o MESMO tamanho (distribuição uniforme);
//   4. a célula nunca fica menor que o piso de 56px;
//   5. proporção 1:1 — exata onde o motor sabe dividir comprimentos em calc()
//      (Chromium/WebKit); nos demais, ao menos nunca distorcida.
const { test, expect } = require("@playwright/test");

const RAIL_MIN_WIDTH = 441; // 27.5625rem × 16px — breakpoint do modo rail.
const CELL_FLOOR = 56; // --bloco-max: piso do minmax das linhas do rail.
const TOL = 1.5; // tolerância em px para arredondamento de subpixel.

// Coleta as métricas geométricas da navbar direto do DOM renderizado.
async function collectMetrics(page) {
    return page.evaluate(() => {
        const grid = document.querySelector(".mosaico--navbar");
        const gridRect = grid.getBoundingClientRect();
        const all = [...grid.querySelectorAll(".mosaico__bloco")];
        const rects = all.map((el) => el.getBoundingClientRect());
        const visible = rects.filter((r) => r.width > 0.5 && r.height > 0.5);

        // Conta pares de células VISÍVEIS que se sobrepõem (área > 1px²).
        let overlapping = 0;
        for (let i = 0; i < visible.length; i++) {
            for (let j = i + 1; j < visible.length; j++) {
                const a = visible[i];
                const b = visible[j];
                const ix = Math.min(a.right, b.right) - Math.max(a.left, b.left);
                const iy = Math.min(a.bottom, b.bottom) - Math.max(a.top, b.top);
                if (ix > 1 && iy > 1) overlapping++;
            }
        }

        const last = visible[visible.length - 1];
        const mais = grid.querySelector(".mosaico__bloco--mais");
        const maisRect = mais.getBoundingClientRect();
        const maisVisivel = maisRect.width > 0.5 && maisRect.height > 0.5;
        return {
            total: all.length,
            // Itens de navegação reais (todos menos o botão de overflow).
            itensReais: all.length - 1,
            maisVisivel,
            // Quando aparece, o "mais" tem de ser a ÚLTIMA célula do rail.
            maisEhUltimo: maisVisivel && Math.abs(maisRect.bottom - gridRect.bottom) < 2,
            visible: visible.length,
            overlapping,
            gridHeight: gridRect.height,
            // Espaço vazio depois da última célula: é o "resto da divisão" que
            // antes virava meia-célula esmagada. Deve ser ~0.
            leftover: visible.length ? gridRect.bottom - last.bottom : gridRect.height,
            singleRow: visible.every((r) => Math.abs(r.top - visible[0].top) < 1.5),
            heights: visible.map((r) => r.height),
            widths: visible.map((r) => r.width),
            // O motor sabe dividir comprimento por comprimento em calc()?
            // É o que habilita a espessura dinâmica do rail (1:1 exato).
            exactRatioSupported: CSS.supports("width", "calc(100dvh / round(down, calc(100dvh / 3.5rem), 1))"),
        };
    });
}

// Asserções do modo rail, reutilizadas em cada altura testada.
function assertRail(m, label) {
    expect(m.overlapping, `sobreposição ${label}`).toBe(0);
    expect(m.visible, `nenhuma célula visível ${label}`).toBeGreaterThan(0);

    // 2. preenche a altura toda — sem resto na base.
    expect(m.leftover, `sobra na base ${label}`).toBeLessThanOrEqual(TOL);

    // 3. todas as células visíveis têm o mesmo tamanho.
    const h0 = m.heights[0];
    for (const h of m.heights) {
        expect(Math.abs(h - h0), `células desiguais ${label}`).toBeLessThanOrEqual(TOL);
    }

    // 4. nunca abaixo do piso; e a célula é exatamente altura ÷ N.
    expect(h0, `célula abaixo do piso ${label}`).toBeGreaterThanOrEqual(CELL_FLOOR - TOL);
    const expectedN = Math.floor(m.gridHeight / CELL_FLOOR);
    expect(m.visible, `contagem de linhas ${label}`).toBe(expectedN);
    expect(Math.abs(h0 - m.gridHeight / expectedN), `altura ≠ altura÷N ${label}`).toBeLessThanOrEqual(TOL);

    // 5. proporção.
    const w0 = m.widths[0];
    if (m.exactRatioSupported) {
        expect(Math.abs(w0 - h0), `célula não é quadrada ${label}`).toBeLessThanOrEqual(TOL);
    } else {
        // Fallback (Firefox): espessura fixa. Exige apenas que não distorça.
        expect(h0 / w0, `célula distorcida ${label}`).toBeLessThan(1.5);
    }

    // 6. three-dots: aparece exatamente quando há excedente, e como última
    //    célula. Some quando todos os itens couberem.
    const cabeTudo = m.visible >= m.itensReais;
    if (cabeTudo) {
        expect(m.maisVisivel, `"mais" visível sem excedente ${label}`).toBe(false);
    } else {
        expect(m.maisVisivel, `"mais" ausente havendo excedente ${label}`).toBe(true);
        expect(m.maisEhUltimo, `"mais" não é a última célula ${label}`).toBe(true);
    }
}

test.describe("mosaico da navbar (feed.html)", () => {
    test("renderiza sem sobreposição no viewport do dispositivo", async ({ page }) => {
        await page.goto("/feed.html");
        const width = page.viewportSize().width;
        const m = await collectMetrics(page);

        expect(m.visible).toBeGreaterThan(0);
        expect(m.overlapping, "nenhuma célula pode se sobrepor").toBe(0);

        if (width >= RAIL_MIN_WIDTH) {
            assertRail(m, "(viewport do dispositivo)");
        } else {
            expect(m.singleRow, "faixa inferior deve ser uma única linha").toBe(true);
        }
    });

    // O ponto de falha histórico: modo rail com ALTURAS variadas. Aqui se
    // verifica que as células se REDIMENSIONAM para preencher cada altura.
    test("rail preenche a altura com células uniformes em várias alturas", async ({ page }) => {
        const width = page.viewportSize().width;
        test.skip(width < RAIL_MIN_WIDTH, "perfil em modo faixa (largura < 441px)");

        await page.goto("/feed.html");
        for (const height of [1200, 1000, 800, 578, 600, 400, 300, 250]) {
            await page.setViewportSize({ width: Math.max(width, RAIL_MIN_WIDTH), height });
            const m = await collectMetrics(page);
            assertRail(m, `em altura ${height}px`);
        }
    });
});
