FROM node:20-alpine AS builder
WORKDIR /app
COPY package*.json ./
RUN npm ci --silent
COPY . .
# Docker mode: docs are served at root (localhost:3002/), not under /docs/.
# Production: set DOCS_BASE_URL=/docs/ in your deployment build args.
ARG DOCS_BASE_URL=/
ENV DOCS_BASE_URL=$DOCS_BASE_URL
RUN npm run build

FROM nginx:alpine AS production
COPY --from=builder /app/build /usr/share/nginx/html
EXPOSE 80
