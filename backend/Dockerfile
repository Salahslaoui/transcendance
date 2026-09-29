FROM node:lts AS base
WORKDIR /app

FROM base AS deps
COPY package.json package-lock.json ./
RUN npm ci

FROM base AS builder
COPY --from=deps /app/node_modules ./node_modules
COPY . .
RUN npm run build

FROM node:lts AS runner
WORKDIR /app
ENV NODE_ENV=production
ENV PORT=8000

COPY --from=builder /app/dist ./dist
COPY --from=builder /app/node_modules ./node_modules
COPY --from=builder /app/src/routes/game/tournament/MyContract.json \
     /app/dist/routes/game/tournament/MyContract.json

RUN mkdir -p /app/data
RUN mkdir -p /app/dist/uploads/avatars
COPY ./src/uploads/avatars/default.png /app/dist/uploads/avatars
EXPOSE 8000
WORKDIR /app/dist
CMD ["node", "index.js"]
