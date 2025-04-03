# Build Stage
FROM node:22-alpine AS build

WORKDIR /app

# Copy package files and install dependencies
COPY package*.json ./
RUN npm ci

# Copy source code and configs
COPY . .
COPY .env .

# Build the application
RUN npm run build

# Production Stage
FROM node:22-alpine AS production

WORKDIR /app

# Copy package files and install only production dependencies
COPY package*.json ./
RUN npm ci --omit=dev

# Copy built application and configs from build stage
COPY --from=build /app/dist ./dist
COPY --from=build /app/node_modules ./node_modules
COPY --from=build /app/.env .

# Set environment variables
ENV NODE_ENV=production
ENV PORT=$PORT
ENV TZ=UTC

# Expose the application port
EXPOSE $PORT

# Start the application
CMD ["node", "dist/main"]