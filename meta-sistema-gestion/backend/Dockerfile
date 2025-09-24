# Backend Dockerfile para Meta Sistema de Gestión
FROM node:18-alpine

# Información del mantenedor
LABEL maintainer="Meta Sistema de Gestión"
LABEL description="Backend API para gestión centralizada de sistemas"

# Crear directorio de trabajo
WORKDIR /app

# Copiar archivos de dependencias
COPY package*.json ./

# Instalar dependencias
RUN npm ci --only=production && npm cache clean --force

# Crear usuario no root
RUN addgroup -g 1001 -S nodejs && \
    adduser -S nodejs -u 1001

# Crear directorios necesarios
RUN mkdir -p src/config src/logs src/uploads && \
    chown -R nodejs:nodejs /app

# Copiar código fuente
COPY --chown=nodejs:nodejs . .

# Cambiar a usuario no root
USER nodejs

# Exponer puerto
EXPOSE 5000

# Configurar variables de entorno
ENV NODE_ENV=production
ENV PORT=5000

# Health check
HEALTHCHECK --interval=30s --timeout=3s --start-period=5s --retries=3 \
  CMD node healthcheck.js || exit 1

# Comando por defecto
CMD ["npm", "start"]