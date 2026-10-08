# Reglas — Portal de Obras (Kokkai)

Pantalla pública que se publica sola con GitHub Pages desde `main`:
**todo lo que entra a `main` queda en vivo al instante.** Backend:
`apps-script-portal`. El mapa de toda la arquitectura, las reglas de equipo y el entorno
de prueba están en `apps-script-portal/EQUIPO.md`; las reglas del
`CLAUDE.md` de `apps-script-portal` valen también acá.

## Quién hace qué

- **Franco aprueba y publica.** Es el único que mergea a `main`.
- **Nicolás produce** en ramas `nicolas/<tema>` y abre Pull Requests.

## Si esta sesión es de Nicolás

1. Antes de algo nuevo: `git switch main && git pull && git switch -c nicolas/<tema>`.
2. Nunca commitear, pushear ni mergear a `main`. Nunca `git push --force`.
3. Al terminar: commit, `git push -u origin nicolas/<tema>` y `gh pr create`
   hacia `main`, explicando qué cambia y cómo probarlo. Si también hay
   cambios de backend, ese PR va aparte y se mencionan entre sí.
4. Probar local (`python3 -m http.server 8000`) habla con el backend **de
   producción**: mirar sí; guardar, aprobar, subir o borrar solo sobre algo
   llamado exactamente **"PRUEBA – NO USAR"**. Para probar backend nuevo,
   apuntar `config.js` al entorno de prueba **sin commitear ese cambio**.
5. No cambiar cómo se llaman ni qué devuelven las acciones existentes de la API.

## Para todos

- **Este repo es público.** Nunca commitear tokens, PINs, claves, API keys,
  datos de clientes, montos reales ni exportaciones de planillas. Si un diff
  tiene algo así, frenar y avisar.
- Un `.js` por pestaña (`h1.js`…`h5.js`, `fotos.js`, `admin.js`…), `api.js` concentra las llamadas al backend y `config.js` tiene la URL. Módulos nuevos (stock, finanzas, dashboard) van en su propio archivo.
- Todo en español: textos, comentarios y commits.
