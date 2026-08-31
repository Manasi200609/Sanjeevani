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

# Cloud Run injects PORT at runtime (typically 8080).
# If deploying locally without PORT set, default to 8080.
ENV PORT=8080
EXPOSE 8080

# Default: start the Express server
# For Cloud Run Jobs, override with: node src/jobs/runner.js
CMD ["node", "src/server.js"]
