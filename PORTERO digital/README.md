# Portero Digital · Moviltec (prototipo)

QR fijo en el muro → directorio de departamentos → WhatsApp del propietario (mensaje, llamada o videollamada) → vuelve al directorio → botón **CERRAR APLICACIÓN**.

Hosting + base de datos + funciones del servidor: **Netlify (plan gratuito)**. Código en **GitHub**: cada cambio que se sube se publica solo, **con la misma URL**.

```
public/                 Lo que ve el visitante (index.html) y el panel (admin.html)
netlify/functions/      Servidor: login, deptos, contactar, reset
netlify/lib/            Código compartido (seguridad, base de datos, validación)
netlify.toml            Configuración de Netlify + cabeceras de seguridad
tests/                  Pruebas (npm test) y servidor local de pruebas
material-impreso/       Cartel de ejemplo y QR anterior
```

## Cómo publicarlo (una sola vez)

1. **GitHub**: crear una cuenta, *New repository* (privado está bien) → *uploading an existing file* → arrastrar **todo el contenido** de esta carpeta (`public`, `netlify`, `netlify.toml`, `package.json`…) → *Commit*.
   ⚠️ Al terminar, en la página principal del repositorio deben verse **directamente** `netlify.toml`, `package.json` y las carpetas `public` y `netlify`. Si ve una sola carpeta (por ej. `portero`) y recién adentro todo lo demás, Netlify mostrará *Page not found*: en ese caso, en Netlify → *Site configuration → Build & deploy → Base directory* escriba el nombre de esa carpeta y vuelva a desplegar.
2. **Netlify**: crear cuenta (puede ingresar con GitHub) → *Add new project → Import an existing project → GitHub* → elegir el repositorio → *Deploy*. No hay que tocar nada: `netlify.toml` ya trae la configuración.
3. **Nombre de la URL** (opcional, se hace una vez): *Site configuration → Change site name* → por ej. `portero-moviltec` → `https://portero-moviltec.netlify.app`. **Esa URL no cambia nunca más**, aunque se actualice el código.
4. Probar `https://TU-SITIO.netlify.app/` y `https://TU-SITIO.netlify.app/admin`.
5. Generar el QR del muro apuntando a esa URL (QR estático, sin servicios intermedios).

### Actualizaciones
Editar un archivo en GitHub (o subir uno nuevo) → Netlify publica automáticamente en 1–2 minutos. La URL, los datos y los departamentos cargados se mantienen.

## Modo demostración (activo por defecto, sin configurar nada)
- Login del panel: **demo@portero.app / Demo2026** (se muestra en la propia pantalla de login para que el visitante pruebe).
- La demo puede agregar, editar y borrar departamentos, pero **todos usan el WhatsApp de pruebas** `+54 9 264 411-4128` (el servidor lo fuerza, aunque se escriba otro número).
- Botón "Restaurar datos de ejemplo" para volver a los 12 deptos iniciales.

## Pasar a producción (edificio real)
En Netlify → *Site configuration → Environment variables* agregar:

| Variable | Valor |
|---|---|
| `JWT_SECRET` | texto largo y aleatorio (≥ 32 caracteres) |
| `ADMIN_EMAIL` | correo del administrador |
| `ADMIN_PASSWORD` | contraseña larga |
| `EDIFICIO_NOMBRE` | nombre que se muestra en pantalla |
| `DEMO_ENABLED` | `false` (apaga la cuenta demo) |

Luego *Deploys → Trigger deploy*. El administrador real sí puede cargar el teléfono de cada propietario (código de país, sin `+`, 0 ni 15; Argentina móvil: `549` + área + número).

## Seguridad incluida
- Los teléfonos **no están en la página pública**: el servidor entrega solo el enlace de WhatsApp del departamento tocado.
- Panel con sesión firmada (vence a las 8 h; demo 2 h). Crear/editar/borrar exige sesión; todo se valida en el servidor.
- Texto de usuarios siempre se muestra como texto (sin XSS). Cabeceras CSP, anti-iframe, HSTS.
- Limitación conocida: no hay límite de intentos de login más allá de una demora de 0,7 s por intento fallido. Si el proyecto crece, agregar Netlify Rate Limiting o Cloudflare.

## Botón "Cerrar"
Los navegadores solo permiten cerrar pestañas abiertas por la propia página. El botón borra el directorio de la pantalla, muestra "Sesión finalizada" e intenta cerrar la pestaña; si el navegador no lo permite, queda la pantalla final lista para cerrar.

## Pruebas
`npm test` (backend) · `node tests/dev-server.mjs` (versión local en http://localhost:8766 con datos en memoria) · `netlify dev` si tiene Netlify CLI.
