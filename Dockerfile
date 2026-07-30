# build-trigger: 2026-07-30-puppeteer
FROM node:20-alpine AS build
WORKDIR /app
COPY frontend/package*.json ./frontend/
RUN cd frontend && npm install
COPY frontend ./frontend
RUN cd frontend && npm run build

FROM node:20-slim
WORKDIR /app
# Chromium para generación de PDFs (cartas responsivas)
RUN apt-get update && apt-get install -y chromium --no-install-recommends && rm -rf /var/lib/apt/lists/*
COPY backend/package*.json ./backend/
RUN cd backend && npm install --omit=dev
COPY backend ./backend
COPY --from=build /app/frontend/dist ./frontend/dist
RUN chown -R node:node /app
USER node
EXPOSE 3001
CMD ["node", "backend/src/server.js"]
