# Production Dockerfile for IntellectFlow (TanStack Start + Nitro Node Server)
FROM node:20-alpine AS builder
WORKDIR /app

# Copy dependency manifests
COPY package*.json ./
RUN npm ci

# Copy source files & build Nitro production bundle
COPY . .
ENV NODE_ENV=production
RUN npm run build

# Production Runner Stage
FROM node:20-alpine AS runner
WORKDIR /app

ENV NODE_ENV=production
ENV PORT=3000
ENV HOST=0.0.0.0

# Copy built server bundle from builder
COPY --from=builder /app/.output ./.output
COPY --from=builder /app/package*.json ./
COPY --from=builder /app/node_modules ./node_modules

EXPOSE 3000

CMD ["node", ".output/server/index.mjs"]
