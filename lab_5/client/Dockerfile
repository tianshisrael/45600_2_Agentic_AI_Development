# CREATED BY SKILL - dockerizing-node-js
# Vite dev server: copy app, install deps, run with host binding for Docker networking.
# DEV
# FROM node:24-alpine

# WORKDIR /app

# COPY package.json package-lock.json ./
# RUN npm ci

# COPY . .

# EXPOSE 5173

# CMD ["npm", "run", "dev", "--", "--host", "0.0.0.0", "--port", "5173"]


# PROD

FROM node:24-alpine

WORKDIR /app

COPY package.json package-lock.json ./
COPY dist ./dist
COPY server.js ./server.js
RUN npm ci
EXPOSE 3000
# ONLY WHEN RUNNING THE CONTAINER 
CMD ["npm", "start"] 
