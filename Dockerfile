# Imagen Node.js — mismo patrón que Service-Musas-wompi (Cloud Run)
FROM node:18-alpine

WORKDIR /app

COPY package*.json ./

RUN npm ci --only=production && npm cache clean --force

COPY . .

EXPOSE 8080

ENV PORT=8080
ENV NODE_ENV=production

CMD ["node", "server.js"]
