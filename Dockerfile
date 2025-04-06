# Build Stage
FROM node:22-alpine AS build

WORKDIR /app

# Аргумент для выбора сервиса
ARG SERVICE

# Копируем корневые файлы
COPY package*.json ./
COPY nest-cli.json ./
COPY tsconfig*.json ./
# Copy .env file if it exists
COPY .env* ./
RUN npm ci

# Копируем все приложения и их конфигурации
COPY apps/ ./apps/

# Собираем конкретный сервис 
# Важно: используем корректную команду для моно-репозитория
RUN npm run build -- ${SERVICE}

# Production Stage
FROM node:22-alpine AS production

WORKDIR /app

ARG SERVICE

# Копируем скомпилированный код
COPY --from=build /app/dist/apps/${SERVICE} ./dist/apps/${SERVICE}
COPY --from=build /app/package*.json ./
# Use a conditional copy for the .env file
COPY --from=build /app/.env ./

# Устанавливаем только production зависимости
RUN npm ci --omit=dev

# Устанавливаем переменные окружения
ENV NODE_ENV=production
ARG PORT=3000
ENV PORT=${PORT}
ENV TZ=UTC
ENV APP_SERVICE=${SERVICE}

# Открываем порт
EXPOSE ${PORT}

# Запускаем приложение с правильным путем
CMD node dist/apps/${APP_SERVICE}/main.js