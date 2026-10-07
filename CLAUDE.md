# Reglas — Portal de Obras (Kokkai)

Frontend del Portal de Obras. Se publica solo con GitHub Pages desde `main`:
**todo lo que entra a `main` queda en vivo al instante.** El backend es
`apps-script-portal` (repo privado, Apps Script); sus reglas completas están
en el `CLAUDE.md` de ese repo y valen también acá.

## Quién hace qué

- **Franco aprueba y publica.** Es el único que mergea a `main`.
- **Nicolás produce** en ramas `nicolas/<tema>` y abre Pull Requests.

## Si esta sesión es de Nicolás

1. Antes de empezar algo nuevo:
   `git switch main && git pull && git switch -c nicolas/<tema>`.
2. Nunca commitear, pushear ni mergear a `main`. Nunca `git push --force`.
3. Al terminar: commit, `git push -u origin nicolas/<tema>` y abrir un Pull
   Request hacia `main` (`gh pr create`) explicando qué cambia y cómo
   probarlo. Ahí termina su parte; Franco revisa y publica.
4. Si el cambio necesita algo nuevo en el backend, va en una rama
   `nicolas/<tema>` de `apps-script-portal` con su propio PR. Nunca
   `clasp push`/`clasp deploy`.
5. Probar local (`python3 -m http.server 8000`) habla con el backend **de
   producción**: mirar datos sí; guardar, aprobar, subir o borrar algo solo
   sobre una obra/cliente llamado exactamente **"PRUEBA – NO USAR"**.
6. No cambiar cómo se llaman ni qué devuelven las acciones existentes de la
   API (las usan el Portal, el cotizador y otros sistemas). Para algo nuevo,
   acción nueva.

## Para todos

- **Este repo es público.** Nunca commitear tokens, PINs, claves, API keys,
  mails de clientes, datos de obras ni exportaciones de planillas. Si un
  diff tiene algo así, frenar y avisar.
- El token de cada usuario se tipea en el login y vive solo en el navegador;
  nunca va en el código.
- Archivos: un `.js` por pestaña (`h1.js`…`h5.js`, `fotos.js`, `admin.js`…),
  `api.js` concentra las llamadas al backend, `config.js` tiene la URL.
  Módulos nuevos (stock, finanzas, dashboard) van en su propio archivo.
- Todo en español: textos, comentarios y commits.
