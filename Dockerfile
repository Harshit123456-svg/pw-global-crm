# Production-ready multi-stage Dockerfile for PW Global CRM
FROM node:22-bookworm-slim AS builder

WORKDIR /app

# Install build dependencies for native C++ modules
RUN apt-get update && apt-get install -y python3 make g++ --no-install-recommends && rm -rf /var/lib/apt/lists/*

# Copy package files
COPY package*.json ./
COPY client/package*.json ./client/

# Install root dependencies (better-sqlite3 compiles cleanly against Node 22)
RUN npm install

# Install client dependencies and build React app
RUN cd client && npm install && npm run build

# Runner stage
FROM node:22-bookworm-slim AS runner

WORKDIR /app
ENV NODE_ENV=production
ENV PORT=5000

# Copy dependencies directly from builder stage (fast, reliable, no recompilation needed)
COPY --from=builder /app/node_modules ./node_modules
COPY package*.json ./

# Copy server files and built client bundle
COPY server/ ./server/
COPY --from=builder /app/client/dist ./client/dist

# Expose port
EXPOSE 5000

# Run the CRM
CMD ["node", "server/index.js"]
