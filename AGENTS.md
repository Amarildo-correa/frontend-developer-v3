# AGENTS

Instruções para agentes de IA que atuam neste repositório.

## Objetivo

Desenvolver protótipos de frontend **mobile-first**, baseados em grid, utilizando exclusivamente HTML e CSS puros.

## Recursos

- Utilizar `--font-base` como fonte padrão em toda a interface.
- Quando necessário, utilizar Bootstrap Icons via `<i class="bi bi-*"></i>`; customizações (cor, tamanho) devem ser feitas em CSS, sempre com tokens (ex.: `color: var(--color-accent)`), nunca com estilo inline.

## Regras

- Todos os arquivos `.html` DEVEM compartilhar exclusivamente os estilos definidos em `@project/css`.
- NÃO utilizar gradientes (`linear-gradient`, `radial-gradient`, `conic-gradient` ou equivalentes).
- NÃO utilizar shadows
- NÃO definir `background`, `background-color` ou qualquer cor de fundo em elementos de superfície (`surface`). A cor do fundo sempre será `--color-bg`, por isso todos elementos haverá bordas (linhas) para separar os elementos.
- NÃO utilizar sombras (`box-shadow`, `filter: drop-shadow()` ou equivalentes).
- NÃO utilizar cantos arredondados (`border-radius`). Todos os componentes DEVEM possuir cantos retos (`border-radius: 0`).
