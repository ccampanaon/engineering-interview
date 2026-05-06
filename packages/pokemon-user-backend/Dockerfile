FROM node:20-alpine AS base
WORKDIR /app
ENV PNPM_HOME="/pnpm"
ENV PATH="$PNPM_HOME:$PATH"
RUN corepack enable

FROM base AS deps
WORKDIR /app
COPY ./package.json ./package.json
COPY ./pnpm-lock.yaml ./pnpm-lock.yaml
RUN --mount=type=cache,target=/pnpm/.pnpm-store pnpm install --frozen-lockfile --prod

FROM base AS runner
WORKDIR /app
COPY --from=deps /app/node_modules ./node_modules
COPY ./packages/pokemon-user-backend/dist ./dist
WORKDIR /app/dist
ENTRYPOINT ["node", "main.js"]
