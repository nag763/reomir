# Stage 1: Build the Next.js application
FROM node:23-alpine AS builder

ARG NEXT_PUBLIC_API_GATEWAY_URL
ENV NEXT_PUBLIC_API_GATEWAY_URL=${NEXT_PUBLIC_API_GATEWAY_URL}

WORKDIR /app

# Copy package.json and package-lock.json (or yarn.lock)
COPY package*.json ./

# Install dependencies securely and efficiently
RUN npm i

# Copy the rest of the application code
COPY . .

# Ensure 'next.config.js' is present for standalone build
COPY next.config.mjs ./

# Build the Next.js application for standalone output
# Next.js will use the ENV variables defined above during this build process
RUN npm run build

# Stage 2: Create the production image
FROM node:23-alpine

WORKDIR /app

# Create a non-root user and group for enhanced security
RUN addgroup -S nextjs && adduser -S nextjs -G nextjs

# Copy the standalone output from the builder stage with correct ownership
# Only copy necessary build artifacts, not the build-time env vars
COPY --from=builder /app/public ./public
COPY --from=builder --chown=nextjs:nextjs /app/.next/standalone ./
COPY --from=builder --chown=nextjs:nextjs /app/.next/static ./.next/static

# Set the ownership of the application directory to the non-root user
USER nextjs

# Expose the port your Next.js app will run on (default is 3000)
EXPOSE 3000

# Set the command to run the Next.js application in standalone mode
# Note: The build-time env vars are NOT present here unless explicitly passed
#       during 'gcloud run deploy' or set in Cloud Run service configuration.
CMD ["node", "server.js"]