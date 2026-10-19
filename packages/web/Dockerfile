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
RUN CI=true pnpm --filter kyro-web build

FROM node:24-alpine
WORKDIR /app
COPY --from=builder /app/packages/web/build ./packages/web/build
COPY --from=builder /app/node_modules ./node_modules
COPY --from=builder /app/packages/web/node_modules ./packages/web/node_modules
COPY --from=builder /app/packages/shared ./packages/shared
WORKDIR /app/packages/web
EXPOSE 3001
CMD ["node", "build"]
