
# Creating a lightweight base image with GCC
FROM gcc:14-bookworm

# Setting up the working directory
WORKDIR /app

# Creating a custom user to prevent running as root
RUN useradd \
    --create-home \
    --uid 10001 \
    --shell /usr/sbin/nologin \
    runner

# Setting the ownership of the directory
RUN chown runner:runner /app


USER runner

# Switching to the restricted user
USER 10001:10001

# Compiling and running the C++ program
CMD ["sh", "-c", "g++ -std=c++17 -O2 -pipe -o /tmp/main /app/main.cpp && /tmp/main"]

