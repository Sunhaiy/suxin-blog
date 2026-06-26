FROM docker.m.daocloud.io/library/node:20-bookworm-slim AS base

WORKDIR /app

ENV NEXT_TELEMETRY_DISABLED=1

FROM base AS deps

COPY package.json package-lock.json ./
RUN npm install

FROM deps AS builder

ARG CACHE_BUST=0

ARG DATABASE_URL
ARG PGHOST
ARG PGPORT
ARG PGDATABASE
ARG PGUSER
ARG PGPASSWORD

ENV DATABASE_URL=$DATABASE_URL
ENV PGHOST=$PGHOST
ENV PGPORT=$PGPORT
ENV PGDATABASE=$PGDATABASE
ENV PGUSER=$PGUSER
ENV PGPASSWORD=$PGPASSWORD

COPY . .
RUN npm run build
RUN npm prune --omit=dev

FROM docker.m.daocloud.io/library/node:20-bookworm-slim AS runner

WORKDIR /app

ENV NEXT_TELEMETRY_DISABLED=1
ENV NODE_ENV=production
ENV HOSTNAME=0.0.0.0
ENV PORT=3000

COPY --from=builder /app/package.json /app/package-lock.json ./
COPY --from=builder /app/node_modules ./node_modules
COPY --from=builder /app/.next ./.next
COPY --from=builder /app/public ./public
COPY --from=builder /app/next.config.mjs ./next.config.mjs

EXPOSE 3000

CMD ["npm", "run", "start", "--", "--hostname", "0.0.0.0", "--port", "3000"]
