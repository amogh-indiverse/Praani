FROM node:24-alpine
WORKDIR /app
COPY preview ./preview
COPY data/verified-local-names.json.gz ./data/verified-local-names.json.gz
ENV PORT=10000
EXPOSE 10000
USER node
CMD ["node", "preview/server.mjs"]
