FROM node:20-alpine AS builder
WORKDIR /app

COPY package*.json ./
RUN npm ci

COPY . .

ARG PUBLIC_API_URL=http://api:3000
ENV PUBLIC_API_URL=$PUBLIC_API_URL

RUN npm run build

FROM node:20-alpine AS runner
WORKDIR /app

RUN addgroup -S kyro && adduser -S kyro -G kyro

COPY --from=builder /app/build ./build
COPY --from=builder /app/package*.json ./
RUN npm ci --only=production

USER kyro
EXPOSE 3001

ENV NODE_ENV=production
ENV PORT=3001
CMD ["node", "build"]
