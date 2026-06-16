FROM node:20-alpine
WORKDIR /app
COPY . .
RUN npm install -g pnpm ts-node nodemon && \
    CI=true pnpm install --frozen-lockfile
WORKDIR /app/packages/api
EXPOSE 3000
CMD ["node", "dist/index.js"]
