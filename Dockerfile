FROM node:24.18.0-alpine3.24

WORKDIR /app

ENV NODE_ENV=production \
    HOST=0.0.0.0 \
    PORT=3000 \
    DATA_DIR=/app/data \
    PUBLIC_DIR=/app/public

COPY --chown=node:node package.json server.js mailer.js ./
COPY --chown=node:node public ./public

# A aplicação não instala pacotes em runtime. Remover npm/corepack reduz a
# superfície da imagem e elimina dependências de gerenciadores não utilizadas.
RUN rm -rf /usr/local/lib/node_modules/npm \
      /usr/local/bin/npm \
      /usr/local/bin/npx \
      /usr/local/lib/node_modules/corepack \
      /usr/local/bin/corepack \
      /usr/local/bin/pnpm \
      /usr/local/bin/pnpx \
      /usr/local/bin/yarn \
      /usr/local/bin/yarnpkg \
    && mkdir -p /app/data \
    && chown node:node /app/data

USER node
EXPOSE 3000

HEALTHCHECK --interval=30s --timeout=3s --start-period=10s --retries=3 \
  CMD ["node", "-e", "fetch('http://127.0.0.1:3000/api/ready').then(r=>{if(!r.ok)process.exit(1)}).catch(()=>process.exit(1))"]

CMD ["node", "server.js"]
