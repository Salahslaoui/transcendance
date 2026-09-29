FROM node:lts-alpine AS base
WORKDIR /app

#this is For installing only the dependencies we dont copy the all of the project yet
FROM base AS deps
COPY package.json package-lock.json ./
RUN npm ci

#this is for building the project we uses dependencies from the deps stage and copy our project into /app
FROM base AS builder
ARG ENV_NODE
COPY --from=deps /app/node_modules ./node_modules
COPY . .
RUN npm run build

FROM base AS runner
ENV NODE_ENV=production
ENV PORT=3000

COPY --from=builder /app/.next/standalone ./
COPY --from=builder /app/.next/static ./.next/static

EXPOSE 3000
CMD ["node", "server.js"]


# Standalone mode: build output mode designed for optimized production deployments
# This standalone folder contains only the necessary files for a production deployment, including: 
#   Traced dependencies: Next.js analyzes your application to identify and copy only the specific files from node_modules that are actually required for your app to run in production.
#   This significantly reduces the size of your deployment package compared to including the entire node_modules folder.
# A minimal server.js file:
#   Instead of relying on next start, the standalone build provides a server.js file that can be executed directly with Node.js (e.g., node .next/standalone/server.js).
#   This streamlines the execution process and removes the need for Next.js-specific startup scripts in your production environment.
