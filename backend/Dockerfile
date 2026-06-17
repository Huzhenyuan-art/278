FROM node:18-alpine

WORKDIR /app

COPY package.json pnpm-lock.yaml* ./

# Install pnpm
RUN npm install -g pnpm

# Install dependencies
RUN pnpm install

COPY . .

EXPOSE 5160

CMD ["node", "app.js"]
