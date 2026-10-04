# Lightweight Java 21 JDK image
FROM eclipse-temurin:21-jdk-alpine

# Set working directory
WORKDIR /app

# Create a restricted user
RUN adduser -D -u 10001 runner

# Set directory ownership
RUN chown runner:runner /app

USER runner

# Switch to non-root user
USER 10001:10001

# Compile and execute Java program
CMD ["sh", "-c", "javac -d /tmp /app/Main.java && java -cp /tmp Main"]

