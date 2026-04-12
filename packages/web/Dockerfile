FROM node:20-alpine AS builder
WORKDIR /app
COPY . .
ARG PUBLIC_API_URL=http://api:3000
ENV PUBLIC_API_URL=$PUBLIC_API_URL
RUN npm install -g pnpm && \
    CI=true pnpm install --frozen-lockfile && \
    CI=true pnpm --filter kyro-web build

FROM node:20-alpine AS runner
WORKDIR /app
RUN addgroup -S kyro && adduser -S kyro -G kyro
# Copy everything needed to install deps in the runner
COPY --from=builder /app/package.json ./package.json
COPY --from=builder /app/pnpm-lock.yaml ./pnpm-lock.yaml
COPY --from=builder /app/pnpm-workspace.yaml ./pnpm-workspace.yaml
COPY --from=builder /app/packages/web/package.json ./packages/web/package.json
COPY --from=builder /app/packages/shared/package.json ./packages/shared/package.json
# Install only production deps
RUN npm install -g pnpm && \
    pnpm install --frozen-lockfile --prod
# Copy the build output and shared package
COPY --from=builder /app/packages/web/build ./packages/web/build
COPY --from=builder /app/packages/shared ./packages/shared
USER kyro
EXPOSE 3001
ENV NODE_ENV=production
ENV PORT=3001
WORKDIR /app/packages/web
CMD ["node", "build"]
