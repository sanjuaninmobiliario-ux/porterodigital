import { cfg, DEMO_PHONE } from "../lib/config.mjs";
import { requireAuth } from "../lib/auth.mjs";
import { loadDeptos, saveDeptos, ordenar } from "../lib/store.mjs";
import { validarDepto, MAX_DEPTOS } from "../lib/validate.mjs";
import { json, err, readJson } from "../lib/http.mjs";

const dup = (list, depto, exceptId) =>
  list.some((d) => d.id !== exceptId && d.depto.toLowerCase() === depto.toLowerCase());

export default async (req) => {
  const url = new URL(req.url);
  const id = url.pathname.split("/")[3] || null; // /api/deptos/:id
  const edificio = cfg().edificio;

  /* ---- Público: lista SIN teléfonos ---- */
  if (req.method === "GET" && url.searchParams.get("full") !== "1") {
    const list = ordenar(await loadDeptos()).map(({ id, depto, familia }) => ({ id, depto, familia }));
    return json({ edificio, deptos: list });
  }

  /* ---- Todo lo demás exige sesión ---- */
  const user = requireAuth(req);
  if (!user) return err(401, "No autorizado.");

  if (req.method === "GET") return json({ edificio, role: user.role, deptos: ordenar(await loadDeptos()) });

  const forced = user.role === "demo" ? DEMO_PHONE : undefined; // la demo siempre usa el WhatsApp de pruebas
  const list = await loadDeptos();

  if (req.method === "POST" && !id) {
    if (list.length >= MAX_DEPTOS) return err(409, `Máximo ${MAX_DEPTOS} departamentos.`);
    const v = validarDepto(await readJson(req), forced);
    if (v.error) return err(400, v.error);
    if (dup(list, v.value.depto)) return err(409, `Ya existe el departamento "${v.value.depto}".`);
    const item = { id: crypto.randomUUID(), ...v.value };
    await saveDeptos([...list, item]);
    return json(item, 201);
  }

  if (req.method === "PUT" && id) {
    const i = list.findIndex((d) => d.id === id);
    if (i < 0) return err(404, "No encontrado.");
    const v = validarDepto(await readJson(req), forced);
    if (v.error) return err(400, v.error);
    if (dup(list, v.value.depto, id)) return err(409, `Ya existe el departamento "${v.value.depto}".`);
    list[i] = { id, ...v.value };
    await saveDeptos(list);
    return json(list[i]);
  }

  if (req.method === "DELETE" && id) {
    if (!list.some((d) => d.id === id)) return err(404, "No encontrado.");
    await saveDeptos(list.filter((d) => d.id !== id));
    return json({ ok: true });
  }

  return err(405, "Método no permitido.");
};

export const config = { path: ["/api/deptos", "/api/deptos/:id"] };
