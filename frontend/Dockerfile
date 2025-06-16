# Frontend Dockerfile for Koyeb deployment
FROM node:18-alpine

# Set working directory
WORKDIR /app

# Copy package files explicitly
COPY package.json package-lock.json ./

# Install dependencies (including dev dependencies needed for build)
RUN npm ci

# Copy application code
COPY . .

# Build the application
RUN npm run build

# Expose port
EXPOSE 3000

# Command to run the application
CMD ["npm", "start"] 