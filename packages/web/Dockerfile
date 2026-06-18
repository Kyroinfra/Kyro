FROM node:20-alpine AS builder
WORKDIR /app
COPY . .
RUN npm install -g pnpm && \
    CI=true pnpm install --frozen-lockfile && \
    CI=true pnpm --filter kyro-web build

FROM node:20-alpine
WORKDIR /app
COPY --from=builder /app/packages/web/build ./packages/web/build
COPY --from=builder /app/node_modules ./node_modules
COPY --from=builder /app/packages/web/node_modules ./packages/web/node_modules
COPY --from=builder /app/packages/shared ./packages/shared
WORKDIR /app/packages/web
EXPOSE 3001
CMD ["node", "build"]
