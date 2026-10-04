# Lightweight Node.js image
FROM node:22-alpine

# Set working directory
WORKDIR /app

# Create a restricted user
RUN adduser -D -u 10001 runner

# Set directory ownership
RUN chown runner:runner /app

# Switch to non-root user
USER 10001:10001

# Execute JavaScript program
CMD ["node", "/app/main.js"]

