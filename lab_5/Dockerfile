

FROM node:24-alpine

WORKDIR /app

COPY package.json package-lock.json ./
# COPY dist ./dist
# COPY .env .
COPY agent_new.js .
COPY server.js .
RUN npm ci

EXPOSE 3001
# ONLY WHEN RUNNING THE CONTAINER 
CMD ["node", "server.js"] 
