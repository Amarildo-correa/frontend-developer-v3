# Design System — Mosaico

> Especificação **normativa** e auto-suficiente do Design System de mosaicos.
> Qualquer agente de IA deve conseguir reproduzir fielmente o layout a partir
> deste documento, **sem** ler os arquivos de `project/`. As palavras **DEVE**,
> **NUNCA** e **PODE** têm força de regra.

---

## 1. Princípio central

O Design System inteiro nasce de **um único componente**: uma grade (`grid`) de
células quadradas 1:1 separadas por linhas de 1px, sem bordas duplicadas. Todo o
resto — o mosaico de preenchimento e a navbar inferior — é uma variação dessa
mesma base. **NUNCA** reimplemente a grade por baixo; sempre reaproveite as
classes `.mosaico` e `.mosaico__bloco`.

Duas invariantes governam tudo:

1. **Cada bloco é um quadrado perfeito** (`aspect-ratio: 1`), independente da
   largura da coluna.
2. **As linhas da grade têm exatamente 1px**, nunca 2px onde dois blocos se
   encostam.

---

## 2. Tokens (custom properties)

Todos os valores DEVEM vir de tokens em `:root`. **NUNCA** use valores
hardcoded no corpo das regras (cores, medidas, z-index). Fontes e espaçamentos
DEVEM usar `rem`, nunca `px` — exceto a linha de 1px das bordas, que é
intencionalmente física.

```css
:root {
    --font-base: "Inter", system-ui, sans-serif;

    /* Cores — paleta escura única */
    --color-bg: #0d1420; /* ÚNICO background de toda a aplicação */
    --color-line: #2a3b59; /* linhas da grade */
    --color-text: #dfe7f2;
    --color-text-muted: #94a3ba;
    --color-accent: #7aa6e8; /* cor dos ícones */

    /* Medidas */
    --font-size-base: 1rem;
    --icon-size: 1.25rem; /* fonte do ícone dentro do bloco */
    --bloco-padding: 1.5rem; /* respiro ao redor do ícone */

    /* Largura mínima da célula = ícone + respiro dos dois lados.
       DERIVADA (não hardcoded): garante que o quadrado nunca fique menor
       que o conteúdo. Se --icon-size ou --bloco-padding mudarem, o mínimo
       se reajusta sozinho. */
    --bloco-min: calc(var(--icon-size) + var(--bloco-padding) * 2); /* = 4.25rem */

    /* Largura máxima da navbar = maior smartphone atual
       (iPhone 16 Pro Max = 440px = 27.5rem). Acima disso a navbar para de
       esticar e ancora à esquerda, evitando uma barra gigante no desktop. */
    --navbar-max: 27.5rem;

    /* Safe areas (notch / Dynamic Island / home indicator no iOS;
       edge-to-edge no Chrome Android). Resolvem para 0px em telas sem essas
       áreas. O fallback 0px explícito é obrigatório: em navegadores sem
       suporte a env(), a variável inválida cai nesse valor em vez de
       invalidar a regra inteira. */
    --safe-area-top: env(safe-area-inset-top, 0px);
    --safe-area-bottom: env(safe-area-inset-bottom, 0px);
    --safe-area-left: env(safe-area-inset-left, 0px);
    --safe-area-right: env(safe-area-inset-right, 0px);

    /* Camada dos elementos fixos/sticky acima do conteúdo que rola por baixo. */
    --z-sticky: 10;
}
```

### Regra de derivação de `--bloco-min`

`--bloco-min` **DEVE** ser sempre `calc(var(--icon-size) + var(--bloco-padding) * 2)`.
É a garantia estrutural de que a coluna nunca corta o ícone. **NUNCA** substitua
por um número fixo.

---

## 3. Reset

```css
*,
*::before,
*::after {
    box-sizing: border-box; /* padding/borda contam DENTRO da largura */
    margin: 0;
    padding: 0;
    -webkit-tap-highlight-color: transparent; /* remove flash azul no toque mobile */
}

html,
body {
    background: var(--color-bg); /* fundo único em toda a aplicação */
    min-height: 100dvh; /* dvh acompanha a barra dinâmica do mobile */
    overflow-x: hidden; /* nenhuma rolagem horizontal jamais */
}
```

- `box-sizing: border-box` é **obrigatório**: sem ele, o padding do bloco somaria
  à largura da coluna e quebraria o cálculo do quadrado.
- Use `100dvh` (dynamic viewport height), **nunca** `100vh` — `vh` não desconta a
  barra de endereço móvel e gera saltos de layout.

---

## 4. A grade base — `.mosaico`

```css
.mosaico {
    display: grid;
    /* auto-fill cria QUANTAS colunas couberem respeitando --bloco-min.
       minmax(--bloco-min, 1fr): cada coluna tem no mínimo --bloco-min e no
       máximo uma fração igual do espaço livre. */
    grid-template-columns: repeat(auto-fill, minmax(var(--bloco-min), 1fr));
    width: 100%;
    /* Estratégia de bordas sem duplicação: o CONTAINER fecha as arestas de
       cima e da esquerda; cada BLOCO fecha a direita e a de baixo. Resultado:
       linhas de 1px únicas em toda a grade. */
    border-top: 1px solid var(--color-line);
    border-left: 1px solid var(--color-line);
}
```

### 4.1 Por que `auto-fill` e NUNCA `auto-fit`

- `auto-fill` mantém as colunas vazias "fantasmas" reservando espaço, então cada
  coluna real conserva `--bloco-min` e o bloco continua quadrado.
- `auto-fit` colapsaria as colunas vazias e distribuiria a sobra via `1fr`,
  **esticando os blocos em retângulos** e quebrando a invariante 1:1.

**Regra:** o preenchimento automático de colunas **DEVE** usar `auto-fill`.

### 4.2 O bloco — `.mosaico__bloco`

```css
.mosaico__bloco {
    aspect-ratio: 1; /* altura = largura da coluna → quadrado 1:1 */
    /* Zera o mínimo automático do item de grid (min-width/height: auto =
       min-content). Sem isto, o arredondamento do 1fr pode fazer o conteúdo
       empurrar a célula e quebrar o quadrado. Assim o aspect-ratio sempre vence. */
    min-width: 0;
    min-height: 0;
    display: flex; /* centraliza o ícone nos dois eixos */
    align-items: center;
    justify-content: center;
    padding: var(--bloco-padding);
    /* Só direita + inferior: a esquerda/topo vêm do vizinho anterior (ou do
       container, na primeira coluna/linha). É a metade da estratégia anti-borda-dupla. */
    border-right: 1px solid var(--color-line);
    border-bottom: 1px solid var(--color-line);
}

.mosaico__bloco .bi {
    color: var(--color-accent);
    font-size: var(--icon-size); /* consome o mesmo token da coluna */
}
```

### 4.3 A estratégia anti-borda-dupla (regra crítica)

Se cada bloco tivesse as 4 bordas, todo ponto de encontro entre dois blocos
somaria 1px + 1px = 2px, engrossando as linhas internas. A solução:

| Elemento          | Bordas que desenha               |
| ----------------- | -------------------------------- |
| `.mosaico`        | `border-top` + `border-left`     |
| `.mosaico__bloco` | `border-right` + `border-bottom` |

Assim cada linha interna é desenhada por **um só** elemento. **NUNCA** dê as
quatro bordas ao bloco.

---

## 5. Uso A — Mosaico de preenchimento

Grade que preenche a largura com quantas colunas couberem. Cada célula é um
`<div>` com um ícone. Use quantos blocos quiser.

```html
<section class="mosaico">
    <div class="mosaico__bloco"><i class="bi bi-globe"></i></div>
    <div class="mosaico__bloco"><i class="bi bi-globe"></i></div>
    <!-- ...repita à vontade... -->
</section>
```

- O container **DEVE** ser um elemento de bloco (`<section>`) com apenas
  `.mosaico`.
- Cada filho **DEVE** ser `.mosaico__bloco` contendo um único ícone.

---

## 6. Uso B — Navbar inferior fixa — `.navbar` + `.mosaico--navbar`

A navbar tem **dois elementos com papéis distintos**:

- **`.navbar`** → a **faixa**: `position: fixed`, ocupa **100% da largura** e é a
  **única** dona da moldura completa (`border` em `--color-line`), do fundo e da
  safe area.
- **`.mosaico--navbar`** → a **grade de botões** aninhada na faixa. Reaproveita
  **toda** a lógica de grid do `.mosaico` (mesmos tokens, blocos 1:1, breakpoints);
  a única troca é `auto-fill` → **6 colunas fixas**. Fica limitada a `--navbar-max`
  à esquerda e só contribui as **divisórias verticais** entre botões.

A moldura externa é responsabilidade **exclusiva** da faixa. A grade **DEVE** zerar
`border-top`/`border-left` (que herda do `.mosaico`) e os botões **DEVEM** zerar
`border-bottom`, para não sobrepor as linhas da faixa — preservando a invariante de
1px por linha.

```css
.navbar {
    position: fixed;
    /* Estica de x=0 a x=100% (right: 0) e cola na base; visível durante o scroll.
       A moldura vai de ponta a ponta mesmo com os botões só à esquerda. */
    inset: auto 0 0 0;
    z-index: var(--z-sticky);
    background: var(--color-bg);
    /* Moldura completa de 1px; a grade interna não redesenha nenhuma das 4
       arestas, então cada linha continua com 1px único. */
    border: 1px solid var(--color-line);
    /* Respeita o home indicator: a faixa da safe area recebe --color-bg em vez
       de sobrepor os botões. */
    padding-bottom: var(--safe-area-bottom);
}

/* Grade de botões: reaproveita o grid do .mosaico e os breakpoints; ancorada à
   esquerda pelo max-width. */
.mosaico--navbar {
    grid-template-columns: repeat(6, 1fr);
    max-width: var(--navbar-max); /* para de esticar no maior smartphone */
    /* A moldura externa vem da .navbar; zera as arestas herdadas do .mosaico. */
    border-top: 0;
    border-left: 0;
}

/* Os botões reaproveitam .mosaico__bloco; aqui só neutralizamos a aparência
   nativa do <button>, preservando a borda direita (divisória entre botões). */
.mosaico--navbar .mosaico__bloco {
    appearance: none;
    -webkit-appearance: none;
    background: none;
    color: inherit;
    font: inherit;
    cursor: pointer;
    border-top: 0; /* faixa de 1 só linha: sem vizinho acima/à esquerda */
    border-left: 0;
    border-bottom: 0; /* a base agora é a borda inferior da .navbar */
}

/* Botão de overflow ("mais"): oculto enquanto os 6 itens cabem. */
.mosaico__bloco--mais {
    display: none;
}
```

### 6.1 HTML da navbar (contrato)

- Faixa externa: `<nav class="navbar" aria-label="...">`.
- Dentro dela, a grade: `<div class="mosaico mosaico--navbar">` (é o `<div>` que
  leva as classes de grade, **não** o `<nav>`).
- Cada item DEVE ser um `<button type="button">` com `.mosaico__bloco` e um
  `aria-label` descritivo (o ícone sozinho não é acessível).
- O **último** botão DEVE ser o overflow: `.mosaico__bloco .mosaico__bloco--mais`
  com o ícone `bi-three-dots-vertical`.
- **6 itens de navegação + 1 botão "mais"** = 7 filhos da grade no total.

```html
<nav class="navbar" aria-label="Navegação principal">
    <div class="mosaico mosaico--navbar">
        <button type="button" class="mosaico__bloco" aria-label="Início">
            <i class="bi bi-house"></i>
        </button>
        <!-- Buscar, Explorar, Notificações, Mensagens, Perfil (6 itens no total) -->
        <button type="button" class="mosaico__bloco mosaico__bloco--mais" aria-label="Mais opções">
            <i class="bi bi-three-dots-vertical"></i>
        </button>
    </div>
</nav>
```

---

## 7. Comportamento responsivo da navbar

6 colunas exigem `6 × --bloco-min` = `6 × 4.25rem` = **25.5rem**. Quando a
viewport não comporta esse mínimo, reduzimos as colunas para quantas cabem e
revelamos o botão "mais" como último item; o excedente fica oculto.

Cada breakpoint = `n × 4.25rem − 1px`, na ordem **largo → estreito** (o mais
estreito vence a cascata; os `display: none` são **aditivos**). 1px = 0.0625rem,
por isso os limiares terminam em `.9375`, `.4375`, etc.

| Viewport (`max-width`) | Colunas | Itens visíveis       | Cálculo do limiar           |
| ---------------------- | ------- | -------------------- | --------------------------- |
| (padrão, ≥ 25.5rem)    | 6       | 6 itens (sem "mais") | `6 × 4.25 = 25.5rem`        |
| `< 25.4375rem`         | 5       | 4 itens + "mais"     | `25.5rem − 1px`             |
| `< 21.1875rem`         | 4       | 3 itens + "mais"     | `21.25rem − 1px` (= 5×4.25) |
| `< 16.9375rem`         | 3       | 2 itens + "mais"     | `17rem − 1px` (= 4×4.25)    |

```css
/* < 25.5rem → 5 colunas: 4 itens + mais */
@media (max-width: 25.4375rem) {
    .mosaico--navbar {
        grid-template-columns: repeat(5, 1fr);
    }
    .mosaico__bloco--mais {
        display: flex;
    } /* revela o "mais" */
    .mosaico--navbar .mosaico__bloco:nth-child(5),
    .mosaico--navbar .mosaico__bloco:nth-child(6) {
        display: none;
    }
}

/* < 21.25rem → 4 colunas: 3 itens + mais */
@media (max-width: 21.1875rem) {
    .mosaico--navbar {
        grid-template-columns: repeat(4, 1fr);
    }
    .mosaico--navbar .mosaico__bloco:nth-child(4) {
        display: none;
    }
}

/* < 17rem → 3 colunas: 2 itens + mais */
@media (max-width: 16.9375rem) {
    .mosaico--navbar {
        grid-template-columns: repeat(3, 1fr);
    }
    .mosaico--navbar .mosaico__bloco:nth-child(3) {
        display: none;
    }
}
```

**Regra da cascata:** os breakpoints DEVEM estar em ordem decrescente de largura
e os `display: none` DEVEM ser aditivos (cada limiar mais estreito esconde mais
um item, sem re-exibir os anteriores).

---

## 8. Reserva de espaço para o conteúdo rolável — `<main>`

A navbar é `fixed` (fora do fluxo), então o conteúdo passaria por baixo dela. O
`<main>` DEVE reservar, no rodapé, a altura exata da navbar mais a safe area.

**Truque:** a altura da navbar = largura de uma coluna (blocos 1:1) = largura
total ÷ colunas. Como `padding-bottom` em `%` resolve contra a **largura** do
container, `100% / colunas` reproduz exatamente a altura de um bloco. Acima do
limiar a navbar tem largura fixa (`--navbar-max`), então a altura é
`--navbar-max ÷ 6`.

Os breakpoints DEVEM **espelhar** os da navbar (mesmos limiares).

```html
<main></main>
<!-- a navbar vem depois -->
```

```css
main {
    padding-bottom: calc(var(--navbar-max) / 6 + var(--safe-area-bottom));
}
@media (max-width: 25.4375rem) {
    main {
        padding-bottom: calc(100% / 5 + var(--safe-area-bottom));
    }
}
@media (max-width: 21.1875rem) {
    main {
        padding-bottom: calc(100% / 4 + var(--safe-area-bottom));
    }
}
@media (max-width: 16.9375rem) {
    main {
        padding-bottom: calc(100% / 3 + var(--safe-area-bottom));
    }
}
```

---

## 9. `<head>` obrigatório (integração mobile)

Para as safe areas e a integração com as barras do sistema funcionarem, o
`<head>` DEVE conter:

```html
<!-- viewport-fit=cover habilita env(safe-area-inset-*) -->
<meta name="viewport" content="width=device-width, initial-scale=1, viewport-fit=cover" />
<!-- Chrome Android — pinta a barra do navegador com o fundo da app -->
<meta name="theme-color" content="#0d1420" />
<!-- iOS Safari — status bar translúcida (requer viewport-fit=cover) -->
<meta name="apple-mobile-web-app-capable" content="yes" />
<meta name="apple-mobile-web-app-status-bar-style" content="black-translucent" />
```

- `viewport-fit=cover` é **obrigatório** — sem ele `env(safe-area-inset-*)`
  resolve sempre para 0 e o notch/home indicator sobrepõe o conteúdo.
- `theme-color` DEVE ser igual a `--color-bg` (`#0d1420`).

---

## 10. Checklist de conformidade

Ao reproduzir o Design System, o resultado está correto se:

- [ ] Todos os valores vêm de tokens `:root`; nenhum valor hardcoded no corpo.
- [ ] Fontes e espaçamentos em `rem`; só as bordas usam `1px`.
- [ ] `.mosaico` usa `auto-fill` (nunca `auto-fit`) + `minmax(--bloco-min, 1fr)`.
- [ ] Bordas: container faz top/left, bloco faz right/bottom — linhas de 1px únicas.
- [ ] Todo bloco é quadrado 1:1 (`aspect-ratio: 1` + `min-width/height: 0`).
- [ ] Faixa `.navbar` fixa, 100% da largura, com a moldura completa (`border` em `--color-line`).
- [ ] Grade `.mosaico .mosaico--navbar` aninhada na faixa, 6 colunas, `max-width: --navbar-max`, zerando top/left; botões zeram `border-bottom`.
- [ ] Navbar: 6 botões + 1 "mais", cada um com `aria-label`.
- [ ] Breakpoints da navbar em ordem largo→estreito, `display: none` aditivos.
- [ ] `<main>` reserva `padding-bottom` espelhando os breakpoints da navbar.
- [ ] `<head>` com `viewport-fit=cover` e `theme-color` = `--color-bg`.
