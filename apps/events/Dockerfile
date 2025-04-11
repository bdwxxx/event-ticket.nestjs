# Build Stage
FROM node:22-alpine AS build

WORKDIR /app

# Copy package files
COPY package*.json ./
COPY tsconfig.json ./
COPY nest-cli.json ./

# Install dependencies
RUN npm install

# Copy source code
COPY src/ ./src/

# Build the app
RUN npm run build

# Production Stage
FROM node:22-alpine AS production

WORKDIR /app

# Copy compiled code and package files
COPY --from=build /app/dist ./dist
COPY --from=build /app/package*.json ./

# Install production dependencies only
RUN npm install --omit=dev

# Set environment variables
ENV NODE_ENV=production
ENV TZ=UTC

# Expose the app port
EXPOSE 3001

# Start the app
CMD ["node", "dist/main.js"]
