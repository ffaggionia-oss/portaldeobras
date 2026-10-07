# Empezar a trabajar en el Portal de Obras

Guía para Nicolás. Se hace una sola vez (pasos 1 a 3) y después se repite
el flujo del paso 4 para cada cosa nueva.

**La idea en una línea:** vos trabajás en tu rama y abrís un Pull Request;
Franco lo revisa y lo publica. Nada de lo que hagas en tu rama se ve en el
Portal real hasta que Franco lo aprueba, así que no hay forma de romper
nada en vivo.

## 1. Lo que te da Franco

- Una invitación de GitHub (llega por mail) a dos repos:
  - `portaldeobras`: la pantalla del Portal. Es público.
  - `apps-script-portal`: el backend. Es privado.
  Aceptala desde el mail. Si no tenés cuenta de GitHub, creala primero y
  pasale tu usuario a Franco.
- Tu acceso al Portal es el mismo token con el que entrás hoy. No hace
  falta nada más.

## 2. Instalar (una sola vez, en la Mac)

1. **Claude**: bajá la app de escritorio desde https://claude.com/download e
   iniciá sesión. Vas a trabajar en la pestaña **Code**.
2. **Herramientas de desarrollo**: abrí la app Terminal y corré:

   ```bash
   xcode-select --install
   ```

   ```bash
   /bin/bash -c "$(curl -fsSL https://raw.githubusercontent.com/Homebrew/install/HEAD/install.sh)"
   ```

   ```bash
   brew install gh
   ```

   ```bash
   gh auth login
   ```

   En `gh auth login` elegí GitHub.com → HTTPS → "Login with a web browser".

¿Te trabás? Abrí Claude Code y pedile: *"ayudame a instalar git y gh y a
loguearme en GitHub"*.

## 3. Bajar el código (una sola vez)

```bash
mkdir -p ~/kokkai
```

```bash
cd ~/kokkai && gh repo clone ffaggionia-oss/portaldeobras && gh repo clone ffaggionia-oss/apps-script-portal
```

En Claude, en la pestaña Code, abrí la carpeta `~/kokkai/portaldeobras`.
Claude lee solo el archivo `CLAUDE.md` con las reglas del proyecto.

## 4. El flujo de cada día

Le podés pedir todo a Claude en castellano. Por ejemplo:

> "Quiero arrancar el módulo de stock. Creá una rama nueva."

Claude hace esto por vos (está en sus reglas):

1. Se pone al día con `main` y crea tu rama `nicolas/stock`.
2. Escribe el código con vos y lo prueba en tu compu.
3. Guarda el avance (commit) y lo sube a tu rama.
4. Abre un **Pull Request**, que es el pedido de revisión para Franco.

Franco lo revisa. Si pide cambios, seguís en la misma rama y el PR se
actualiza solo. Cuando lo aprueba, él lo publica.

**Una rama por tema** (stock, cashflow, dashboard…). Así cada cosa se
revisa y se publica por separado.

## 5. Probar en tu compu

Pedile a Claude *"levantá el portal local"*. Va a correr:

```bash
python3 -m http.server 8000
```

Después abrís http://localhost:8000 y entrás con tu token.

Ojo: la versión local habla con **los datos reales**. Mirar está perfecto.
Guardar, aprobar, subir o borrar algo, solo sobre una obra o cliente que se
llame exactamente **"PRUEBA – NO USAR"**.

Si tu módulo necesita cosas nuevas del backend (por ejemplo, guardar
movimientos de stock), esa parte no se puede probar contra lo real hasta
que Franco la publique. Mientras tanto, armá la pantalla con datos de
ejemplo. Está en camino un backend de prueba con datos de mentira.

## 6. Lo que no se hace

- Subir o mezclar cosas a `main`. Siempre tu rama y un PR.
- `clasp push` / `clasp deploy`: publican el backend y eso lo hace Franco.
- Poner tokens, claves, PINs o datos de clientes en el código.
  `portaldeobras` es **público**: cualquiera puede leer lo que se sube.
- Cambiar cómo funcionan las acciones del backend que ya existen. Otros
  sistemas dependen de ellas. Si hace falta algo distinto, se crea una
  acción nueva.

GitHub además bloquea por configuración cualquier subida directa a `main`,
así que aunque alguien se equivoque, no pasa nada.
