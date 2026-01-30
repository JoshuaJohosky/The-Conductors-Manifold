# Mobile Development Dockerfile
FROM node:20-slim

# Install Expo CLI globally
RUN npm install -g expo-cli @expo/ngrok

# Set working directory
WORKDIR /app

# Copy package files
COPY package*.json ./

# Install dependencies
RUN npm install

# Copy app source
COPY . .

# Expose ports
EXPOSE 8081 19000 19001 19002

# Start Expo
CMD ["npx", "expo", "start", "--tunnel"]
