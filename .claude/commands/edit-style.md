---
description: Refatora grid do mosaico para células dentro da faixa de toque WCAG (44px–57.2px), trava em 6 colunas e adiciona :focus-visible e :active.
argument-hint: [descrição opcional]
---

# Tarefa: refatorar touch targets do mosaico (WCAG 2.5.5 / 2.4.7)

## Contexto

Leia @project/style.css e @project/feed.html para entender a arquitetura atual antes de qualquer coisa.

Esta tarefa é uma atualização do design system — as regras e convenções documentadas em @DESIGN.md **não precisam ser respeitadas**. O objetivo principal é encontrar a melhor solução para os requisitos abaixo, mesmo que isso implique divergir da arquitetura atual.

## Objetivo

Refatorar o grid do `.mosaico` e `.mosaico--navbar` para que cada célula respeite
a faixa de toque acessível do WCAG 2.5.5:

- Mínimo: 44px CSS
- Máximo: 44px + 30%
- Exceção até 440px: ao atingir 6 colunas, a grade trava nesse número — as células podem ultrapassar o teto de +30%, mas o tamanho máximo da célula deve ser definido como um teto fixo do mosaico. 6 colunas é o limite de colunas em viewports até 440px.
- Após 440px: sem limite de número de colunas — o `auto-fill` retoma e cria novas colunas livremente, mas o tamanho máximo de célula (teto do mosaico) deve ser mantido.
- Após 440px: a `nav.navbar` migra para a lateral esquerda e os itens passam a se organizar verticalmente, de cima para baixo — convertendo-se em uma navbar lateral, se mantendo fixa.

O `auto-fill` deve resolver as transições de coluna automaticamente dentro da faixa — exceto ao travar em 6 colunas e após 440px (onde retoma sem limite de colunas, mantendo o teto de célula). Em todos os casos e viewports, os blocos permanecem quadrados (1:1).

## O que adicionar

- **WCAG 2.4.7** — indicador de foco visível (`:focus-visible`) para teclado e switch access.
- Feedback de `:active` para confirmar o toque, com suporte a `prefers-reduced-motion`.

## Restrições

- Derive todos os valores dos tokens — nada hardcoded sem cálculo explícito.
- Mantenha valores em `rem`. Bordas de grade permanecem em `1px`.
- Altere `style.css` e `feed.html` no que for necessário — sem restrições.

## Processo esperado

1. Analise os arquivos atuais.
2. Calcule e descreva o plano (tokens, breakpoints, lógica do grid) antes de escrever qualquer código.
3. Aplique as mudanças.
4. Confirme no resumo o tamanho efetivo da célula nos viewports críticos: menor viewport suportado, cada transição de coluna e 440px.
