FROM node:22-bookworm-slim
WORKDIR /app
COPY . .
RUN npm install
EXPOSE 8000
CMD ["npm","start"]