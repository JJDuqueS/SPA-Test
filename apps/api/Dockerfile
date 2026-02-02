FROM node:20-alpine AS deps

WORKDIR /app

# Prisma engines on Alpine typically need OpenSSL available.
RUN apk add --no-cache openssl libc6-compat

# Install deps (includes Prisma generate via @prisma/client postinstall)
COPY package.json package-lock.json ./
COPY prisma ./prisma
RUN npm ci
RUN npx prisma generate --schema prisma/schema.prisma


FROM node:20-alpine AS build

WORKDIR /app

COPY --from=deps /app/node_modules ./node_modules
COPY . ./
RUN npm run build


FROM node:20-alpine AS runner

ENV NODE_ENV=production
WORKDIR /app

# Prisma runtime dependencies on Alpine.
RUN apk add --no-cache openssl libc6-compat

# Install only production deps.
# Note: Prisma client generation requires the prisma CLI (usually a devDependency),
# so we skip install scripts here and copy the generated artifacts from the build stage.
COPY package.json package-lock.json ./
RUN npm ci --omit=dev --ignore-scripts && npm cache clean --force

COPY --from=build /app/node_modules/.prisma ./node_modules/.prisma
COPY --from=build /app/dist ./dist

EXPOSE 3000
CMD ["node", "dist/main.js"]
