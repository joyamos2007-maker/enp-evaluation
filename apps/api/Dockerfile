FROM node:24-alpine AS build
WORKDIR /app

COPY . .
RUN cd apps/api && npm ci && npm run build
RUN cd apps/api && npm prune --omit=dev --no-audit --no-fund

FROM node:24-alpine AS runtime
WORKDIR /app/apps/api
ENV NODE_ENV=production

COPY --from=build /app/apps/api/package*.json ./
COPY --from=build /app/apps/api/node_modules ./node_modules
COPY --from=build /app/apps/api/dist ./dist

EXPOSE 3000
CMD ["node", "dist/main.js"]
