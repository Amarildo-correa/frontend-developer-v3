---
description: Commit e push direto na main
argument-hint: [descrição opcional]
---

Seu objetivo é enviar o estado atual do repositório direto para `origin/main`, sem branch intermediária nem PR.

Contexto adicional fornecido pelo usuário (pode estar vazio): $ARGUMENTS

Siga estes passos, em ordem:

1. **Diagnóstico**: rode `git status` e `git diff` (staged e unstaged) para ver o que será enviado. Confirme que a branch atual é `main`.
2. **Commit**: se houver alterações não commitadas, revise o que será incluído e crie um commit com mensagem clara focada no "porquê". Não inclua arquivos que pareçam segredos/credenciais.
3. **Push**: envie para `origin main`.
4. Ao final, confirme o hash do commit e que o push foi concluído.

Regras importantes:

- Nunca faça `push --force` ou pule hooks (`--no-verify`).
- Se não houver nenhuma alteração (staged, unstaged ou já commitada à frente de `origin/main`), avise o usuário em vez de criar um commit vazio.
