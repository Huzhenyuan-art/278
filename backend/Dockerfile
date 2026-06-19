FROM node:18-alpine

WORKDIR /app

COPY package.json package-lock.json* ./

RUN npm config set registry https://registry.npmmirror.com && \
    npm ci

COPY . .

RUN mkdir -p /app/public/uploads

EXPOSE 5160

CMD ["node", "app.js"]
