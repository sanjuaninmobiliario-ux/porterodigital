// Funciones puras (sin DOM) para poder probarlas fácilmente.

/** Deja solo dígitos: "+54 9 264 555-1234" -> "5492645551234" */
export const normalizePhone = (v) => String(v ?? "").replace(/\D/g, "");

/** wa.me exige código de país + número, solo dígitos (8 a 15). */
export const isValidPhone = (v) => /^\d{8,15}$/.test(v);

/** Orden natural: 1A, 2A, 10A (y no 10A antes que 2A). */
export const naturalCompare = (a, b) =>
  String(a).localeCompare(String(b), "es", { numeric: true, sensitivity: "base" });

/** Devuelve la URL de WhatsApp o null si el teléfono no es válido. */
export function buildWhatsAppUrl(phone, message) {
  const n = normalizePhone(phone);
  if (!isValidPhone(n)) return null;
  return `https://wa.me/${n}?text=${encodeURIComponent(message)}`;
}
