FROM node:8

WORKDIR /usr/src/app

COPY package*.json ./

RUN npm i

COPY . .

EXPOSE 3049
EXPOSE 3000
EXPOSE 8080

# CMD ["npm", "test"]
