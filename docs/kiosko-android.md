# Modo kiosko Android (NexoPOS Caja)

Este proyecto incluye modo kiosko nativo para `client/android` con:

- arranque automático al iniciar tablet
- intento de bloqueo de salida (back/home/multitarea) con lock task
- ocultado de barra superior/inferior (immersive)
- watchdog para reabrir app si la tarea se cierra
- panel técnico oculto con PIN
- reinicio/relanzamiento automático configurable (en minutos)
- ocultado de apps no permitidas cuando la app está como Device Owner

## Activación técnica

El panel técnico se abre con **6 toques en la esquina superior izquierda**.

- PIN por defecto: `2580`
- Desde ahí se puede:
  - activar/desactivar kiosko
  - activar/desactivar watchdog
  - definir relanzamiento automático (minutos)
  - cambiar PIN administrador

## Importante: bloqueo total requiere Device Owner

Sin Device Owner, Android limita varias políticas (ocultar apps, lock task estricto).

Para provisionar Device Owner (dispositivo reseteado de fábrica):

```bash
adb shell dpm set-device-owner com.condinea.app/.KioskAdminReceiver
```

Luego abrir app y activar modo kiosko desde panel técnico.

## Dominio permitido

Capacitor está configurado para navegar solo en:

- `nexopos-dc.web.app`
- `*.nexopos-dc.web.app`

Ruta principal de caja:

- `https://nexopos-dc.web.app/cajero`
