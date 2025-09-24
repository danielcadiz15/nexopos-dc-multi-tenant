# 🚀 Guía de Instalación - Meta Sistema de Gestión

## 📋 Requisitos Previos

### Software Necesario
- **Node.js 18+** - [Descargar](https://nodejs.org/)
- **npm 9+** (incluido con Node.js)
- **Git** (opcional, para control de versiones)

### Sistemas Operativos Soportados
- ✅ Windows 10/11
- ✅ macOS 10.15+
- ✅ Linux (Ubuntu 20.04+, CentOS 8+)

## 🔧 Instalación Rápida

### 1. Configuración Automática
```bash
# Navegar al directorio del meta-sistema
cd meta-sistema-gestion

# Ejecutar configuración automática
npm run setup
```

La configuración automática:
- ✅ Verifica requisitos del sistema
- ✅ Crea directorios necesarios
- ✅ Configura variables de entorno
- ✅ Instala todas las dependencias
- ✅ Configura usuarios por defecto
- ✅ Inicializa el registro de sistemas

### 2. Instalación Manual

Si prefieres configurar manualmente:

```bash
# 1. Instalar dependencias
npm run install-all

# 2. Configurar variables de entorno
cp backend/.env.example backend/.env

# 3. Editar configuración (opcional)
nano backend/.env

# 4. Inicializar base de datos de usuarios
node scripts/setup.js
```

## 🚀 Inicio del Sistema

### Desarrollo
```bash
# Iniciar ambos servicios (frontend + backend)
npm run dev

# O iniciar servicios por separado
npm run frontend:dev  # Frontend en puerto 3000
npm run backend:dev   # Backend en puerto 5000
```

### Producción
```bash
# Construir para producción
npm run build

# Iniciar en modo producción
npm start
```

## 🐳 Instalación con Docker

### Prerequisitos Docker
- Docker Engine 20.10+
- Docker Compose 2.0+

### Instalación
```bash
# Construir e iniciar todos los servicios
docker-compose up -d

# Ver logs
docker-compose logs -f

# Detener servicios
docker-compose down
```

### Servicios Docker
- **Frontend**: http://localhost:3000
- **Backend**: http://localhost:5000
- **MySQL**: localhost:3306
- **Redis**: localhost:6379

## 🔗 Acceso al Sistema

### URLs del Sistema
- **Dashboard**: http://localhost:3000
- **API**: http://localhost:5000/api
- **Health Check**: http://localhost:5000/api/health

### Credenciales por Defecto
- **Usuario**: `admin`
- **Contraseña**: `admin123`

> ⚠️ **Importante**: Cambia estas credenciales después del primer acceso.

## ⚙️ Configuración Avanzada

### Variables de Entorno (backend/.env)

```bash
# Configuración básica
NODE_ENV=development
PORT=5000
FRONTEND_URL=http://localhost:3000

# Seguridad
JWT_SECRET=tu-clave-secreta-muy-segura

# Base de datos (opcional)
DB_HOST=localhost
DB_PORT=3306
DB_NAME=meta_sistema
DB_USER=root
DB_PASSWORD=

# Sistemas
SYSTEMS_SCAN_INTERVAL=30000
AUTO_REFRESH_SYSTEMS=true

# Logs
LOG_LEVEL=info
LOG_FILE=logs/app.log
```

### Configuración de Sistemas

El meta-sistema detecta automáticamente tus sistemas existentes:

1. **Zeus Distribuidora**: `../sistema-zeus-distribuidora/`
2. **Mueblería**: `../nuevo sistema de despensa/muebleria/`
3. **Sistema de Despensa**: `../nuevo sistema de despensa/`

## 🔍 Verificación de Instalación

### 1. Verificar Servicios
```bash
# Verificar que los servicios estén corriendo
curl http://localhost:5000/api/health
curl http://localhost:3000
```

### 2. Escanear Sistemas
```bash
# Ejecutar escaneo manual de sistemas
npm run scan-systems
```

### 3. Verificar Logs
```bash
# Ver logs del backend
tail -f backend/src/logs/app.log

# Ver logs con Docker
docker-compose logs -f backend
```

## 🛠️ Solución de Problemas

### Problemas Comunes

#### Puerto en Uso
```bash
# Error: EADDRINUSE :::3000
# Solución: Cambiar puerto o matar proceso
lsof -ti:3000 | xargs kill -9
```

#### Dependencias Faltantes
```bash
# Reinstalar todas las dependencias
rm -rf node_modules frontend/node_modules backend/node_modules
npm run install-all
```

#### Permisos en Linux/macOS
```bash
# Dar permisos de ejecución a scripts
chmod +x scripts/*.js
```

### Logs de Depuración

```bash
# Habilitar logs detallados
export DEBUG=meta-sistema:*
npm run dev
```

### Reset Completo

```bash
# ⚠️ CUIDADO: Esto eliminará toda la configuración
rm -rf node_modules frontend/node_modules backend/node_modules
rm backend/.env
rm backend/src/config/users.json
rm backend/src/config/systems-registry.json

# Reinstalar
npm run setup
```

## 📚 Siguientes Pasos

1. **Cambiar Credenciales**: Accede a Configuración → Usuarios
2. **Registrar Sistemas**: Ve a Sistemas → Refresh para detectar automáticamente
3. **Explorar Funcionalidades**: 
   - Editor de Código
   - Despliegues
   - Monitoreo
   - Plantillas

## 🆘 Soporte

### Documentación
- **README.md**: Información general del proyecto
- **docs/**: Documentación detallada de cada módulo

### Logs Útiles
- **Backend**: `backend/src/logs/app.log`
- **Sistema**: Logs del sistema operativo
- **Docker**: `docker-compose logs`

### Contacto
Si encuentras problemas:
1. Revisa los logs
2. Verifica la configuración
3. Consulta la documentación
4. Reporta issues específicos

---

**¡Meta Sistema de Gestión está listo para gestionar todos tus sistemas! 🎉**