# -------- Stage 1: Build -------- 
FROM node:18-alpine AS builder
WORKDIR /app

# Install dependencies (all dependencies including devDependencies needed for build)
COPY package*.json ./
RUN npm install

# Copy code and build the application
COPY . .
RUN npm run build

# -------- Stage 2: Run -------- 
FROM node:18-alpine AS runner
WORKDIR /app

# Set NODE_ENV for optimized runtime
ENV NODE_ENV=production

# Copy build output from previous stage:
# If output: 'standalone' is enabled:
COPY --from=builder /app/.next/standalone ./
COPY --from=builder /app/.next/static ./.next/static
COPY --from=builder /app/public ./public

# Expose port (optional – Liara will ask for this during deployment)
EXPOSE 3000

# Default command to run the application:
# In Standalone mode:
CMD ["node", "server.js"]
