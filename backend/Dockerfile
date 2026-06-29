FROM node:20-alpine AS base
WORKDIR /app

# Build context is repo root; copy backend files + root lockfile
COPY backend/package.json ./
COPY package-lock.json ./
COPY backend/prisma ./prisma/
RUN npm install --omit=dev --ignore-scripts

# Copy backend source
COPY backend/ .

# Generate Prisma client
RUN npx prisma generate

ENV NODE_ENV=production
EXPOSE 5000

CMD ["sh", "-c", "sh scripts/railway-start.sh"]
