# ============================================================
# CareFlow Backend — Cloud Run Dockerfile
# ============================================================

FROM node:20-slim

WORKDIR /app

# Copy package files first for layer caching
COPY package*.json ./

# Install dependencies
RUN npm ci --omit=dev

# Copy application code
COPY . .

# Cloud Run provides PORT environment variable
ENV PORT=8080

EXPOSE 8080

# Start the server
CMD ["node", "src/server.js"]
