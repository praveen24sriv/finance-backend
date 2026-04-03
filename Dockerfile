# syntax=docker/dockerfile:1

FROM node:20-alpine AS base
WORKDIR /app

# Needed by Prisma engines on Alpine
RUN apk add --no-cache openssl libc6-compat

COPY package*.json ./
RUN npm ci

COPY tsconfig.json ./
COPY prisma ./prisma
COPY src ./src
COPY .env.example ./.env.example

RUN npx prisma generate --schema=prisma/schema.prisma

FROM base AS development
ENV NODE_ENV=development
EXPOSE 3000
CMD ["npm", "run", "dev"]

FROM base AS builder
RUN npm run build

FROM node:20-alpine AS production
WORKDIR /app
ENV NODE_ENV=production

RUN apk add --no-cache openssl libc6-compat

COPY package*.json ./
RUN npm ci --omit=dev

COPY --from=builder /app/dist ./dist
COPY --from=base /app/prisma ./prisma

RUN npx prisma generate --schema=prisma/schema.prisma

EXPOSE 3000
CMD ["npm", "start"]
