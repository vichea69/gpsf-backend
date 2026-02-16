FROM node:20-alpine AS builder
WORKDIR /app
COPY package*.json ./
RUN npm install --legacy-peer-deps
COPY . .
RUN npm run build

FROM node:20-alpine
WORKDIR /app
# Required by node-poppler at runtime (provides pdftocairo binary)
RUN apk add --no-cache poppler-utils
COPY --from=builder /app/dist ./dist
COPY package*.json ./
RUN npm install --omit=dev --legacy-peer-deps
COPY .env .env
EXPOSE 3001
CMD ["node", "dist/main.js"]
