FROM node:20-alpine
WORKDIR /app
COPY package.json ./
COPY server.js ./
COPY public ./public
# dados persistem via volume (veja docker-compose)
RUN mkdir -p /app/data
ENV PORT=3000
EXPOSE 3000
CMD ["node", "server.js"]
