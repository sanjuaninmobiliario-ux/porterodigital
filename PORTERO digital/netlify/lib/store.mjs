// Base de datos: Netlify Blobs (incluido en el plan gratuito, sin configuración).
import { DEMO_PHONE } from "./config.mjs";
import { naturalCompare } from "../../public/js/utils.js";

const KEY = "deptos";
let override = null;
export const setStoreForTests = (s) => { override = s; };

async function backend() {
  if (override) return override;
  const { getStore } = await import("@netlify/blobs");
  return getStore({ name: "portero", consistency: "strong" });
}

export function seed() {
  const filas = [
    ["PB 1", "Portería"], ["1 A", "Flia Pérez"], ["1 B", "Flia González"], ["2 A", "Flia Rodríguez"],
    ["2 B", "Flia Fernández"], ["3 A", "Flia López"], ["3 B", "Flia Martínez"], ["4 A", "Flia García"],
    ["4 B", "Flia Sánchez"], ["5 A", "Flia Romero"], ["5 B", "Flia Díaz"], ["6 A", "Flia Ortiz"],
  ];
  return filas.map(([depto, familia]) => ({ id: crypto.randomUUID(), depto, familia, telefono: DEMO_PHONE }));
}

export const ordenar = (list) => [...list].sort((a, b) => naturalCompare(a.depto, b.depto));

export async function loadDeptos() {
  const s = await backend();
  let list = await s.get(KEY, { type: "json" });
  if (!Array.isArray(list)) { list = seed(); await s.setJSON(KEY, list); }
  return list;
}
export async function saveDeptos(list) { await (await backend()).setJSON(KEY, list); }
