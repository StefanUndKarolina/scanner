# Use Node.js 22.14.0 as the base image
FROM node:22.14.0

# Set the working directory inside the container
WORKDIR /app

# Copy package.json and package-lock.json first for caching
COPY package.json package-lock.json ./

# Install dependencies
RUN npm install

# Copy the project files into the container
COPY . .

# Build the extensions (hooks and endpoints)
RUN cd extensions/hooks && npm install && npm run build
RUN cd extensions/endpoints && npm install && npm run build

# Expose the Directus port
EXPOSE 8055

# Start Directus
CMD ["npx", "directus", "start"]
