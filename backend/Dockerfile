FROM node:24.19.0-alpine AS development

WORKDIR /app

COPY package.json package-lock.json ./
RUN npm ci

COPY . .

CMD ["npm", "run", "start:dev"]

FROM development AS build

RUN npm run build

FROM node:24.19.0-alpine AS production

ENV NODE_ENV=production
ENV NODE_EXTRA_CA_CERTS=/etc/ssl/rds-global-bundle.pem

ADD --chmod=644 https://truststore.pki.rds.amazonaws.com/global/global-bundle.pem /etc/ssl/rds-global-bundle.pem

WORKDIR /app

COPY package.json package-lock.json ./
RUN npm ci --omit=dev && npm cache clean --force

COPY --from=build /app/dist ./dist

USER node

CMD ["node", "dist/main"]
