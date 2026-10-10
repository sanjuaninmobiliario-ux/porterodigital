import { normalizePhone, isValidPhone } from "../../public/js/utils.js";

export const MAX_DEPTOS = 100;
const limpiar = (v) => String(v ?? "").replace(/[\u0000-\u001f\u007f]/g, "").trim();

/** Valida y normaliza. `telefonoForzado` se usa en modo demo. */
export function validarDepto(body, telefonoForzado) {
  if (!body || typeof body !== "object") return { error: "Datos inválidos." };
  const depto = limpiar(body.depto);
  const familia = limpiar(body.familia);
  const telefono = telefonoForzado ?? normalizePhone(body.telefono);
  if (!depto || depto.length > 20) return { error: "Depto obligatorio (máx. 20 caracteres)." };
  if (!familia || familia.length > 40) return { error: "Nombre obligatorio (máx. 40 caracteres)." };
  if (!isValidPhone(telefono)) return { error: "Teléfono inválido: solo números con código de país (8 a 15 dígitos)." };
  return { value: { depto, familia, telefono } };
}
