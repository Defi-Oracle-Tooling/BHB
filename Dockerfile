# Dockerfile for Repo Indexer API
FROM node:20-alpine

WORKDIR /app

# Install pnpm
RUN npm install -g pnpm@10

# Copy lockfile and package manifests first for better cache usage
COPY package.json ./
COPY pnpm-lock.yaml ./
ENV NODE_ENV=production

RUN pnpm install --frozen-lockfile --prod

# Copy the rest of the code
COPY . .

EXPOSE 3000

# Optional: Healthcheck (customize as needed)
HEALTHCHECK --interval=30s --timeout=5s --start-period=10s --retries=3 \
  CMD wget --no-verbose --tries=1 --spider http://localhost:3000/docs || exit 1

CMD ["node", "scripts/api.js"]
