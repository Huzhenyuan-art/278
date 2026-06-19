# Build Stage
FROM node:18-alpine as builder

ARG VITE_API_BASE_URL=http://localhost:5160
ENV VITE_API_BASE_URL=${VITE_API_BASE_URL}

WORKDIR /app

COPY package.json package-lock.json* ./

RUN npm config set registry https://registry.npmmirror.com && \
    npm ci

COPY . .

RUN npm run build

# Production Stage
FROM nginx:alpine

COPY --from=builder /app/dist /usr/share/nginx/html

COPY nginx.conf /etc/nginx/conf.d/default.conf

EXPOSE 3160

CMD ["nginx", "-g", "daemon off;"]
