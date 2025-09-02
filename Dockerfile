# Multi-stage build for Backend
FROM node:20-alpine AS backend-build

WORKDIR /app/backend

# Copy backend package files
COPY backend/package*.json ./
COPY backend/prisma ./prisma/

# Install dependencies
RUN npm ci --only=production && npm cache clean --force

# Generate Prisma client
RUN npx prisma generate

# Copy backend source code
COPY backend/src ./src/
COPY backend/.env.production ./.env

# Create uploads directory
RUN mkdir -p uploads

# Build stage for Frontend
FROM node:20-alpine AS frontend-build

WORKDIR /app/frontend

# Copy frontend package files
COPY frontend/package*.json ./

# Install dependencies
RUN npm ci

# Copy frontend source code
COPY frontend/src ./src/
COPY frontend/public ./public/
COPY frontend/index.html ./
COPY frontend/vite.config.js ./
COPY frontend/tailwind.config.js ./
COPY frontend/postcss.config.js ./

# Set production environment variables
ENV VITE_API_URL=https://diy-humanoid-configurator-backend.railway.app/api
ENV VITE_APP_ENV=production

# Build frontend
RUN npm run build

# Production stage
FROM node:20-alpine AS production

# Install dumb-init for proper signal handling
RUN apk add --no-cache dumb-init

# Create app user
RUN addgroup -g 1001 -S nodejs
RUN adduser -S appuser -u 1001

WORKDIR /app

# Copy backend build
COPY --from=backend-build --chown=appuser:nodejs /app/backend ./backend

# Copy frontend build to static directory
COPY --from=frontend-build --chown=appuser:nodejs /app/frontend/dist ./frontend/dist

# Create necessary directories
RUN mkdir -p /app/backend/uploads && chown appuser:nodejs /app/backend/uploads
RUN mkdir -p /app/logs && chown appuser:nodejs /app/logs

# Set user
USER appuser

# Expose port
EXPOSE 3001

# Health check
HEALTHCHECK --interval=30s --timeout=3s --start-period=5s --retries=3 \
  CMD node -e "require('http').get('http://localhost:3001/api/health', (r) => { process.exit(r.statusCode === 200 ? 0 : 1) })"

# Start application
ENTRYPOINT ["dumb-init", "--"]
CMD ["node", "backend/src/index.js"]