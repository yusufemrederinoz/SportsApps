FROM node:24-slim

WORKDIR /srv

COPY package.json package-lock.json ./
COPY app/package.json ./app/package.json
COPY server/package.json ./server/package.json
COPY packages ./packages
RUN npm ci --omit=dev --workspace @sportapps/server --no-audit --no-fund

COPY server/src ./server/src
COPY app/assets/data ./app/assets/data

ENV NODE_ENV=production \
    HOST=0.0.0.0 \
    PORT=4000 \
    DATABASE_PATH=/data/sportapps.sqlite \
    PORTRAITS_PATH=/data/portraits

VOLUME /data
EXPOSE 4000
WORKDIR /srv/server
USER node
CMD ["node", "--import", "tsx", "src/main.ts"]
