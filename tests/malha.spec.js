// Invariante de PINTURA da malha: todas as divisórias têm a MESMA espessura,
// e nenhuma engrossa quando um bloco é pressionado.
//
// Complementa navbar.spec.js, que mede geometria (retângulos) e por isso é
// CEGO para esta classe de defeito — uma linha dobrada não move elemento
// nenhum, então passa intacta por qualquer teste de layout.
//
// A MEDIDA É DE TINTA, NÃO DE CONTAGEM DE PIXELS, e o limite é um TETO:
// quanto da fronteira está pintado com --color-line, somado ao longo da
// varredura. A escolha vem de como os motores resolvem a fronteira fracionária
// da célula (altura 59.83px, então cada divisória cai num offset de subpixel
// diferente):
//   • Chromium/WebKit ENCAIXAM a linha num pixel inteiro       → tinta ~1.0
//   • Firefox MISTURA, pintando um pixel em alpha parcial      → tinta 0.5–1.0,
//     variando de fronteira para fronteira descendo o rail
// Ou seja: o antialiasing só DILUI a linha, nunca a infla além de ~1.0. Já uma
// linha genuinamente dobrada soma ~2.0 em qualquer motor. Por isso o teto
// absoluto discrimina os dois casos, enquanto exigir uniformidade entre as
// linhas reprovaria o Firefox por um comportamento legítimo dele.
//
// LIMITAÇÃO CONHECIDA: no Firefox, uma linha dobrada em que as DUAS metades
// caiam em alpha parcial pode somar ~1.0 e passar. Os seis perfis
// Chromium/WebKit cobrem esse flanco — foi num deles que a regressão 441×240
// apareceu.
//
// Regressões nomeadas que este arquivo tranca:
//   • "441×240": em modo rail, a aresta de fechamento do último bloco visível
//     somava a box-shadow do bloco à border da .navbar em pixels ADJACENTES,
//     rendendo 2px. Corrigido trocando a sombra de `inset` para outset, que
//     cai exatamente sobre a borda do container em vez de ao lado dela.
//   • "reforço de :active": a borda somada ao bloco pressionado duplicava a
//     divisória que o vizinho anterior já desenhava. Daí o reforço existir só
//     na aresta de ENTRADA (left na faixa, top no rail) e nunca no primeiro
//     bloco, cuja aresta de entrada é a moldura do próprio container.
const { test, expect } = require("@playwright/test");
const { lerTokens, capturarFaixa, espessuraDaLinha } = require("./helpers/pixels");

const RAIL_MIN_WIDTH = 441; // 27.5625rem — breakpoint faixa → rail.
const JANELA = 4; // px de CSS varridos de cada lado da fronteira.
// Teto de tinta por fronteira. Uma linha de 1px soma no máximo ~1.05 (o
// antialiasing dilui, não infla); uma linha dobrada soma ~2.0.
const TINTA_MAX = 1.45;
// Piso para "a linha existe": abaixo disto não há tinta nenhuma na fronteira.
const TINTA_MIN = 0.3;

// Sem transição: o estado pressionado fica estável de imediato, sem depender
// de espera pelo fade. De quebra, exercita o caminho
// `prefers-reduced-motion: reduce` do style.css.
test.use({ reducedMotion: "reduce" });

const SELETOR = ".mosaico--navbar .mosaico__bloco";

// "Visível" = tem as DUAS dimensões. No rail, os blocos excedentes colapsam a
// altura 0 mas conservam a largura da coluna; filtrar só por largura os
// manteria na lista e desalinharia todo índice daqui para a frente. Este
// predicado se repete dentro do navegador em `pressionar` (funções não
// atravessam `evaluate` por referência) e os dois PRECISAM continuar
// idênticos: divergir desalinha o índice do bloco pressionado.
async function caixasVisiveis(page) {
    return page.evaluate(
        (sel) =>
            [...document.querySelectorAll(sel)]
                .map((el) => el.getBoundingClientRect())
                .filter((r) => r.width > 0.5 && r.height > 0.5)
                .map((r) => ({ x: r.x, y: r.y, width: r.width, height: r.height, right: r.right, bottom: r.bottom })),
        SELETOR,
    );
}

// Mede a espessura pintada de UMA fronteira, em px de CSS.
async function medirFronteira(page, { eixo, pos, transversal, corLinha }) {
    const { width: vw, height: vh } = page.viewportSize();
    const limite = eixo === "x" ? vw : vh;
    const largura = 2 * JANELA;

    // As fronteiras EXTERNAS (a moldura da .navbar) encostam na borda do
    // viewport: de um dos lados não existe pixel, a varredura vira unilateral
    // e o pixel da ponta é a própria linha — usá-lo como referência de fundo
    // zeraria a medida. Nesses casos a referência vem do lado interior.
    let inicio = Math.round(pos - JANELA);
    let ladoInterior = null;
    if (inicio < 0) {
        inicio = 0;
        ladoInterior = "fim";
    } else if (inicio + largura > limite) {
        inicio = limite - largura;
        ladoInterior = "inicio";
    }
    const extensao = Math.min(largura, limite - inicio);

    const clip =
        eixo === "x"
            ? { x: inicio, y: Math.round(transversal), width: extensao, height: 1 }
            : { x: Math.round(transversal), y: inicio, width: 1, height: extensao };

    const faixa = await capturarFaixa(page, clip);
    const fundo = ladoInterior === "fim" ? faixa.pixels.at(-1) : ladoInterior === "inicio" ? faixa.pixels[0] : null;
    return espessuraDaLinha(faixa, corLinha, fundo ? { fundo } : {});
}

// Fronteiras que valem varrer: a de ENTRADA de cada bloco (a divisória que ele
// compartilha com o anterior) e a de FECHAMENTO do último visível, onde a
// linha encontra a moldura da nav — o ponto exato da regressão 441×240.
function fronteirasDe(caixas, modo) {
    const eixo = modo === "faixa" ? "x" : "y";
    const fronteiras = caixas.map((c, i) => ({
        rotulo: `bloco ${i} — entrada`,
        eixo,
        pos: modo === "faixa" ? c.x : c.y,
        transversal: modo === "faixa" ? c.y + c.height / 2 : c.x + c.width / 2,
    }));

    const ultimo = caixas.at(-1);
    fronteiras.push({
        rotulo: `bloco ${caixas.length - 1} (último) — fechamento`,
        eixo,
        pos: modo === "faixa" ? ultimo.right : ultimo.bottom,
        transversal: modo === "faixa" ? ultimo.y + ultimo.height / 2 : ultimo.x + ultimo.width / 2,
    });

    return fronteiras;
}

async function medirTodas(page, fronteiras, corLinha) {
    const medidas = {};
    for (const f of fronteiras) {
        medidas[f.rotulo] = await medirFronteira(page, { ...f, corLinha });
    }
    return medidas;
}

// Pressiona um bloco e ESPERA a pintura assentar. Sem isto o screenshot pode
// capturar um quadro anterior à aplicação do :active — foi a origem de falhas
// intermitentes em Android/Tablet, que apareciam e sumiam entre execuções.
async function pressionar(page, caixa, indice) {
    await page.mouse.move(caixa.x + caixa.width / 2, caixa.y + caixa.height / 2);
    await page.mouse.down();
    await page.waitForFunction(
        ({ sel, i }) => {
            const el = [...document.querySelectorAll(sel)].filter((e) => {
                const r = e.getBoundingClientRect();
                return r.width > 0.5 && r.height > 0.5;
            })[i];
            return el && getComputedStyle(el).backgroundColor !== "rgba(0, 0, 0, 0)";
        },
        { sel: SELETOR, i: indice },
        { timeout: 5000 },
    );
    // Dois quadros: o primeiro agenda a pintura, o segundo garante que saiu.
    await page.evaluate(() => new Promise((r) => requestAnimationFrame(() => requestAnimationFrame(r))));
}

// `exigirPresenca` só vale em REPOUSO, onde os dois lados de toda fronteira são
// --color-bg. Com um bloco pressionado, um dos lados vira --color-surface, que
// está a ~1.4:1 de --color-line: uma linha diluída pelo antialiasing encostada
// nesse preenchimento mede baixo mesmo estando lá (no Firefox, 0.17). A leitura
// é ambígua porque as duas cores são de fato quase indistinguíveis ali — é a
// mesma dificuldade que o olho tem. O TETO, que é o que denuncia duplicação,
// não sofre desse problema e continua valendo nos dois estados.
function verificarMalha(medidas, contexto, { exigirPresenca = true } = {}) {
    const detalhe = Object.entries(medidas)
        .map(([k, v]) => `${k}=${v.toFixed(2)}`)
        .join("  ");

    for (const [rotulo, tinta] of Object.entries(medidas)) {
        expect(tinta, `${rotulo} DOBRADA ${contexto} — ${detalhe}`).toBeLessThanOrEqual(TINTA_MAX);
        if (exigirPresenca) {
            expect(tinta, `${rotulo} AUSENTE ${contexto} — ${detalhe}`).toBeGreaterThan(TINTA_MIN);
        }
    }
}

test.describe("malha de 1px (pintura)", () => {
    test("nenhuma divisória está dobrada nem ausente em repouso", async ({ page }) => {
        await page.goto("/feed.html");
        const modo = page.viewportSize().width < RAIL_MIN_WIDTH ? "faixa" : "rail";
        const corLinha = (await lerTokens(page))["--color-line"];
        const medidas = await medirTodas(page, fronteirasDe(await caixasVisiveis(page), modo), corLinha);
        verificarMalha(medidas, `(${modo}, repouso)`);
    });

    // O caso que escapou de três rodadas de revisão visual: o reforço de borda
    // do estado pressionado somando-se à divisória que o vizinho já desenhava.
    // Verifica a malha INTEIRA a cada bloco pressionado, não só as arestas
    // dele — o reforço não pode vazar para as fronteiras vizinhas.
    test("nenhuma divisória dobra com um bloco pressionado", async ({ page }) => {
        await page.goto("/feed.html");
        const modo = page.viewportSize().width < RAIL_MIN_WIDTH ? "faixa" : "rail";
        const corLinha = (await lerTokens(page))["--color-line"];
        const caixas = await caixasVisiveis(page);
        const fronteiras = fronteirasDe(caixas, modo);

        for (let i = 0; i < caixas.length; i++) {
            await pressionar(page, caixas[i], i);
            const medidas = await medirTodas(page, fronteiras, corLinha);
            await page.mouse.up();
            verificarMalha(medidas, `(${modo}, bloco ${i} pressionado)`, { exigirPresenca: false });
        }
    });

    // 441×240 é a combinação exata que revelou a aresta de fechamento dobrada:
    // largura logo acima do breakpoint do rail e altura curta, que faz o último
    // bloco visível encostar na moldura inferior do container. Em viewports
    // altos o último bloco não alcança a moldura e o defeito não aparece — por
    // isso a medida precisa deste tamanho fixo, e não do viewport do perfil.
    test("441×240 — aresta de fechamento do rail não dobra (regressão)", async ({ page }) => {
        await page.setViewportSize({ width: RAIL_MIN_WIDTH, height: 240 });
        await page.goto("/feed.html");
        const corLinha = (await lerTokens(page))["--color-line"];
        const caixas = await caixasVisiveis(page);
        const fronteiras = fronteirasDe(caixas, "rail");

        verificarMalha(await medirTodas(page, fronteiras, corLinha), "(441×240, repouso)");

        await pressionar(page, caixas.at(-1), caixas.length - 1);
        const pressionado = await medirTodas(page, fronteiras, corLinha);
        await page.mouse.up();
        verificarMalha(pressionado, "(441×240, último bloco pressionado)", { exigirPresenca: false });
    });
});
