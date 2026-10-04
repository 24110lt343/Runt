# Creating a lightweight base image with python
FROM python:3.12-slim

# Disabling the cache making capability of the environment 
ENV PYTHONDONTWRITEBYTECODE=1
ENV PYTHONUNBUFFERED=1

# Creating a custom user to prevent running as root
RUN useradd \
    --create-home \
    --uid 10001 \
    --shell /usr/sbin/nologin \
    runner

#  Setting up the working directory
WORKDIR /app

# Setting the ownership of the directory
RUN chown runner:runner /app

# Switching to the restricted user
USER runner

# Setting up user id
USER 10001:10001

# Commands to run a python file.
CMD ["python", "-I", "/app/main.py"]