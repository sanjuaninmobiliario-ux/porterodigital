import { cfg, mensaje } from "../lib/config.mjs";
import { loadDeptos } from "../lib/store.mjs";
import { buildWhatsAppUrl } from "../../public/js/utils.js";
import { json, err, readJson } from "../lib/http.mjs";

// El teléfono NUNCA viaja en la lista pública: solo se entrega el enlace de WhatsApp de UN departamento por vez.
export default async (req) => {
  if (req.method !== "POST") return err(405, "Método no permitido.");
  const body = await readJson(req);
  const d = (await loadDeptos()).find((x) => x.id === body?.id);
  if (!d) return err(404, "Departamento no encontrado.");
  const url = buildWhatsAppUrl(d.telefono, mensaje(cfg().edificio, d.depto));
  if (!url) return err(422, "Este departamento no tiene un número válido.");
  return json({ url });
};

export const config = { path: "/api/contactar" };
