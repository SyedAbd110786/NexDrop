# Use the official Node.js image
FROM node:18-alpine

# Create and change to the app directory
WORKDIR /usr/src/app

# Copy root package.json
COPY package.json ./

# Install dependencies
RUN npm install

# Copy the rest of the application code
COPY . .

# Expose the port (Back4app expects 8080)
EXPOSE 8080

# Start the server
CMD ["npm", "start"]
