import { cfg } from "../lib/config.mjs";
import { authenticate, sign, TTL } from "../lib/auth.mjs";
import { json, err, readJson, sleep } from "../lib/http.mjs";

export default async (req) => {
  const c = cfg();
  if (req.method === "GET") {
    // Datos de la cuenta de demostración (públicos a propósito: es un prototipo para que el visitante pruebe)
    return json({ demo: c.demoEnabled ? { email: c.demoEmail, password: c.demoPassword } : null });
  }
  if (req.method !== "POST") return err(405, "Método no permitido");

  const body = await readJson(req);
  const user = authenticate(body?.email, body?.password);
  if (!user) { await sleep(700); return err(401, "Correo o contraseña incorrectos."); } // frena fuerza bruta
  const token = sign({ role: user.role, email: user.email }, TTL[user.role]);
  return json({ token, role: user.role, email: user.email });
};

export const config = { path: "/api/login" };
