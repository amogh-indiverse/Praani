FROM oven/bun:1.3.1
WORKDIR /app
COPY package.json ./
RUN bun install --production
COPY index.ts ./
COPY scripts ./scripts
COPY data/verified-local-names.json.gz ./data/verified-local-names.json.gz
ENV PORT=10000
EXPOSE 10000
CMD ["bun", "run", "index.ts"]
