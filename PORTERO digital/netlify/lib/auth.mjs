import { createHmac, createHash, timingSafeEqual } from "node:crypto";
import { cfg } from "./config.mjs";

// Sin JWT_SECRET solo funciona el modo demo (con un secreto fijo); el rol "admin" exige un secreto real.
const FALLBACK_SECRET = "portero-solo-demo";
const secret = () => cfg().secret || FALLBACK_SECRET;
const mac = (body) => createHmac("sha256", secret()).update(body).digest("base64url");

export function sign(payload, ttlSeconds) {
  const body = Buffer.from(JSON.stringify({ ...payload, exp: Math.floor(Date.now() / 1000) + ttlSeconds })).toString("base64url");
  return `${body}.${mac(body)}`;
}

export function verify(token) {
  if (typeof token !== "string") return null;
  const [body, sig] = token.split(".");
  if (!body || !sig) return null;
  const a = Buffer.from(sig), b = Buffer.from(mac(body));
  if (a.length !== b.length || !timingSafeEqual(a, b)) return null;
  let p;
  try { p = JSON.parse(Buffer.from(body, "base64url").toString()); } catch { return null; }
  if (!p || !p.exp || p.exp < Math.floor(Date.now() / 1000)) return null;
  const c = cfg();
  if (p.role === "admin" && !c.secret) return null;
  if (p.role === "demo" && !c.demoEnabled) return null;
  if (p.role !== "admin" && p.role !== "demo") return null;
  return p;
}

const safeEqual = (x, y) =>
  timingSafeEqual(createHash("sha256").update(String(x)).digest(), createHash("sha256").update(String(y)).digest());

/** Devuelve { role, email } si las credenciales son válidas, o null. */
export function authenticate(email, password) {
  const c = cfg();
  const e = String(email ?? "").trim().toLowerCase();
  const p = String(password ?? "");

  const adminOk = c.adminEmail && c.adminPassword && c.secret &&
    safeEqual(e, c.adminEmail.toLowerCase()) & safeEqual(p, c.adminPassword);
  if (adminOk) return { role: "admin", email: c.adminEmail };

  const demoOk = c.demoEnabled &&
    safeEqual(e, c.demoEmail.toLowerCase()) & safeEqual(p, c.demoPassword);
  if (demoOk) return { role: "demo", email: c.demoEmail };

  return null;
}

export function requireAuth(req) {
  const m = (req.headers.get("authorization") || "").match(/^Bearer (.+)$/i);
  return m ? verify(m[1]) : null;
}

export const TTL = { admin: 8 * 3600, demo: 2 * 3600 };
