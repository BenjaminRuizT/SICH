FROM node:20-alpine AS build
WORKDIR /app
COPY frontend/package*.json ./frontend/
RUN cd frontend && npm install
COPY frontend ./frontend
RUN cd frontend && npm run build

FROM node:20-alpine
WORKDIR /app
COPY backend/package*.json ./backend/
RUN cd backend && npm install --omit=dev
COPY backend ./backend
COPY --from=build /app/frontend/dist ./frontend/dist
EXPOSE 3001
CMD ["sh", "-c", "node backend/src/migrate.js && node backend/src/server.js"]
