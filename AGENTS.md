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
- Grade e blocos DEVEM reaproveitar as classes `.mosaico` e `.mosaico__bloco`. NUNCA reimplementar a grade por baixo. Ver `DESIGN.md` para o contrato completo.
- Colunas com preenchimento automático DEVEM usar `auto-fill`, NUNCA `auto-fit` (auto-fit estica os blocos em retângulos e quebra a proporção 1:1).
- Bordas da grade seguem a estratégia anti-duplicação: o container (`.mosaico`) desenha `top`/`left`; cada bloco (`.mosaico__bloco`) desenha `right`/`bottom`. NUNCA aplicar as quatro bordas ao bloco.
- Altura de viewport DEVE usar `100dvh`, NUNCA `100vh` (que não desconta a barra de endereço móvel e causa saltos de layout).
- Botões representados apenas por ícone DEVEM ter `aria-label` descritivo; o `<i class="bi ...">` sozinho não é acessível.
- O `<head>` DEVE incluir `viewport-fit=cover` (habilita `env(safe-area-inset-*)`) e `theme-color` igual a `--color-bg`. Ver seção 9 do `DESIGN.md`.

## Design System (`DESIGN.md`)

O Design System ainda está em evolução. À medida que o protótipo é desenvolvido, validado e refinado, o [`DESIGN.md`](DESIGN.md) DEVE ser atualizado para refletir as decisões consolidadas.

Os agentes de IA DEVEM utilizar o `DESIGN.md` como fonte de referência para compreender o Design System, revisar implementações, propor melhorias, identificar inconsistências e orientar novas implementações de frontend.

As diretrizes já documentadas DEVEM ser respeitadas. Entretanto, quando um agente identificar uma alternativa tecnicamente superior, mais consistente ou mais escalável, ele PODE propor alterações e atualizar o `DESIGN.md`, desde que preserve a coerência, a padronização e a evolução do Design System.
