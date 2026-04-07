FROM node:20-slim
WORKDIR /app
COPY package.json package-lock.json* ./
RUN npm install
COPY . .
EXPOSE 1998
CMD ["npx", "wrangler", "dev", "--local", "--port", "1998", "--ip", "0.0.0.0"]
