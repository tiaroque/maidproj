# syntax=docker/dockerfile:1

ARG NODE_VERSION=22.22.3

FROM node:${NODE_VERSION}-alpine AS build
WORKDIR /usr/src/app

# bcrypt and sharp ship musl prebuilds. The toolchain covers a missing prebuild.
RUN apk add --no-cache python3 build-base

COPY package.json package-lock.json ./
RUN --mount=type=cache,target=/root/.npm \
    npm ci

COPY . .
# npm run build also copies the HTML mail templates into dist/email-templates.
RUN npm run build && npm prune --omit=dev

FROM node:${NODE_VERSION}-alpine AS final
WORKDIR /usr/src/app
ENV NODE_ENV=production
ENV PORT=3000

COPY --from=build --chown=node:node /usr/src/app/package.json ./package.json
COPY --from=build --chown=node:node /usr/src/app/node_modules ./node_modules
COPY --from=build --chown=node:node /usr/src/app/dist ./dist

USER node
EXPOSE 3000

CMD ["node", "dist/server.js"]
