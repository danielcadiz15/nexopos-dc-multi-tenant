# NexoPOS DC - Sistema Multi-Tenant de Punto de Venta

## 📋 Descripción del Proyecto

NexoPOS DC es un sistema de punto de venta multi-tenant desarrollado con React y Firebase. Permite a múltiples empresas gestionar sus productos, sucursales, ventas y usuarios de forma independiente.

## 🏗️ Arquitectura

- **Frontend**: React 18 (Create React App en `client/`)
- **Backend**: Firebase Functions (Node.js)
- **Base de Datos**: Firestore
- **Autenticación**: Firebase Auth
- **Hosting**: Firebase Hosting
- **Proyecto**: `nexopos-dc`

## Despliegue a producción

Guía paso a paso (build, `firebase deploy`, parciales y verificación): **[docs/DESPLIEGUE.md](docs/DESPLIEGUE.md)**.

## 🚀 Características

- ✅ Sistema multi-tenant (múltiples empresas)
- ✅ Gestión de productos con stock por sucursal
- ✅ Gestión de sucursales
- ✅ Sistema de usuarios con roles y permisos
- ✅ Punto de venta integrado
- ✅ Reportes y estadísticas
- ✅ Autenticación segura

## 🐛 Problemas Actuales

### Problema Principal: Sucursales y Productos No Se Muestran

**Síntomas:**
- Las sucursales se crean correctamente en Firebase pero no aparecen en el selector
- Los productos se crean correctamente en Firebase pero no se muestran en la lista
- El selector de sucursal muestra "ninguna" aunque hay sucursales disponibles

**Datos en Firebase (Verificados):**
- ✅ 27 empresas/tenants creadas
- ✅ 28 sucursales en colección principal (todas con `orgId` correcto)
- ✅ 16 productos (todos con `orgId` correcto)
- ✅ 19 usuarios en `usuariosOrg` (todos con `orgId` correcto)

**Logs del Frontend:**
```
🏪 [SUCURSAL SELECTOR] Estado: {loadingSucursales: false, sucursalesDisponibles: 1, sucursalSeleccionada: 'ninguna'}
```

### Cambios Recientes Implementados

1. **AuthContext.js**:
   - ✅ Agregado `useEffect` para recargar sucursales cuando cambia `orgId`
   - ✅ `orgId` se guarda en `localStorage` para acceso de servicios
   - ✅ Limpieza de `localStorage` al desloguearse

2. **productos.service.js**:
   - ✅ Corregida función `getOrgQuery()` para obtener `orgId` desde `localStorage`
   - ✅ Filtrado correcto por organización

3. **Verificación de datos**:
   - ✅ Confirmado que Firebase tiene todos los datos correctos
   - ✅ Todas las sucursales y productos tienen `orgId` correcto

## 📱 App Android (Caja) — un solo lugar

Todo el código y el proyecto Android Capacitor están en **`client/`** (`client/android`, `client/capacitor.config.ts`). No se usa un repo paralelo de “solo Android”; ver **`client/README-CAJA-ANDROID.md`**.

## 🔧 Estructura del Proyecto

```
multi-tenant-despensa/
├── client/                 # Frontend React
│   ├── src/
│   │   ├── components/     # Componentes React
│   │   ├── contexts/       # Contextos (Auth, etc.)
│   │   ├── pages/          # Páginas principales
│   │   ├── services/       # Servicios de API
│   │   └── firebase/       # Configuración Firebase
│   └── public/
├── functions/              # Backend Firebase Functions
│   ├── routes/            # Rutas de API
│   ├── utils/             # Utilidades
│   └── callables/         # Funciones callables
├── .firebaserc            # Configuración Firebase
├── firebase.json          # Configuración Firebase
└── serviceAccountKey.json # Clave de servicio (NO SUBIR A GIT)
```

## 🚀 Instalación y Configuración

### Prerrequisitos
- Node.js 18+
- Firebase CLI
- Cuenta de Firebase

### Instalación

1. **Clonar el repositorio:**
```bash
git clone <url-del-repo>
cd multi-tenant-despensa
```

2. **Instalar dependencias:**
```bash
# Frontend
cd client
npm install

# Backend
cd ../functions
npm install
```

3. **Configurar Firebase:**
```bash
# Configurar proyecto
firebase use nexopos-dc

# Obtener clave de servicio desde Firebase Console
# Guardar como serviceAccountKey.json en la raíz del proyecto
```

4. **Variables de entorno:**
```bash
# En client/.env.development.local
REACT_APP_FIREBASE_PROJECT_ID=nexopos-dc
REACT_APP_FIREBASE_FUNCTIONS_URL=https://api-5q2i5764zq-uc.a.run.app
```

### Despliegue

```bash
# Desplegar todo
firebase deploy --project nexopos-dc

# Solo frontend
firebase deploy --only hosting --project nexopos-dc

# Solo backend
firebase deploy --only functions --project nexopos-dc
```

## 🔍 Debugging

### Logs Importantes

**Frontend (Consola del navegador):**
- `🏢 [AUTH]` - Logs de autenticación
- `🏪 [SUCURSAL SELECTOR]` - Estado del selector de sucursal
- `🔄 [PRODUCTOS SERVICE]` - Logs del servicio de productos

**Backend (Firebase Functions Logs):**
- `🔍 [MULTI-TENANT]` - Logs de multi-tenancy
- `✅ [SUCURSALES]` - Logs de sucursales
- `📦 [PRODUCTOS]` - Logs de productos

### Verificar Datos en Firebase

```javascript
// Script para verificar datos (ejecutar en Firebase Console)
const db = firebase.firestore();

// Ver sucursales
db.collection('sucursales').get().then(snap => {
  console.log('Sucursales:', snap.size);
  snap.forEach(doc => console.log(doc.id, doc.data()));
});

// Ver productos
db.collection('productos').get().then(snap => {
  console.log('Productos:', snap.size);
  snap.forEach(doc => console.log(doc.id, doc.data()));
});
```

## 🎯 Próximos Pasos

1. **Resolver problema de carga de sucursales y productos**
2. **Implementar caché para mejorar rendimiento**
3. **Agregar tests unitarios**
4. **Optimizar consultas de Firestore**
5. **Implementar notificaciones en tiempo real**

## 📞 Contacto

Para soporte o preguntas sobre este proyecto, contactar al equipo de desarrollo.

---

**Estado del Proyecto**: 🟡 En desarrollo - Problemas de carga de datos en frontend
**Última actualización**: $(date)