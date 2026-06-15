# CREATED BY SKILL
FROM node:20-alpine

WORKDIR /app

COPY package*.json ./
# RUN npm ci --omit=dev

COPY ./server ./server
COPY ./client ./client

RUN cd client && npm install 
RUN cd client && npm run build



EXPOSE 3002

CMD ["npm", "start"]



