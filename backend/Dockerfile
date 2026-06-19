FROM node:18-alpine

WORKDIR /app

COPY package.json package-lock.json* ./

RUN npm config set registry https://registry.npmmirror.com && \
    if [ -f package-lock.json ]; then \
        echo "Found package-lock.json, verifying integrity..."; \
        npm ci || (echo "npm ci failed, falling back to npm install..."; rm -f package-lock.json && npm install --no-audit --no-fund); \
    else \
        echo "No package-lock.json found, running npm install..."; \
        npm install --no-audit --no-fund; \
    fi

COPY . .

RUN mkdir -p /app/public/uploads

EXPOSE 5160

CMD ["node", "app.js"]
