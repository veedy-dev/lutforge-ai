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

# Copy and make startup script executable
COPY start.sh ./
RUN chmod +x start.sh

# Build the application
RUN npm run build

# Expose port
EXPOSE 3000

# Use the startup script
CMD ["./start.sh"] 