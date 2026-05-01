FROM node:20-alpine AS builder
WORKDIR /app
COPY . .
RUN npm install -g pnpm && \
    CI=true pnpm install --frozen-lockfile
RUN CI=true pnpm --filter kyro-api build

FROM node:20-alpine
WORKDIR /app
COPY --from=builder /app /app
WORKDIR /app/packages/api

# Fix: drizzle folder is inside packages/api, not repo root
COPY --from=builder /app/packages/api/drizzle ./drizzle

EXPOSE 3000
CMD ["node", "dist/index.js"]
