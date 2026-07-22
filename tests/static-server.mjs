// Servidor estático mínimo, SEM dependências, usado pelo `webServer` do
// Playwright para servir a pasta `project/` durante os testes. Node puro
// (>=18) — nada a instalar além do próprio Node.
//
// Por que um servidor próprio em vez de `http-server`/`serve`: evita mais uma
// dependência de rede, torna os testes reproduzíveis offline e permite forçar
// `Cache-Control: no-store` — essencial para que cada execução leia o CSS/HTML
// atual do disco, nunca uma versão em cache (o navegador NÃO revalida o
// `style.css` linkado sem query, então sem isto uma edição recente passaria
// despercebida nos testes).
import { createServer } from "node:http";
import { readFile } from "node:fs/promises";
import { extname, join, normalize, sep } from "node:path";
import { fileURLToPath } from "node:url";

const ROOT = fileURLToPath(new URL("../project/", import.meta.url));
const PORT = Number(process.env.PORT ?? 4173);

// Tipos MIME dos artefatos servidos hoje. Ampliar aqui se o protótipo passar a
// usar outros formatos (fontes locais, imagens, etc.).
const MIME = {
    ".html": "text/html; charset=utf-8",
    ".css": "text/css; charset=utf-8",
    ".js": "text/javascript; charset=utf-8",
    ".mjs": "text/javascript; charset=utf-8",
    ".svg": "image/svg+xml",
    ".png": "image/png",
    ".jpg": "image/jpeg",
    ".webp": "image/webp",
    ".woff2": "font/woff2",
    ".json": "application/json; charset=utf-8",
};

const server = createServer(async (req, res) => {
    const { pathname } = new URL(req.url, "http://localhost");
    // Normaliza e neutraliza travessia de diretório (`../`) antes de resolver.
    let rel = normalize(decodeURIComponent(pathname)).replace(/^([/\\]|\.\.[/\\])+/, "");
    if (rel === "" || rel.endsWith(sep) || rel.endsWith("/")) rel += "index.html";

    const file = join(ROOT, rel);
    // Defesa em profundidade: recusa qualquer caminho que escape da raiz.
    if (!file.startsWith(ROOT)) {
        res.writeHead(403).end("Forbidden");
        return;
    }

    try {
        const data = await readFile(file);
        res.writeHead(200, {
            "content-type": MIME[extname(file).toLowerCase()] ?? "application/octet-stream",
            "cache-control": "no-store",
        });
        res.end(data);
    } catch {
        res.writeHead(404, { "content-type": "text/plain; charset=utf-8" }).end("Not found");
    }
});

server.listen(PORT, () => {
    console.log(`static-server: http://127.0.0.1:${PORT}/ (raiz: ${ROOT})`);
});
