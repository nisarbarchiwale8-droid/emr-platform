FROM node:20-alpine AS base
WORKDIR /app

# Install dependencies
COPY package*.json ./
COPY prisma ./prisma/
RUN npm ci --omit=dev

# Copy source
COPY . .

# Generate Prisma client
RUN npx prisma generate

ENV NODE_ENV=production
EXPOSE 5000

# Run migrations then start (deploy-time)
CMD ["sh", "-c", "npx prisma migrate deploy && node src/server.js"]
