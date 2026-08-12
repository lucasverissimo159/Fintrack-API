FROM node:20-alpine

WORKDIR /usr/src/app

# python3/make/g++ are needed so better-sqlite3 can build its native bindings
# on musl-based Alpine when no prebuilt binary is available for the platform.
RUN apk add --no-cache python3 make g++

COPY package*.json ./
RUN npm install --omit=dev

COPY . .

RUN mkdir -p data logs

EXPOSE 3000

# Lets `docker ps` / orchestrators (Compose, k8s, ECS...) see real app health —
# including a DB connectivity check, not just "the process is still running".
HEALTHCHECK --interval=30s --timeout=5s --start-period=10s --retries=3 \
  CMD node -e "require('http').get('http://localhost:3000/health', r => process.exit(r.statusCode === 200 ? 0 : 1)).on('error', () => process.exit(1))"

CMD ["node", "src/server.js"]
