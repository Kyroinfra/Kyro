FROM node:20-alpine
WORKDIR /app

COPY . .

RUN npm install -g pnpm && \
    CI=true pnpm install --frozen-lockfile

RUN CI=true pnpm --filter kyro-api build

WORKDIR /app/packages/api
EXPOSE 3000
CMD ["node", "dist/index.js"]

# FROM node:20-alpine
# WORKDIR /app
#
# # Copy root workspace files
# COPY . .
#
# # Install pnpm and dependencies
# RUN npm install -g pnpm && \
#     CI=true pnpm install --frozen-lockfile
#
# # Build shared first, then api
# RUN CI=true pnpm generate:openapi && \
#     CI=true pnpm --filter kyro-api build
#
# WORKDIR /app/packages/api
# EXPOSE 3000
# CMD ["node", "dist/index.js"]
