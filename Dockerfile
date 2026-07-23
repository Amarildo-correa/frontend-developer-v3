# Imagem só de ferramental: Node + Playwright (browsers + deps de SO).
# O conteúdo do repositório (project/, tests/, playwright.config.js) entra
# em runtime via bind mount (ver docker-compose.yml) — não é copiado aqui.
FROM node:24-bookworm-slim

WORKDIR /app

COPY package.json package-lock.json ./
RUN npm ci

RUN npx playwright install --with-deps chromium firefox webkit

CMD ["npm", "test"]
