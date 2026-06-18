FROM node:20-alpine AS builder
WORKDIR /app
COPY . .
RUN npm install -g pnpm && \
    CI=true pnpm install --frozen-lockfile && \
    CI=true pnpm --filter kyro-api build

FROM node:20-alpine
WORKDIR /app
COPY --from=builder /app/packages/api/dist ./packages/api/dist
COPY --from=builder /app/packages/api/drizzle ./packages/api/drizzle
COPY --from=builder /app/node_modules ./node_modules
COPY --from=builder /app/packages/api/node_modules ./packages/api/node_modules
WORKDIR /app/packages/api
EXPOSE 3000
CMD ["node", "dist/index.js"]
