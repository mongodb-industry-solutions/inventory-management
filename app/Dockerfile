FROM node:20-alpine AS base 

FROM base AS deps
RUN apk add --no-cache libc6-compat
WORKDIR /app

COPY package*.json ./
RUN npm ci

FROM base AS builder
WORKDIR /app
COPY --from=deps /app/node_modules ./node_modules
COPY . .

ENV NEXT_TELEMETRY_DISABLED 1
ENV NODE_ENV production

ARG MONGODB_URI
ARG EDGE_SERVER_HOST
ARG REMOTE_EDGE_USER
ARG MONGODB_DATABASE_NAME
ARG REALM_APP_ID
ARG APP_SERVICES_URI
ARG API_KEY
ARG CHARTS_EMBED_SDK_BASEURL
ARG DASHBOARD_ID_PRODUCT
ARG DASHBOARD_ID_GENERAL
ARG DEMO_INDUSTRY

RUN npm run build

FROM base AS runner
WORKDIR /app

ENV NODE_ENV production
ENV NEXT_TELEMETRY_DISABLED 1

RUN addgroup --system --gid 1001 nodejs
RUN adduser --system --uid 1001 nextjs

COPY --from=builder /app/public ./public
COPY --from=builder --chown=nextjs:nodejs /app/.next ./.next
COPY --from=builder /app/node_modules ./node_modules
COPY --from=builder /app/package.json ./package.json

USER nextjs

EXPOSE 3000

ENV PORT 3000

CMD ["npm", "start"]