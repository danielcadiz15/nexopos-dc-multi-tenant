# App Android NexoPOS DC Caja (único proyecto)

La app de caja vive **solo** en este repo, dentro de `client/`:

- **Shell nativo:** `client/android/`
- **Config Capacitor:** `client/capacitor.config.ts`
- **`appId` / package:** `com.condinea.app` (ver `android/app/build.gradle`)

La WebView carga la URL remota configurada en `capacitor.config.ts` (por defecto `https://nexopos-dc.web.app/cajero`). Los cambios de UI se prueban desplegando **Hosting** y, si hace falta, volviendo a generar el APK.

## Comandos (desde `client/`)

| Script | Qué hace |
|--------|----------|
| `npm run build` | Build de producción del React |
| `npm run mobile:build` | `build` + `cap sync` |
| `npm run mobile:sync:android` | Solo `cap sync android` |
| `npm run mobile:assemble:debug` | Gradle `assembleDebug` → APK debug |
| `npm run mobile:install:debug` | Instala el debug en dispositivo USB/emulador |
| `npm run mobile:open:android` | Abre el proyecto en Android Studio |

## Dónde queda el APK (debug)

Tras `npm run mobile:assemble:debug`:

```text
client/android/app/build/outputs/apk/debug/
```

El nombre del archivo puede ser `app-debug.apk` o el que defina tu configuración de Gradle (p. ej. si renombraste la salida a `nexopos-caja.apk`).

## Descarga desde el login web

Configurá `REACT_APP_CAJA_APK_URL` en `client/.env.local` (y el mismo valor al compilar para producción) o el campo **caja_apk_url** en configuración empresa. Subí el APK a Firebase Storage u otro HTTPS público.

## Nota sobre proyectos viejos

Antes existía una carpeta hermana `nexopos-dc-caja-android` con otro `appId` (`com.nexoposdc.caja`). Ese flujo quedó **unificado aquí** para no duplicar código ni versiones.
