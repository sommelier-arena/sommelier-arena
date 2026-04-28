FROM node:22-alpine AS builder
WORKDIR /app

# PUBLIC_PARTYKIT_HOST is baked into the Astro static build at build time.
# In both Mode A (npm run dev) and Mode B (Docker), the browser connects directly
# to localhost:1999 where the PartyKit server is exposed.
ARG PUBLIC_PARTYKIT_HOST=localhost:1999
ENV PUBLIC_PARTYKIT_HOST=$PUBLIC_PARTYKIT_HOST

ARG PUBLIC_WINE_ANSWERS_URL=http://localhost:1998
ENV PUBLIC_WINE_ANSWERS_URL=$PUBLIC_WINE_ANSWERS_URL

COPY package*.json ./
RUN npm install
COPY . .
RUN npm run build

FROM nginx:alpine AS production
COPY --from=builder /app/dist /usr/share/nginx/html
COPY nginx.conf /etc/nginx/conf.d/default.conf
EXPOSE 4321
