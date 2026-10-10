import { naturalCompare } from "./utils.js";

const $ = (id) => document.getElementById(id);
const grid = $("grid");
const viewMain = $("view-main");
const viewEnd = $("view-end");
const closeBar = $("close-bar");
const toast = $("toast");

const ICON_USER =
  '<svg viewBox="0 0 24 24" width="24" height="24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round" aria-hidden="true"><path d="M16 7a4 4 0 11-8 0 4 4 0 018 0zM12 14a7 7 0 00-7 7h14a7 7 0 00-7-7z"/></svg>';

let contactoEnCurso = false;
let toastTimer = null;

/* ---------- Tema claro / oscuro ---------- */
function aplicarTema(t) {
  document.documentElement.dataset.theme = t;
  $("btn-theme").setAttribute("aria-label", t === "dark" ? "Cambiar a modo claro" : "Cambiar a modo oscuro");
  $("icon-sun").toggleAttribute("hidden", t !== "dark");
  $("icon-moon").toggleAttribute("hidden", t === "dark");
}
function temaInicial() {
  try { const s = localStorage.getItem("tema"); if (s === "dark" || s === "light") return s; } catch {}
  return "dark";
}
$("btn-theme").addEventListener("click", () => {
  const nuevo = document.documentElement.dataset.theme === "dark" ? "light" : "dark";
  aplicarTema(nuevo);
  try { localStorage.setItem("tema", nuevo); } catch {}
});

/* ---------- Mensajes ---------- */
function mostrarToast(texto, tipo = "ok") {
  toast.textContent = texto;
  toast.className = "toast" + (tipo === "error" ? " error" : "");
  toast.hidden = false;
  clearTimeout(toastTimer);
  toastTimer = setTimeout(() => (toast.hidden = true), 7000);
}

function mensajeEstado(texto, conReintento = false) {
  const box = document.createElement("div");
  box.className = "state";
  const p = document.createElement("p");
  p.textContent = texto;
  box.appendChild(p);
  if (conReintento) {
    const b = document.createElement("button");
    b.type = "button";
    b.className = "btn-retry";
    b.textContent = "Reintentar";
    b.addEventListener("click", cargarDatos);
    box.appendChild(b);
  }
  grid.replaceChildren(box);
}

/* ---------- Directorio ---------- */
function crearBoton(d, i) {
  const btn = document.createElement("button");
  btn.type = "button";
  btn.className = "apt-btn";
  btn.style.animationDelay = `${Math.min(i * 0.04, 0.8)}s`;
  btn.setAttribute("aria-label", `Contactar departamento ${d.depto}${d.familia ? ", " + d.familia : ""}`);

  const icon = document.createElement("span");
  icon.className = "apt-icon";
  icon.innerHTML = ICON_USER; // SVG estático, sin datos del usuario

  const num = document.createElement("span");
  num.className = "apt-number";
  num.textContent = d.depto;

  const owner = document.createElement("span");
  owner.className = "apt-owner";
  owner.textContent = d.familia;

  btn.append(icon, num, owner);
  btn.addEventListener("click", () => contactar(d, btn));
  return btn;
}

// El teléfono no está en la página: el servidor entrega solo el enlace de WhatsApp del depto tocado.
async function contactar(d, btn) {
  if (btn.disabled) return;
  btn.disabled = true;
  try {
    const r = await fetch("/api/contactar", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ id: d.id }),
    });
    const data = await r.json().catch(() => ({}));
    if (!r.ok || !data.url) throw new Error(data.error || "error");
    contactoEnCurso = true;
    window.location.href = data.url; // abre WhatsApp (mensaje / llamada / videollamada)
  } catch {
    mostrarToast("No se pudo iniciar el contacto. Intente de nuevo.", "error");
  } finally {
    setTimeout(() => (btn.disabled = false), 2500);
  }
}

async function cargarDatos() {
  mensajeEstado("Cargando directorio…");
  try {
    const r = await fetch("/api/deptos", { cache: "no-store" });
    if (!r.ok) throw new Error("http " + r.status);
    const { edificio, deptos } = await r.json();
    if (edificio) {
      $("edificio-nombre").textContent = edificio;
      document.title = `Portero Digital · ${edificio}`;
    }
    const lista = deptos.slice().sort((a, b) => naturalCompare(a.depto, b.depto));
    if (!lista.length) { mensajeEstado("No hay departamentos cargados."); return; }
    grid.replaceChildren(...lista.map(crearBoton));
  } catch (e) {
    console.error(e);
    mensajeEstado("No se pudo cargar el directorio. Verifique su conexión.", true);
  }
}

/* ---------- Al volver desde WhatsApp ---------- */
function alVolver() {
  if (!contactoEnCurso) return;
  contactoEnCurso = false;
  window.scrollTo({ top: 0 });
  mostrarToast("Listo. Puede llamar a otro departamento o cerrar la aplicación.");
}
document.addEventListener("visibilitychange", () => { if (!document.hidden) alVolver(); });
window.addEventListener("pageshow", (e) => { if (e.persisted) alVolver(); });

/* ---------- Cerrar la aplicación ---------- */
function cerrarApp() {
  grid.replaceChildren();
  viewMain.hidden = true;
  closeBar.hidden = true;
  toast.hidden = true;
  viewEnd.hidden = false;
  window.scrollTo({ top: 0 });
  try { window.close(); } catch {} // solo funciona si el navegador lo permite; si no, queda la pantalla final
}
function reabrir() {
  viewEnd.hidden = true;
  viewMain.hidden = false;
  closeBar.hidden = false;
  cargarDatos();
}
$("btn-cerrar").addEventListener("click", cerrarApp);
$("btn-reabrir").addEventListener("click", reabrir);

/* ---------- Inicio ---------- */
$("anio").textContent = new Date().getFullYear();
aplicarTema(temaInicial());
cargarDatos();
