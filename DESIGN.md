# Design System — Mosaico

> Especificação **normativa** e auto-suficiente do Design System de mosaicos.
> Qualquer agente de IA deve conseguir reproduzir fielmente o layout a partir
> deste documento, **sem** ler os arquivos de `project/`. As palavras **DEVE**,
> **NUNCA** e **PODE** têm força de regra.

> **Nota de maturidade — documento em desenvolvimento.** Este Design System
> ainda está evoluindo junto com o protótipo. As regras acima têm força
> normativa para o estado **atual** do código, mas **não são imutáveis**: se
> uma feature futura exigir divergir de alguma regra aqui documentada, o
> agente responsável **PODE** fazê-lo — a condição é que a mudança de código
> venha acompanhada da atualização deste documento na mesma tarefa, para que
> ele nunca fique dessincronizado do que está realmente em produção. Regra
> desatualizada é pior que regra ausente: sinaliza confiança onde não deveria
> haver.

---

## 1. Princípio central

O Design System inteiro nasce de **um único componente**: uma grade (`grid`) de
células quadradas 1:1 separadas por linhas de 1px, sem bordas duplicadas. Todo o
resto — o mosaico de preenchimento e a navbar — é uma variação dessa mesma
base. **NUNCA** reimplemente a grade por baixo; sempre reaproveite as classes
`.mosaico` e `.mosaico__bloco`.

Duas invariantes governam tudo:

1. **Cada bloco é um quadrado perfeito** (`aspect-ratio: 1`), independente da
   largura da coluna.
2. **As linhas da grade têm exatamente 1px**, nunca 2px onde dois blocos se
   encostam — inclusive quando a divisória muda de orientação (vertical →
   horizontal na navbar em modo rail, ver seção 6).

Uma terceira camada, mais recente, governa o *tamanho* da célula em si:

3. **Toda célula DEVE respeitar a faixa de alvo de toque acessível (WCAG
   2.5.5)**: mínimo de 44px, com um teto de +30% (57.2px) fora de uma única
   janela de largura documentada como exceção (seção 4).

---

## 2. Tokens (custom properties)

Todos os valores DEVEM vir de tokens em `:root`. **NUNCA** use valores
hardcoded no corpo das regras (cores, medidas, z-index) sem que o próprio
token seja derivado por `calc()` de algo mensurável — um número mágico sem
cálculo explícito é tão ruim quanto um valor hardcoded espalhado pelo corpo
das regras. Fontes e espaçamentos DEVEM usar `rem`, nunca `px` — exceto a
linha de 1px das bordas, que é intencionalmente física.

```css
:root {
    --font-base: "Inter", system-ui, sans-serif;

    /* Cores — paleta escura única */
    --color-bg: #0d1420; /* ÚNICO background de toda a aplicação */
    --color-line: #2a3b59; /* linhas da grade */
    --color-text: #dfe7f2;
    --color-text-muted: #94a3ba;
    --color-accent: #7aa6e8; /* cor dos ícones e do anel de foco */

    /* Medidas */
    --font-size-base: 1rem;
    --icon-size: 1.25rem; /* fonte do ícone dentro do bloco, 20px */

    /* Faixa de alvo de toque (WCAG 2.5.5) — único piso com token próprio.
       O teto de +30% (44 × 1.3 = 57.2px) NÃO tem token: nada no código
       calcula com ele, ele só documenta por que o Regime B (seção 4) tem
       permissão de ultrapassá-lo. Declarar um token que nada usa seria um
       valor órfão — o número aparece em prosa onde é relevante. */
    --bloco-touch-min: 2.75rem; /* 44px — mínimo absoluto de alvo de toque */

    /* Respiro ao redor do ícone, DERIVADO do piso de toque (não do ícone):
       (44px − 20px) / 2 = 12px. É o maior padding que ainda cabe numa célula
       de 44px sem estourá-la — o pior caso, não uma média. */
    --bloco-padding: calc((var(--bloco-touch-min) - var(--icon-size)) / 2);

    /* Piso da coluna nos três regimes (seção 4). */
    --bloco-min: var(--bloco-touch-min);

    /* Número de colunas do Regime B — e, coincidentemente, a contagem fixa de
       itens da navbar. Um só token para os dois porque são o mesmo número
       por motivos diferentes (ver seção 6). */
    --lock-cols: 6;

    /* 440px — limite superior do Regime B e largura máxima da grade da
       navbar em modo faixa inferior. Acima disso o Regime C assume e a
       navbar vira rail lateral (seção 6). ATENÇÃO: media queries não aceitam
       var(), então o breakpoint de troca de regime (441px = 27.5625rem) é um
       literal separado nas regras — se este token mudar, os breakpoints em
       @media DEVEM ser recalculados manualmente. */
    --lock-viewport-max: 27.5rem;

    /* 56px — teto FIXO do Regime C, escolha deliberada de design, NÃO
       derivada de --bloco-touch-min × 1.3 (= 57.2px). É intencionalmente
       diferente do pico do Regime B (73.33px): a transição 440px→441px tem
       um salto visível de propósito. Reaproveitado em dois lugares: teto de
       célula do .mosaico em Regime C E espessura do rail lateral da navbar. */
    --bloco-max: 3.5rem;

    /* Safe areas (notch / Dynamic Island / home indicator no iOS;
       edge-to-edge no Chrome Android). Resolvem para 0px em telas sem essas
       áreas. O fallback 0px explícito é obrigatório: em navegadores sem
       suporte a env(), a variável inválida cai nesse valor em vez de
       invalidar a regra inteira. */
    --safe-area-top: env(safe-area-inset-top, 0px); /* consumido pela navbar em modo rail (seção 6) */
    --safe-area-bottom: env(safe-area-inset-bottom, 0px); /* consumido pela navbar em modo faixa e pelo <main> */
    --safe-area-left: env(safe-area-inset-left, 0px); /* consumido pela navbar em modo rail e pelo <main> */
    --safe-area-right: env(safe-area-inset-right, 0px); /* não consumido — ponto de extensão documentado */

    /* Camada dos elementos fixos/sticky acima do conteúdo que rola por baixo/ao lado. */
    --z-sticky: 10;
}
```

### Regra de derivação de `--bloco-min`

`--bloco-min` **DEVE** ser sempre `var(--bloco-touch-min)`. Isto é uma
**inversão** em relação a versões anteriores deste documento, que derivavam o
piso do conteúdo (`calc(--icon-size + --bloco-padding * 2)`). A acessibilidade
(44px) manda mais que o tamanho do ícone (20px): a derivação antiga vira
folga, não garantia — 44px de célula acomodam os 20px do glifo com 12px de
sobra por lado, então a garantia estrutural de "a coluna nunca corta o ícone"
continua valendo, só que por um caminho diferente.

### Regra de derivação de `--bloco-padding`

`--bloco-padding` **DEVE** ser sempre `calc((var(--bloco-touch-min) -
var(--icon-size)) / 2)`. **NUNCA** substitua por um número fixo maior que
isto — um padding maior que o respiro do piso de toque estouraria a célula
mínima de 44px e quebraria o quadrado.

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
- `-webkit-tap-highlight-color: transparent` remove o feedback nativo de
  toque. O sistema **DEVE** compensar isso explicitamente — ver seção 4.2.

---

## 4. A grade base — `.mosaico`

### 4.0 Os três regimes de largura

Diferente de versões anteriores (auto-fill único, sem teto), o `.mosaico`
agora atravessa três regimes conforme a viewport cresce, para manter toda
célula dentro da faixa de alvo de toque (44–57.2px) o máximo de tempo
possível:

| Regime | Viewport    | Comportamento                                          | Célula          |
| ------ | ----------- | ------------------------------------------------------- | --------------- |
| **A**  | `< 264px`   | `auto-fill` livre, sem teto explícito                    | 44,0 – 57,2px    |
| **B**  | `264–440px` | Trava em `--lock-cols` (6) colunas                       | 44,0 → 73,33px   |
| **C**  | `> 440px`   | Destrava; `auto-fill` retoma com teto FIXO `--bloco-max` | 56px (constante) |

```css
.mosaico {
    display: grid;
    /* Regime A: minmax(piso, 1fr) é auto-limitante. Com n colunas a célula
       mede W ÷ n, e n só troca quando W cruza um múltiplo de 44px — então a
       célula varia de 44px a (44 + 44/n)px. A partir de 4 colunas (176px) o
       intervalo inteiro já cabe em 44–57.2px: o teto emerge da mecânica do
       grid, não precisa ser imposto. */
    grid-template-columns: repeat(auto-fill, minmax(var(--bloco-min), 1fr));
    width: 100%;
    /* O container fecha as arestas de cima e da esquerda; cada bloco cuida
       da direita e de baixo. Resultado: linhas de 1px únicas em toda a grade,
       sem bordas duplicadas ao se encostarem. */
    border-top: 1px solid var(--color-line);
    border-left: 1px solid var(--color-line);
}

/* Regime B — trava em --lock-cols colunas: 264px a 440px. A largura cresce,
   o número de colunas não, então cada célula estica além do teto de +30% —
   a EXCEÇÃO que este sistema autoriza explicitamente, e só nesta janela. */
@media (min-width: 16.5rem) {
    .mosaico {
        grid-template-columns: repeat(var(--lock-cols), 1fr);
    }
}

/* Regime C — destrava acima de 440px. auto-fill retoma, mas com teto FIXO em
   --bloco-max: diferente do Regime A, aqui o máximo da minmax() é definido,
   então o auto-fill conta colunas usando esse teto — a célula assenta nele e
   para de crescer. A transição B→C (440px→441px) tem um salto visível e
   intencional (73.33px → 56px) — NÃO é uma invariante deste sistema que os
   dois regimes se conectem sem descontinuidade. */
@media (min-width: 27.5625rem) {
    .mosaico {
        grid-template-columns: repeat(auto-fill, minmax(var(--bloco-min), var(--bloco-max)));
    }
}
```

Em Regime C, como o máximo é um comprimento fixo (não `1fr`), a grade **NÃO**
estica para preencher a sobra: o excesso de largura fica como espaço vazio à
direita, ancorando o mosaico à esquerda — o mesmo padrão que a navbar em modo
faixa inferior já usa com `max-width`.

### 4.1 Por que `auto-fill` e NUNCA `auto-fit`

- `auto-fill` mantém as colunas vazias "fantasmas" reservando espaço, então cada
  coluna real conserva `--bloco-min` e o bloco continua quadrado.
- `auto-fit` colapsaria as colunas vazias e distribuiria a sobra via `1fr`,
  **esticando os blocos em retângulos** e quebrando a invariante 1:1.

**Regra:** o preenchimento automático de colunas nos Regimes A e C **DEVE**
usar `auto-fill`. **Exceção documentada:** o Regime B **DEVE** usar `repeat(n,
1fr)` com contagem fixa — ali a intenção é justamente travar o número de
colunas, não preenchê-las automaticamente; é a única contagem fixa permitida
fora da navbar.

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

### 4.3 Estados interativos (WCAG 2.4.7 e feedback de toque)

Escopados a `button.mosaico__bloco`, **NUNCA** a `.mosaico__bloco` genérico:
no mosaico de preenchimento os blocos são `<div>` decorativos, sem interação
nenhuma — aplicar foco ou feedback de toque a eles sugeriria clicabilidade que
não existe. Só botões reais (a navbar) recebem estes estados.

```css
button.mosaico__bloco:focus-visible {
    outline: 2px solid var(--color-accent);
    outline-offset: -2px; /* anel para DENTRO da célula — não engrossa a malha de 1px */
    position: relative; /* contexto para o z-index seguinte */
    z-index: 1; /* eleva o bloco focado para o anel não ser recortado pelos vizinhos */
}

button.mosaico__bloco {
    transition: opacity 0.1s ease; /* na base, não em :active, para animar entrada E saída */
}

@media (prefers-reduced-motion: reduce) {
    button.mosaico__bloco {
        transition: none; /* troca de opacidade instantânea, sem fade */
    }
}

button.mosaico__bloco:active {
    opacity: 0.7;
}
```

- `:focus-visible` (não `:focus`) é **obrigatório** — mantém o anel fora da
  navegação por mouse/toque, só aparecendo em teclado e switch access.
- `outline`, **NUNCA** `border`, para o indicador de foco — `border` alteraria
  a largura do box e romperia o `aspect-ratio: 1`.

### 4.4 A estratégia anti-borda-dupla (regra crítica)

Se cada bloco tivesse as 4 bordas, todo ponto de encontro entre dois blocos
somaria 1px + 1px = 2px, engrossando as linhas internas. A solução:

| Elemento          | Bordas que desenha               |
| ----------------- | --------------------------------- |
| `.mosaico`        | `border-top` + `border-left`      |
| `.mosaico__bloco` | `border-right` + `border-bottom`  |

Assim cada linha interna é desenhada por **um só** elemento. **NUNCA** dê as
quatro bordas ao bloco.

A navbar em modo rail lateral (seção 6) **rotaciona** esta estratégia em 90°:
a divisória entre itens empilhados passa a ser `border-bottom`, não
`border-right`. O princípio — uma única linha, um único dono — permanece
idêntico; só o eixo muda.

---

## 5. Uso A — Mosaico de preenchimento

Grade que preenche a largura com quantas colunas couberem, atravessando os
três regimes da seção 4.0. Cada célula é um `<div>` com um ícone. Use quantos
blocos quiser.

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
- Como os filhos são `<div>`, **NUNCA** aplique os estados de foco/toque da
  seção 4.3 a eles — esses estados são exclusivos de `<button>`.

---

## 6. Uso B — Navbar — `.navbar` + `.mosaico--navbar`

A navbar tem **dois elementos com papéis distintos**, e **duas orientações**
que trocam no mesmo limiar em que o `.mosaico` geral muda do Regime B para o
Regime C (441px = 27.5625rem):

- **Até 440px — modo faixa inferior**: `.navbar` é `position: fixed`, ocupa
  **100% da largura**, cola na base, e os 6 botões ficam em linha.
- **Acima de 440px — modo rail lateral**: `.navbar` vira uma faixa fixa e
  vertical, ancorada na borda esquerda, com os 6 botões empilhados de cima
  para baixo.

Em ambos os modos:

- **`.navbar`** é a **única** dona da moldura completa (`border` em
  `--color-line`), do fundo e das safe areas relevantes à orientação.
- **`.mosaico--navbar`** é a **grade de botões** aninhada no container.
  Reaproveita a lógica do `.mosaico` (blocos 1:1); a única troca é `auto-fill`
  → **`--lock-cols` (6) colunas fixas** — a navbar tem um número de itens
  definido pelo produto, não pelo espaço disponível.

A moldura externa é responsabilidade **exclusiva** do container. A grade
**DEVE** zerar as arestas que a duplicariam em cada orientação, preservando o
invariante de 1px por linha.

### 6.1 Modo faixa inferior (`≤ 440px`)

```css
.navbar {
    position: fixed;
    inset: auto 0 0 0; /* x=0 a x=100%, colado na base */
    z-index: var(--z-sticky);
    background: var(--color-bg);
    border: 1px solid var(--color-line); /* moldura completa; a grade não redesenha nenhuma das 4 arestas */
    padding-bottom: var(--safe-area-bottom); /* respeita o home indicator */
}

.mosaico--navbar {
    grid-template-columns: repeat(var(--lock-cols), 1fr);
    max-width: var(--lock-viewport-max); /* teto defensivo — ver nota abaixo */
    border-top: 0;
    border-left: 0;
}

.mosaico--navbar .mosaico__bloco {
    appearance: none;
    -webkit-appearance: none;
    background: none;
    color: inherit;
    font: inherit;
    cursor: pointer;
    border-top: 0;
    border-left: 0;
    border-bottom: 0; /* a base agora é a borda inferior do container */
}

/* A grade SEMPRE preenche exatamente o content box do container neste modo
   (nunca há folga — ver nota), então o border-right do último item visível
   é zerado incondicionalmente, sem media query de reativação. */
.mosaico--navbar .mosaico__bloco:last-child,
.mosaico--navbar .mosaico__bloco:nth-child(6) {
    border-right: 0;
}

.mosaico__bloco--mais {
    display: none; /* oculto enquanto os 6 itens cabem */
}
```

**Nota sobre `max-width` na grade:** este teto **NA PRÁTICA nunca chega a
engatar**. O container tem 1px de borda de cada lado, então seu content box
mede no máximo 440−2=438px enquanto permanece em modo faixa inferior — o modo
rail lateral assume exatamente em 441px, antes que a grade pudesse precisar
deste teto. Ele é mantido mesmo assim como blindagem defensiva e para
documentar a intenção — **NÃO remova** só porque parece inerte.

### 6.2 Modo rail lateral (`> 440px`)

```css
@media (min-width: 27.5625rem) {
    .navbar {
        inset: 0 auto 0 0; /* altura total, ancorado à esquerda */
        width: calc(var(--bloco-max) + 2px); /* célula (56px) + borda dos dois lados */
        padding-bottom: 0; /* não há mais base a reservar */
        padding-top: var(--safe-area-top);
        padding-left: var(--safe-area-left);
    }

    .mosaico--navbar {
        grid-template-columns: 1fr; /* uma coluna: itens empilham verticalmente */
    }

    .mosaico--navbar .mosaico__bloco {
        border-right: 0; /* sem vizinhos horizontais, nenhuma divisória vertical */
        border-bottom: 1px solid var(--color-line); /* divisória entre itens empilhados */
    }

    .mosaico--navbar .mosaico__bloco:last-child {
        border-bottom: 0; /* a borda inferior do rail já fecha esta aresta */
    }
}
```

**Limitação conhecida:** este modo não trata overflow por **altura**. Numa
janela larga porém baixa (ex.: 800×300px), os 6 itens empilhados podem não
caber verticalmente, e não há botão "mais" nem scroll interno tratando esse
caso — `.mosaico__bloco--mais` permanece `display: none` por herança, já que
o único gatilho que o revela é largura estreita (seção 7), não altura curta.
Um agente que precisar tratar isso **PODE** fazê-lo; esta seção deve ser
atualizada quando isso acontecer (ver nota de maturidade no topo).

### 6.3 HTML da navbar (contrato)

- Container: `<nav class="navbar" aria-label="...">` — funciona sem alteração
  nos dois modos; a troca é inteiramente via CSS.
- Dentro dele, a grade: `<div class="mosaico mosaico--navbar">`.
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

## 7. Comportamento responsivo da navbar (modo faixa inferior)

Diferente do `.mosaico` geral, a navbar não pode abrir colunas novas: a
contagem de itens é fixa em `--lock-cols` (6). Quando a largura não sustenta 6
células no piso de toque, reduzimos a contagem e revelamos o botão "mais"
como último item; o excedente fica oculto.

**Cálculo do limiar:** n colunas exigem `n × 44px` de trilhas, MAIS os 2px de
borda que o container consome de cada lado — a grade vive dentro do content
box do container, não do viewport bruto. Daí `n × 44px + 2px`, e o breakpoint
fica 1px abaixo disso:

| Viewport (`max-width`) | Colunas | Itens visíveis       | Cálculo do limiar          |
| ----------------------- | ------- | -------------------- | --------------------------- |
| (padrão, ≥ 266px)       | 6       | 6 itens (sem "mais") | `6 × 44 + 2 = 266px`        |
| `≤ 16.5625rem` (265px)  | 5       | 4 itens + "mais"     | `5 × 44 + 2 − 1 = 221px` (limiar seguinte) |
| `≤ 13.8125rem` (221px)  | 4       | 3 itens + "mais"     | `4 × 44 + 2 − 1 = 177px` (limiar seguinte) |
| `≤ 11.0625rem` (177px)  | 3       | 2 itens + "mais"     | último degrau                |

```css
/* < 266px → 5 colunas: 4 itens + mais */
@media (max-width: 16.5625rem) {
    .mosaico--navbar {
        grid-template-columns: repeat(5, 1fr);
    }
    .mosaico__bloco--mais {
        display: flex;
    }
    .mosaico--navbar .mosaico__bloco:nth-child(5),
    .mosaico--navbar .mosaico__bloco:nth-child(6) {
        display: none;
    }
}

/* < 222px → 4 colunas: 3 itens + mais */
@media (max-width: 13.8125rem) {
    .mosaico--navbar {
        grid-template-columns: repeat(4, 1fr);
    }
    .mosaico--navbar .mosaico__bloco:nth-child(4) {
        display: none;
    }
}

/* < 178px → 3 colunas: 2 itens + mais */
@media (max-width: 11.0625rem) {
    .mosaico--navbar {
        grid-template-columns: repeat(3, 1fr);
    }
    .mosaico--navbar .mosaico__bloco:nth-child(3) {
        display: none;
    }
}
```

**Regra da cascata:** os breakpoints DEVEM estar em ordem decrescente de
largura e os `display: none` DEVEM ser aditivos (cada limiar mais estreito
esconde mais um item, sem re-exibir os anteriores).

**Exceção documentada ao teto de +30%:** no último degrau (`≤ 11.0625rem`), no
seu limite superior (177px), a célula chega a **58,33px** — 1,13px acima do
teto de 57.2px. Entre 172px e 177px as duas restrições (piso de 44px, teto de
57.2px) ficam matematicamente insatisfazíveis ao mesmo tempo: 4 colunas
dariam ~43px (abaixo do piso), 3 colunas dão ~58px (acima do teto). A escolha
deliberada é honrar o piso de acessibilidade — só alcançável sob zoom extremo
de texto.

---

## 8. Reserva de espaço para o conteúdo rolável — `<main>`

### 8.1 Modo faixa inferior

A navbar é `fixed` (fora do fluxo) na base, então o conteúdo passaria por
baixo dela. Como os blocos são 1:1, a altura da navbar = largura de uma
coluna = largura da grade ÷ colunas. Como `padding-bottom` em `%` resolve
contra a **largura** do container, `100% / colunas` reproduz essa altura sem
JavaScript.

```css
main {
    padding-bottom: calc(min(100%, var(--lock-viewport-max)) / var(--lock-cols) + var(--safe-area-bottom));
}
@media (max-width: 16.5625rem) {
    main {
        padding-bottom: calc(100% / 5 + var(--safe-area-bottom));
    }
}
@media (max-width: 13.8125rem) {
    main {
        padding-bottom: calc(100% / 4 + var(--safe-area-bottom));
    }
}
@media (max-width: 11.0625rem) {
    main {
        padding-bottom: calc(100% / 3 + var(--safe-area-bottom));
    }
}
```

`min(100%, var(--lock-viewport-max))` reproduz o mesmo degrau que a grade da
navbar sofre ao travar em 440px: abaixo desse ponto a navbar ocupa 100% da
largura, acima ela congela. Sem o `min()`, a reserva usaria sempre os 73.33px
do pico, sobrando espaço morto em telas mais estreitas onde a navbar é menor
de fato. Os breakpoints DEVEM **espelhar** os da navbar (seção 7).

O erro residual desta fórmula é sempre pequeno (0,17–0,67px) e sempre **a
mais**, nunca a menos — vem de `<main>` não enxergar os 2px de borda do
container da navbar. Aceitável; **NUNCA** corrija tentando fazer `<main>`
"ver" a borda da navbar — isso acopla dois elementos que devem permanecer
independentes.

### 8.2 Modo rail lateral

Acima de 440px a reserva deixa de ser vertical (a navbar não ocupa mais a
base) e vira horizontal, do mesmo tamanho que a espessura do rail:

```css
@media (min-width: 27.5625rem) {
    main {
        padding-bottom: 0; /* cancela a reserva de rodapé herdada */
        padding-left: calc(var(--bloco-max) + 2px + var(--safe-area-left));
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

- [ ] Todos os valores vêm de tokens `:root`, derivados por `calc()` quando
      não são constantes de base; nenhum número mágico hardcoded no corpo.
- [ ] Fontes e espaçamentos em `rem`; só as bordas usam `1px`.
- [ ] `.mosaico` atravessa os três regimes (seção 4.0): auto-fill livre
      (< 264px), trava em 6 colunas (264–440px), auto-fill com teto fixo em
      `--bloco-max` (> 440px).
- [ ] Bordas: container faz top/left, bloco faz right/bottom — linhas de 1px
      únicas; na navbar em modo rail, a divisória rotaciona para
      border-bottom.
- [ ] Todo bloco é quadrado 1:1 (`aspect-ratio: 1` + `min-width/height: 0`).
- [ ] `button.mosaico__bloco` tem `:focus-visible` (outline, nunca border) e
      `:active` com transição respeitando `prefers-reduced-motion`; blocos
      `<div>` do mosaico de preenchimento NÃO recebem esses estados.
- [ ] `.navbar` em modo faixa inferior: fixa, 100% da largura, moldura
      completa, `padding-bottom` de safe area.
- [ ] `.navbar` em modo rail lateral (> 440px): fixa à esquerda, altura
      total, largura `--bloco-max + 2px`, itens empilhados verticalmente.
- [ ] Navbar: 6 botões + 1 "mais", cada um com `aria-label`.
- [ ] Breakpoints da navbar (16.5625rem / 13.8125rem / 11.0625rem) em ordem
      largo→estreito, `display: none` aditivos.
- [ ] `<main>` reserva espaço espelhando os breakpoints da navbar —
      `padding-bottom` em modo faixa inferior, `padding-left` em modo rail.
- [ ] `<head>` com `viewport-fit=cover` e `theme-color` = `--color-bg`.
