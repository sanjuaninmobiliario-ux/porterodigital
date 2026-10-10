import assert from "node:assert/strict";
import { setStoreForTests } from "../netlify/lib/store.mjs";
import { sign } from "../netlify/lib/auth.mjs";
import login from "../netlify/functions/login.mjs";
import deptos from "../netlify/functions/deptos.mjs";
import contactar from "../netlify/functions/contactar.mjs";
import reset from "../netlify/functions/reset.mjs";
import { normalizePhone, isValidPhone, naturalCompare, buildWhatsAppUrl } from "../public/js/utils.js";

const mem = new Map();
setStoreForTests({ get: async (k) => mem.get(k) ?? null, setJSON: async (k, v) => mem.set(k, structuredClone(v)) });
process.env.JWT_SECRET = "secreto-de-prueba";
process.env.ADMIN_EMAIL = "admin@edificio.com";
process.env.ADMIN_PASSWORD = "ClaveLarga-123";

const B = "http://x";
const call = (fn, path, { method = "GET", body, token } = {}) =>
  fn(new Request(B + path, {
    method,
    headers: { "content-type": "application/json", ...(token ? { authorization: `Bearer ${token}` } : {}) },
    body: body ? JSON.stringify(body) : undefined,
  }));
const j = (r) => r.json();
const DEMO = "5492644114128";
let n = 0; const ok = (name) => console.log(`  ✔ ${++n}. ${name}`);

// --- utils
assert.equal(normalizePhone("+54 9 264 411-4128"), DEMO);
assert.equal(isValidPhone("javascript:alert(1)"), false);
assert.deepEqual(["10 A", "2 A", "1 B", "1 A"].sort(naturalCompare), ["1 A", "1 B", "2 A", "10 A"]);
assert.equal(buildWhatsAppUrl("abc", "x"), null);
ok("utilidades (teléfono, orden natural)");

// --- público
let r = await call(deptos, "/api/deptos");
let data = await j(r);
assert.equal(r.status, 200);
assert.equal(data.deptos.length, 12);
assert.ok(data.deptos.every((d) => !("telefono" in d)), "la lista pública NO debe incluir teléfonos");
assert.ok(!JSON.stringify(data).includes("264411"), "ningún número en la respuesta pública");
assert.equal(data.deptos[0].depto, "1 A");
ok("lista pública sin teléfonos y ordenada (1 A, 1 B, 2 A…)");

r = await call(deptos, "/api/deptos?full=1");
assert.equal(r.status, 401);
ok("lista completa exige sesión");

// --- login
r = await call(login, "/api/login");
assert.equal((await j(r)).demo.email, "demo@portero.app");
ok("la pantalla de login conoce la cuenta demo");

r = await call(login, "/api/login", { method: "POST", body: { email: "demo@portero.app", password: "mal" } });
assert.equal(r.status, 401);
ok("contraseña incorrecta → 401");

r = await call(login, "/api/login", { method: "POST", body: { email: " DEMO@portero.app ", password: "Demo2026" } });
const demo = await j(r);
assert.equal(demo.role, "demo");
ok("login demo correcto");

r = await call(login, "/api/login", { method: "POST", body: { email: "admin@edificio.com", password: "ClaveLarga-123" } });
const admin = await j(r);
assert.equal(admin.role, "admin");
ok("login admin real correcto");

// --- permisos
for (const m of [["POST", "/api/deptos"], ["PUT", "/api/deptos/x"], ["DELETE", "/api/deptos/x"]]) {
  r = await call(deptos, m[1], { method: m[0], body: { depto: "9 Z", familia: "X", telefono: DEMO } });
  assert.equal(r.status, 401);
}
ok("crear / editar / borrar sin sesión → 401");

assert.equal((await call(deptos, "/api/deptos", { method: "POST", token: "basura.basura", body: {} })).status, 401);
const tampered = admin.token.replace(/.$/, (c) => (c === "A" ? "B" : "A"));
assert.equal((await call(deptos, "/api/deptos?full=1", { token: tampered })).status, 401);
ok("tokens falsificados o alterados rechazados");

const expired = sign({ role: "admin", email: "a" }, -10);
assert.equal((await call(deptos, "/api/deptos?full=1", { token: expired })).status, 401);
ok("token vencido rechazado");

// --- demo: teléfono forzado
r = await call(deptos, "/api/deptos", { method: "POST", token: demo.token, body: { depto: "7 A", familia: "Flia Prueba", telefono: "5491100000000" } });
let nuevo = await j(r);
assert.equal(r.status, 201);
assert.equal(nuevo.telefono, DEMO);
ok("la demo crea deptos, pero el teléfono siempre es el de pruebas");

r = await call(deptos, "/api/deptos/" + nuevo.id, { method: "PUT", token: demo.token, body: { depto: "7 A", familia: "Editada", telefono: "5491100000000" } });
assert.equal((await j(r)).telefono, DEMO);
ok("la demo no puede cambiar el teléfono al editar");

// --- admin: teléfono libre + validación
r = await call(deptos, "/api/deptos", { method: "POST", token: admin.token, body: { depto: "8 B", familia: "Flia Real", telefono: "+54 9 264 555-0000" } });
const real = await j(r);
assert.equal(real.telefono, "5492645550000");
ok("el admin real sí puede usar su propio teléfono (se normaliza)");

assert.equal((await call(deptos, "/api/deptos", { method: "POST", token: admin.token, body: { depto: "9 A", familia: "X", telefono: "12" } })).status, 400);
assert.equal((await call(deptos, "/api/deptos", { method: "POST", token: admin.token, body: { depto: "", familia: "X", telefono: DEMO } })).status, 400);
assert.equal((await call(deptos, "/api/deptos", { method: "POST", token: admin.token, body: { depto: "x".repeat(21), familia: "X", telefono: DEMO } })).status, 400);
assert.equal((await call(deptos, "/api/deptos", { method: "POST", token: admin.token, body: { depto: "8 b", familia: "Dup", telefono: DEMO } })).status, 409);
ok("validación: teléfono inválido, vacío, demasiado largo y duplicado (sin distinguir mayúsculas)");

// --- XSS: se guarda como texto, el front lo muestra con textContent
r = await call(deptos, "/api/deptos", { method: "POST", token: admin.token, body: { depto: "<b>1</b>", familia: "<img src=x onerror=alert(1)>", telefono: DEMO } });
assert.equal(r.status, 201);
ok("texto con HTML se acepta como texto plano (el front no interpreta HTML)");

// --- contactar
const lista = (await j(await call(deptos, "/api/deptos"))).deptos;
const d1 = lista.find((d) => d.depto === "1 A");
r = await call(contactar, "/api/contactar", { method: "POST", body: { id: d1.id } });
const { url } = await j(r);
assert.ok(url.startsWith(`https://wa.me/${DEMO}?text=`));
assert.ok(decodeURIComponent(url).includes("Edificio Residencial (Depto 1 A)"));
ok("contactar entrega solo el enlace de WhatsApp del depto elegido");
assert.equal((await call(contactar, "/api/contactar", { method: "POST", body: { id: "nope" } })).status, 404);
assert.equal((await call(contactar, "/api/contactar")).status, 405);
ok("contactar: id inexistente → 404, método incorrecto → 405");

// --- borrar y reset
assert.equal((await call(deptos, "/api/deptos/" + real.id, { method: "DELETE", token: admin.token })).status, 200);
assert.equal((await call(deptos, "/api/deptos/" + real.id, { method: "DELETE", token: admin.token })).status, 404);
ok("borrar (y borrar dos veces → 404)");

assert.equal((await call(reset, "/api/reset", { method: "POST", token: admin.token })).status, 403);
assert.equal((await call(reset, "/api/reset", { method: "POST" })).status, 401);
assert.equal((await call(reset, "/api/reset", { method: "POST", token: demo.token })).status, 200);
assert.equal((await j(await call(deptos, "/api/deptos"))).deptos.length, 12);
ok("reset: solo la demo; el admin real nunca pierde datos");

// --- seguridad de configuración
delete process.env.JWT_SECRET;
const forged = sign({ role: "admin", email: "x" }, 3600);
assert.equal((await call(deptos, "/api/deptos?full=1", { token: forged })).status, 401);
r = await call(login, "/api/login", { method: "POST", body: { email: "admin@edificio.com", password: "ClaveLarga-123" } });
assert.equal(r.status, 401);
ok("sin JWT_SECRET: no se puede forjar ni obtener rol admin (solo demo)");

process.env.DEMO_ENABLED = "false";
assert.equal((await j(await call(login, "/api/login"))).demo, null);
r = await call(login, "/api/login", { method: "POST", body: { email: "demo@portero.app", password: "Demo2026" } });
assert.equal(r.status, 401);
ok("DEMO_ENABLED=false apaga la cuenta demo por completo");

console.log(`\n✔ ${n} grupos de pruebas OK`);
