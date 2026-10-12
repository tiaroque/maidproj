# syntax=docker/dockerfile:1

ARG NODE_VERSION=22.22.3

FROM node:${NODE_VERSION}-alpine AS build
WORKDIR /usr/src/app

COPY package.json package-lock.json ./
RUN --mount=type=cache,target=/root/.npm \
    npm ci

COPY . .

ARG NG_CONFIGURATION=production
ENV NODE_OPTIONS=--max-old-space-size=4096
RUN npm run build -- --configuration=${NG_CONFIGURATION}

FROM node:${NODE_VERSION}-alpine AS final
WORKDIR /usr/src/app
ENV NODE_ENV=production

COPY --from=build --chown=node:node /usr/src/app/dist ./dist

USER node
EXPOSE 4000

HEALTHCHECK --interval=30s --timeout=10s --start-period=40s --retries=3 \
  CMD node -e "fetch('http://127.0.0.1:'+(process.env.PORT||4000)+'/').then((r)=>process.exit(r.ok?0:1)).catch(()=>process.exit(1))"

CMD ["node", "dist/maid/server/server.mjs"]
