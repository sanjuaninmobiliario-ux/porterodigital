import { requireAuth } from "../lib/auth.mjs";
import { saveDeptos, seed } from "../lib/store.mjs";
import { json, err } from "../lib/http.mjs";

// Solo la cuenta demo puede restaurar los datos de ejemplo (el admin real nunca pierde datos por este camino).
export default async (req) => {
  if (req.method !== "POST") return err(405, "Método no permitido.");
  const user = requireAuth(req);
  if (!user) return err(401, "No autorizado.");
  if (user.role !== "demo") return err(403, "Solo disponible en modo demostración.");
  await saveDeptos(seed());
  return json({ ok: true });
};

export const config = { path: "/api/reset" };
