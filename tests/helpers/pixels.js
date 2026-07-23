// Leitura de PIXEL RENDERIZADO — o instrumento para defeitos de PINTURA.
//
// Por que existe: `getBoundingClientRect()` (base do `collectMetrics` em
// navbar.spec.js) enxerga LAYOUT, não PINTURA. Uma divisória de 2px onde a
// malha exige 1px, uma linha que sumiu ou um contraste que despencou não
// alteram a geometria de nenhum elemento — passam intactos por qualquer teste
// de retângulo. Só a leitura do valor RGB do que foi efetivamente desenhado
// pega essa classe de defeito.
//
// Decodificação por `pngjs` (devDependency), não por `<canvas>` numa page
// auxiliar: é um decoder de verdade, síncrono, sem subir um segundo browser
// só para ler bytes.
const { PNG } = require("pngjs");

// ── Cores ───────────────────────────────────────────────────────────────────

function hexParaRgb(hex) {
    const h = hex.trim().replace("#", "");
    const full = h.length === 3 ? [...h].map((c) => c + c).join("") : h;
    return [parseInt(full.slice(0, 2), 16), parseInt(full.slice(2, 4), 16), parseInt(full.slice(4, 6), 16)];
}

// Lê os tokens direto do :root da página renderizada. Os testes NUNCA cravam
// hex: se a paleta mudar em style.css, o teste acompanha (mesma regra que o
// AGENTS.md impõe ao CSS — tudo vem de token).
async function lerTokens(page, nomes = ["--color-bg", "--color-line", "--color-surface", "--color-accent", "--color-icon-active"]) {
    const brutos = await page.evaluate((ns) => {
        const cs = getComputedStyle(document.documentElement);
        return Object.fromEntries(ns.map((n) => [n, cs.getPropertyValue(n)]));
    }, nomes);
    return Object.fromEntries(Object.entries(brutos).map(([n, v]) => [n, hexParaRgb(v)]));
}

// ── Captura ─────────────────────────────────────────────────────────────────

// Captura uma faixa de 1px de espessura e devolve os pixels EM ORDEM DE
// VARREDURA, junto do deviceScaleFactor efetivo (deduzido do PNG, não
// assumido): num perfil com dsf 3, cada pixel de CSS vira 3 no PNG, e é isso
// que converte a medida de volta para px de CSS.
async function capturarFaixa(page, clip) {
    if (clip.width !== 1 && clip.height !== 1) {
        throw new Error("capturarFaixa espera uma faixa de 1px: width===1 (varredura vertical) ou height===1 (horizontal)");
    }
    const png = PNG.sync.read(await page.screenshot({ clip }));
    const horizontal = clip.height === 1;
    const dsf = horizontal ? png.width / clip.width : png.height / clip.height;

    // ATENÇÃO: a faixa tem 1px de CSS de espessura, mas o PNG sai em px de
    // DISPOSITIVO — num perfil com dsf 2.625 ela chega com 3 fileiras. Ler
    // todas e achatar contaria cada pixel de linha três vezes e inflaria a
    // medida na mesma proporção. Só a fileira do MEIO interessa; a espessura
    // é medida ao longo da varredura, não através dela.
    const pixels = [];
    if (horizontal) {
        const y = png.height >> 1;
        for (let x = 0; x < png.width; x++) {
            const i = (png.width * y + x) << 2;
            pixels.push([png.data[i], png.data[i + 1], png.data[i + 2]]);
        }
    } else {
        const x = png.width >> 1;
        for (let y = 0; y < png.height; y++) {
            const i = (png.width * y + x) << 2;
            pixels.push([png.data[i], png.data[i + 1], png.data[i + 2]]);
        }
    }
    return { pixels, dsf };
}

// ── Medição de espessura ────────────────────────────────────────────────────

// Quanto este pixel "avançou" de `fundo` em direção a `alvo`, em [0,1].
// Projeção escalar no vetor fundo→alvo, saturada.
function projecao(px, fundo, alvo) {
    const v = [alvo[0] - fundo[0], alvo[1] - fundo[1], alvo[2] - fundo[2]];
    const d = [px[0] - fundo[0], px[1] - fundo[1], px[2] - fundo[2]];
    const den = v[0] * v[0] + v[1] * v[1] + v[2] * v[2];
    if (den === 0) return 0;
    return Math.min(1, Math.max(0, (d[0] * v[0] + d[1] * v[1] + d[2] * v[2]) / den));
}

// Espessura EFETIVA da linha dentro da faixa, em px de CSS.
//
// Não conta "pixels que casam com --color-line", e sim soma quanta TINTA de
// linha existe na faixa. É o que torna a medida imune ao antialiasing: uma
// linha de 1px que caiu numa fronteira fracionária é pintada como dois pixels
// a 50% — contagem por igualdade leria "2px" (falso positivo), a soma lê 1.0.
// Uma linha genuinamente dobrada soma 2.0.
//
// Os preenchimentos dos DOIS lados entram como referência (o primeiro e o
// último pixel da faixa): o `min` das duas projeções zera tanto o fundo comum
// (--color-bg) quanto um preenchimento de estado (--color-surface no :active),
// que de outro modo contaria como tinta parcial e inflaria o total.
//
// `fundo` força uma referência única, para a fronteira que encosta na borda do
// viewport (a moldura de fechamento da .navbar): ali não há pixel do lado de
// fora para servir de segunda referência, e o último pixel da faixa É a
// própria linha — usá-lo como referência zeraria a medida.
function espessuraDaLinha({ pixels, dsf }, corLinha, { fundo } = {}) {
    const ladoA = fundo ?? pixels[0];
    const ladoB = fundo ?? pixels[pixels.length - 1];
    const tinta = pixels.reduce((soma, px) => soma + Math.min(projecao(px, ladoA, corLinha), projecao(px, ladoB, corLinha)), 0);
    return tinta / dsf;
}

// ── Contraste (WCAG 1.4.11) ─────────────────────────────────────────────────

function luminancia([r, g, b]) {
    const canal = (c) => {
        const s = c / 255;
        return s <= 0.03928 ? s / 12.92 : ((s + 0.055) / 1.055) ** 2.4;
    };
    return 0.2126 * canal(r) + 0.7152 * canal(g) + 0.0722 * canal(b);
}

function contraste(a, b) {
    const [x, y] = [luminancia(a), luminancia(b)].sort((p, q) => q - p);
    return (x + 0.05) / (y + 0.05);
}

module.exports = { hexParaRgb, lerTokens, capturarFaixa, espessuraDaLinha, contraste, luminancia };
