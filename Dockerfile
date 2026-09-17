FROM node:22-alpine

WORKDIR /app

ENV NODE_ENV=production

COPY package.json package-lock.json ./
RUN sed -i 's#http://package-firewall.replit.internal/npm/#https://registry.npmjs.org/#g' package-lock.json \
  && npm ci --omit=dev --registry=https://registry.npmjs.org \
  && npm cache clean --force

COPY server.js ./
COPY public ./public

EXPOSE 8080

CMD ["node", "server.js"]