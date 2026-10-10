// Toda la configuración se lee de variables de entorno (Netlify → Site configuration → Environment variables).
// Se lee en cada llamada (no al cargar) para poder probarla fácilmente.
export const DEMO_PHONE = "5492644114128"; // WhatsApp de pruebas (Argentina móvil: 549 + 264 + 4114128)

export const cfg = () => ({
  edificio: process.env.EDIFICIO_NOMBRE || "Edificio Residencial",
  demoEnabled: process.env.DEMO_ENABLED !== "false",
  demoEmail: process.env.DEMO_EMAIL || "demo@portero.app",
  demoPassword: process.env.DEMO_PASSWORD || "Demo2026",
  adminEmail: process.env.ADMIN_EMAIL || "",
  adminPassword: process.env.ADMIN_PASSWORD || "",
  secret: process.env.JWT_SECRET || "",
});

export const mensaje = (edificio, depto) =>
  `🔔 Hola, estoy en la entrada de ${edificio} (Depto ${depto}).`;
