# App Móvil - Sistema de Gestión

Esta es la aplicación móvil del sistema de gestión, desarrollada con React y Capacitor.

## Características

- **Interfaz optimizada para móviles**: Diseño responsive y táctil
- **Navegación inferior**: Fácil acceso a las funciones principales
- **Punto de venta móvil**: Interfaz optimizada para ventas rápidas
- **Dashboard móvil**: Vista general del sistema en dispositivos móviles

## Requisitos Previos

### Para Android:
- Android Studio instalado
- Android SDK configurado
- Variables de entorno ANDROID_HOME y JAVA_HOME configuradas

### Para iOS:
- Xcode instalado (solo en macOS)
- CocoaPods instalado

## Instalación y Configuración

1. **Instalar dependencias:**
   ```bash
   npm install
   ```

2. **Construir la aplicación:**
   ```bash
   npm run mobile:build
   ```

3. **Abrir en Android Studio:**
   ```bash
   npm run mobile:open:android
   ```

4. **Abrir en Xcode (solo macOS):**
   ```bash
   npm run mobile:open:ios
   ```

## Comandos Útiles

- `npm run mobile:build` - Construir y sincronizar con Capacitor
- `npm run mobile:android` - Ejecutar en emulador Android
- `npm run mobile:ios` - Ejecutar en simulador iOS
- `npm run mobile:open:android` - Abrir proyecto en Android Studio
- `npm run mobile:open:ios` - Abrir proyecto en Xcode

## Estructura de Componentes Móviles

```
src/components/mobile/
├── MobileApp.js          # Componente principal de la app móvil
├── MobileLayout.js       # Layout con navegación inferior
├── MobileNavigation.js   # Navegación inferior
├── MobileDashboard.js    # Dashboard optimizado para móviles
└── MobilePuntoVenta.js  # Punto de venta móvil
```

## Funcionalidades Implementadas

### ✅ Completadas:
- Navegación inferior con 6 secciones principales
- Dashboard con tarjetas de acceso rápido
- Punto de venta con interfaz táctil
- Detección automática de dispositivos móviles
- Layout responsive

### 🚧 En Desarrollo:
- Gestión de clientes móvil
- Gestión de productos móvil
- Reportes móviles
- Configuración móvil

## Configuración de Capacitor

La configuración se encuentra en `capacitor.config.ts`:

```typescript
{
  appId: 'com.condinea.sistema',
  appName: 'Sistema de Gestión',
  webDir: 'build',
  // ... más configuración
}
```

## Personalización

### Cambiar el nombre de la app:
Editar `capacitor.config.ts` y cambiar `appName`

### Cambiar el ID del paquete:
Editar `capacitor.config.ts` y cambiar `appId`

### Agregar iconos:
Colocar los iconos en:
- Android: `android/app/src/main/res/`
- iOS: `ios/App/App/Assets.xcassets/`

## Solución de Problemas

### Error de sincronización:
```bash
npx cap sync
```

### Limpiar cache:
```bash
npx cap clean
```

### Reinstalar plataformas:
```bash
npx cap remove android
npx cap remove ios
npx cap add android
npx cap add ios
```

## Próximos Pasos

1. Implementar autenticación móvil
2. Agregar funcionalidades offline
3. Implementar notificaciones push
4. Agregar sincronización de datos
5. Optimizar rendimiento

## Contacto

Para soporte técnico o preguntas sobre la app móvil, contactar al equipo de desarrollo. 