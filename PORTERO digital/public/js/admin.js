import { normalizePhone, isValidPhone, naturalCompare } from "./utils.js";

const $ = (id) => document.getElementById(id);
const TOKEN_KEY = "portero_token";

let token = null;
let role = null;
let editingId = null;
let current = []; // [{id, depto, familia, telefono}]

const say = (el, text, type) => { el.textContent = text; el.className = "msg " + (type || ""); };
const getToken = () => { try { return sessionStorage.getItem(TOKEN_KEY); } catch { return null; } };
const setToken = (t) => { try { t ? sessionStorage.setItem(TOKEN_KEY, t) : sessionStorage.removeItem(TOKEN_KEY); } catch {} };

/* ---------- API ---------- */
async function api(path, { method = "GET", body } = {}) {
  const r = await fetch(path, {
    method,
    headers: { "Content-Type": "application/json", ...(token ? { Authorization: `Bearer ${token}` } : {}) },
    body: body ? JSON.stringify(body) : undefined,
  });
  const data = await r.json().catch(() => ({}));
  if (r.status === 401 && token) { logout("Su sesión venció. Ingrese nuevamente."); throw new Error("sesión vencida"); }
  if (!r.ok) throw new Error(data.error || "Error inesperado.");
  return data;
}

/* ---------- Sesión ---------- */
function mostrarLogin(msg) {
  $("panel").hidden = true;
  $("login").hidden = false;
  say($("login-msg"), msg || "", msg ? "err" : "");
  api("/api/login").then((d) => {
    if (!d.demo) return;
    $("demo-email").textContent = d.demo.email;
    $("demo-pass").textContent = d.demo.password;
    $("demo-box").hidden = false;
    $("btn-demo").onclick = () => { $("email").value = d.demo.email; $("password").value = d.demo.password; login(); };
  }).catch(() => {});
}

function logout(msg) {
  token = null; role = null; current = [];
  setToken(null);
  resetForm();
  $("lista").replaceChildren();
  mostrarLogin(msg);
}

async function login() {
  const email = $("email").value.trim();
  const password = $("password").value;
  if (!email || !password) return say($("login-msg"), "Ingrese correo y contraseña.", "err");
  $("btn-login").disabled = true;
  say($("login-msg"), "Ingresando…");
  try {
    const d = await api("/api/login", { method: "POST", body: { email, password } });
    token = d.token; role = d.role;
    setToken(token);
    $("password").value = "";
    entrar(d.email, d.role);
  } catch (e) {
    say($("login-msg"), e.message, "err");
  } finally {
    $("btn-login").disabled = false;
  }
}

function entrar(email, rol) {
  $("login").hidden = true;
  $("panel").hidden = false;
  $("user-mail").textContent = email;
  $("user-role").textContent = rol === "demo" ? "Demostración" : "Administrador";
  $("demo-banner").hidden = rol !== "demo";
  say($("form-msg"), "");
  cargar();
}

$("btn-login").addEventListener("click", login);
$("password").addEventListener("keydown", (e) => { if (e.key === "Enter") login(); });
$("btn-logout").addEventListener("click", () => logout());

/* ---------- Lista ---------- */
async function cargar() {
  try {
    const d = await api("/api/deptos?full=1");
    current = d.deptos.sort((a, b) => naturalCompare(a.depto, b.depto));
    render();
  } catch (e) {
    if (token) { const p = document.createElement("p"); p.className = "empty"; p.textContent = "Error al leer los datos."; $("lista").replaceChildren(p); }
  }
}

function render() {
  $("count").textContent = current.length ? `(${current.length})` : "";
  if (!current.length) {
    const p = document.createElement("p");
    p.className = "empty";
    p.textContent = "No hay departamentos cargados.";
    $("lista").replaceChildren(p);
    return;
  }
  $("lista").replaceChildren(...current.map(crearItem));
}

function crearItem(d) {
  const item = document.createElement("div");
  item.className = "item";

  const info = document.createElement("div");
  info.className = "info";
  const badge = document.createElement("span"); badge.className = "badge"; badge.textContent = d.depto;
  const fam = document.createElement("span"); fam.className = "fam"; fam.textContent = d.familia;
  const tel = document.createElement("span");
  const ok = isValidPhone(String(d.telefono ?? ""));
  tel.className = "tel" + (ok ? "" : " bad");
  tel.textContent = ok ? `WhatsApp ${d.telefono}` : `Teléfono inválido: ${d.telefono ?? "(vacío)"}`;
  info.append(badge, fam, tel);

  const acc = document.createElement("div");
  acc.className = "acc";
  const e = document.createElement("button"); e.type = "button"; e.className = "edit"; e.textContent = "Editar";
  e.addEventListener("click", () => startEdit(d));
  const x = document.createElement("button"); x.type = "button"; x.className = "del"; x.textContent = "Borrar";
  x.addEventListener("click", () => borrar(d));
  acc.append(e, x);

  item.append(info, acc);
  return item;
}

/* ---------- Formulario ---------- */
function resetForm() {
  editingId = null;
  $("f-depto").value = ""; $("f-familia").value = ""; $("f-tel").value = "";
  $("form-title").textContent = "Nuevo departamento";
  $("btn-save").textContent = "Guardar nuevo";
  $("btn-save").classList.remove("editing");
  $("btn-cancel").hidden = true;
}
function startEdit(d) {
  editingId = d.id;
  $("f-depto").value = d.depto; $("f-familia").value = d.familia; $("f-tel").value = d.telefono;
  $("form-title").textContent = `Editando ${d.depto}`;
  $("btn-save").textContent = "Actualizar datos";
  $("btn-save").classList.add("editing");
  $("btn-cancel").hidden = false;
  say($("form-msg"), "");
  window.scrollTo({ top: 0, behavior: "smooth" });
}
$("btn-cancel").addEventListener("click", () => { resetForm(); say($("form-msg"), ""); });

async function guardar() {
  const depto = $("f-depto").value.trim();
  const familia = $("f-familia").value.trim();
  const telefono = normalizePhone($("f-tel").value);
  const msg = $("form-msg");

  if (!depto || !familia || !telefono) return say(msg, "Complete los tres campos.", "err");
  if (!isValidPhone(telefono)) return say(msg, "Teléfono inválido: use solo números con código de país (8 a 15 dígitos).", "err");

  $("btn-save").disabled = true;
  try {
    const body = { depto, familia, telefono };
    if (editingId) await api("/api/deptos/" + editingId, { method: "PUT", body });
    else await api("/api/deptos", { method: "POST", body });
    resetForm();
    await cargar();
    say(msg, "✅ Guardado correctamente.", "ok");
  } catch (e) {
    say(msg, e.message, "err");
  } finally {
    $("btn-save").disabled = false;
  }
}
$("btn-save").addEventListener("click", guardar);

async function borrar(d) {
  if (!confirm(`¿Eliminar el departamento ${d.depto} (${d.familia})?`)) return;
  try {
    await api("/api/deptos/" + d.id, { method: "DELETE" });
    if (editingId === d.id) resetForm();
    await cargar();
    say($("form-msg"), "Departamento eliminado.", "ok");
  } catch (e) {
    say($("form-msg"), e.message, "err");
  }
}

$("btn-reset").addEventListener("click", async () => {
  if (!confirm("¿Restaurar los datos de ejemplo? Se perderán los cambios hechos en la demostración.")) return;
  try {
    await api("/api/reset", { method: "POST" });
    resetForm();
    await cargar();
    say($("form-msg"), "Datos de ejemplo restaurados.", "ok");
  } catch (e) {
    say($("form-msg"), e.message, "err");
  }
});

/* ---------- Inicio: retomar sesión si existe ---------- */
(async function init() {
  const saved = getToken();
  if (!saved) return mostrarLogin();
  token = saved;
  try {
    const d = await api("/api/deptos?full=1");
    role = d.role;
    const payload = JSON.parse(atob(saved.split(".")[0].replace(/-/g, "+").replace(/_/g, "/")));
    entrar(payload.email, d.role);
  } catch { if (token) logout(); }
})();
