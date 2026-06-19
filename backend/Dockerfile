FROM node:18-alpine

WORKDIR /app

COPY package.json pnpm-lock.yaml* ./

# Install pnpm
RUN npm install -g pnpm

# Install dependencies
RUN pnpm install

COPY . .

# Ensure uploads directory exists
RUN mkdir -p /app/public/uploads

EXPOSE 5160

CMD ["node", "app.js"]
