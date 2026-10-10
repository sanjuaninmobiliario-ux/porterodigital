// Servidor local de pruebas: sirve /public y enruta /api/* a las mismas funciones de Netlify,
// con una base en memoria. Uso: node tests/dev-server.mjs   (o `netlify dev` si tiene Netlify CLI)
import http from "node:http";
import { readFile } from "node:fs/promises";
import { extname, join, normalize } from "node:path";
import { fileURLToPath } from "node:url";
import { setStoreForTests } from "../netlify/lib/store.mjs";
import login from "../netlify/functions/login.mjs";
import deptos from "../netlify/functions/deptos.mjs";
import contactar from "../netlify/functions/contactar.mjs";
import reset from "../netlify/functions/reset.mjs";

const mem = new Map();
setStoreForTests({ get: async (k) => mem.get(k) ?? null, setJSON: async (k, v) => mem.set(k, structuredClone(v)) });
process.env.JWT_SECRET ??= "dev-secret";

const PUBLIC = fileURLToPath(new URL("../public/", import.meta.url));
const MIME = { ".html": "text/html; charset=utf-8", ".js": "text/javascript", ".css": "text/css", ".png": "image/png" };
const routes = [["/api/login", login], ["/api/deptos", deptos], ["/api/contactar", contactar], ["/api/reset", reset]];

http.createServer(async (req, res) => {
  const url = new URL(req.url, "http://localhost");
  const route = routes.find(([p]) => url.pathname === p || url.pathname.startsWith(p + "/"));
  if (route) {
    const chunks = []; for await (const c of req) chunks.push(c);
    const body = chunks.length && !["GET", "HEAD"].includes(req.method) ? Buffer.concat(chunks) : undefined;
    const r = await route[1](new Request(url, { method: req.method, headers: req.headers, body }));
    res.writeHead(r.status, Object.fromEntries(r.headers));
    return res.end(Buffer.from(await r.arrayBuffer()));
  }
  try {
    let p = url.pathname === "/" ? "/index.html" : url.pathname === "/admin" ? "/admin.html" : url.pathname;
    const file = join(PUBLIC, normalize(p).replace(/^(\.\.[/\\])+/, ""));
    const data = await readFile(file);
    res.writeHead(200, { "Content-Type": MIME[extname(file)] || "application/octet-stream" });
    res.end(data);
  } catch { res.writeHead(404); res.end("404"); }
}).listen(Number(process.env.PORT) || 8766, () => console.log("Portero en http://localhost:" + (process.env.PORT || 8766)));
