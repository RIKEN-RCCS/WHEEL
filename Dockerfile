FROM node:8

# Create app directory
WORKDIR /usr/src/app

# copy necessary files
COPY package*.json webpack.config.js ./
COPY app ./app


RUN apt update
# install jupyter not work for now...
RUN apt -y install python3-pip python3-dev
RUN pip3 install jupyter

# install WHEEL
RUN npm install
RUN npm run prepare

EXPOSE 8089
CMD [ "npm", "start" ]
