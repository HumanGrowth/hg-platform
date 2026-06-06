# syntax=docker/dockerfile:1.7
# ─── Etapa 1: deps ─────────────────────────────────────────────────
FROM node:22-alpine AS deps
RUN npm install -g pnpm@9 --prefer-online
WORKDIR /app
# Copy manifests and lockfile before source for layer caching
COPY package.json pnpm-lock.yaml pnpm-workspace.yaml ./
COPY apps/frontend/package.json ./apps/frontend/
COPY packages/shared-types/package.json ./packages/shared-types/
RUN pnpm install --frozen-lockfile --filter @hg/frontend...

# ─── Etapa 2: builder ──────────────────────────────────────────────
FROM node:22-alpine AS builder
RUN npm install -g pnpm@9 --prefer-online
WORKDIR /app
COPY --from=deps /app/node_modules ./node_modules
COPY --from=deps /app/apps/frontend/node_modules ./apps/frontend/node_modules
# El lockfile debe estar en /app para que Next detecte el workspace root acá y
# genere el standalone en apps/frontend/ (si falta, server.js queda en la raíz).
COPY pnpm-workspace.yaml package.json pnpm-lock.yaml ./
COPY apps/frontend ./apps/frontend
COPY packages ./packages
ENV NEXT_TELEMETRY_DISABLED=1
RUN pnpm --filter @hg/frontend build

# ─── Etapa 3: runtime ──────────────────────────────────────────────
FROM node:22-alpine AS runtime
WORKDIR /app
ENV NODE_ENV=production \
    NEXT_TELEMETRY_DISABLED=1 \
    PORT=3000 \
    HOSTNAME=0.0.0.0

RUN addgroup -g 1001 -S nodejs && adduser -S nextjs -u 1001

COPY --from=builder /app/apps/frontend/public ./apps/frontend/public
COPY --from=builder --chown=nextjs:nodejs /app/apps/frontend/.next/standalone ./
COPY --from=builder --chown=nextjs:nodejs /app/apps/frontend/.next/static ./apps/frontend/.next/static

USER nextjs
EXPOSE 3000

# 127.0.0.1 (no localhost): Next bindea IPv4 0.0.0.0; localhost resuelve a [::1]
# y el healthcheck fallaría. /login devuelve 200 directo (evita el 307 de /).
HEALTHCHECK --interval=30s --timeout=5s --start-period=20s --retries=3 \
    CMD wget --no-verbose --tries=1 --spider http://127.0.0.1:3000/login || exit 1

CMD ["node", "apps/frontend/server.js"]
