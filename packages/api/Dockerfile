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
EXPOSE 3000
CMD ["node", "dist/index.js"]