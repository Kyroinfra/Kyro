FROM node:24-alpine AS builder
WORKDIR /app

# Pin pnpm to the version that produced pnpm-lock.yaml (host: pnpm -v).
# pnpm 11 needs node:sqlite → Node >= 22.5; the image is Node 24 LTS for that.
RUN npm install -g pnpm@11.28.4

# Install dependencies keyed to manifests only, so source changes never
# invalidate this layer (the old `COPY . .` → install order re-downloaded
# the whole dependency tree on every rebuild).
COPY package.json pnpm-lock.yaml pnpm-workspace.yaml ./
COPY packages/api/package.json packages/api/
COPY packages/web/package.json packages/web/
COPY packages/shared/package.json packages/shared/
RUN CI=true pnpm install --frozen-lockfile

# Sources last — editing code no longer busts the dependency layer.
COPY . .
RUN CI=true pnpm --filter kyro-api build

FROM node:24-alpine
WORKDIR /app
COPY --from=builder /app/packages/api/dist ./packages/api/dist
COPY --from=builder /app/packages/api/drizzle ./packages/api/drizzle
COPY --from=builder /app/node_modules ./node_modules
COPY --from=builder /app/packages/api/node_modules ./packages/api/node_modules
WORKDIR /app/packages/api
EXPOSE 3000
CMD ["node", "dist/index.js"]
