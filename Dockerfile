# Production-ready Dockerfile for PW Global CRM
FROM node:22-bookworm-slim

WORKDIR /app

# Install build dependencies for native C++ modules
RUN apt-get update && apt-get install -y python3 make g++ --no-install-recommends && rm -rf /var/lib/apt/lists/*

# Copy root package files and install production dependencies
COPY package*.json ./
RUN npm install --omit=dev

# Copy server code and pre-built production frontend bundle
COPY server/ ./server/
COPY client/dist/ ./client/dist/

ENV NODE_ENV=production
ENV PORT=5000
EXPOSE 5000

CMD ["node", "server/index.js"]
