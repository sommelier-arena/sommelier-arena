FROM node:20-alpine AS builder
WORKDIR /app

# No PUBLIC_BACKEND_URL baked in: the browser connects to same-origin and
# nginx proxies /socket.io/ to the backend container.
COPY package*.json ./
RUN npm install
COPY . .
RUN npm run build

FROM nginx:alpine AS production
COPY --from=builder /app/dist /usr/share/nginx/html
COPY nginx.conf /etc/nginx/conf.d/default.conf
EXPOSE 80
