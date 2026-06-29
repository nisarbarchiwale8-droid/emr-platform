FROM node:20-alpine AS base
WORKDIR /app

# Build context is repo root; copy backend files
COPY backend/package*.json ./
COPY backend/prisma ./prisma/
RUN npm ci --omit=dev

# Copy backend source
COPY backend/ .

# Generate Prisma client
RUN npx prisma generate

ENV NODE_ENV=production
EXPOSE 5000

CMD ["sh", "-c", "sh scripts/railway-start.sh"]
