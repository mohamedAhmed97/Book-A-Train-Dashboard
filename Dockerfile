# Stage 1: Install dependencies
FROM node:25-alpine AS deps
RUN apk add --no-cache libc6-compat
WORKDIR /app

RUN npm install -g pnpm@9.0.0

COPY package.json ./
RUN pnpm install --no-frozen-lockfile

COPY prisma ./prisma
RUN pnpm exec prisma generate

# Stage 2: Build
FROM node:25-alpine AS builder
WORKDIR /app

RUN npm install -g pnpm@9.0.0

COPY --from=deps /app/node_modules ./node_modules
COPY . .

ENV NODE_ENV=production
RUN pnpm build

# Stage 3: Run
FROM node:25-alpine AS runner
WORKDIR /app

ENV NODE_ENV=production
ENV PORT=3002
ENV HOSTNAME="0.0.0.0"

RUN addgroup --system --gid 1001 nodejs && \
    adduser --system --uid 1001 nextjs

COPY --from=builder --chown=nextjs:nodejs /app/.next/standalone ./
COPY --from=builder --chown=nextjs:nodejs /app/.next/static ./.next/static

USER nextjs
EXPOSE 3002

CMD ["node", "server.js"]
