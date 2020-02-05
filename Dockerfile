FROM node:erbium-slim

#install necessary packages for wheel-core 
RUN apt-get update &&\
    apt -y install python3-pip python3-dev libssl-dev libcurl4-openssl-dev git&&\
    pip3 install -U jupyter  &&\
    apt-get clean  &&\
    rm -rf /var/lib/apt/lists/*

# Create app directory
WORKDIR /usr/src/

# copy necessary files
COPY package.json webpack.config.js ./
COPY  app/ ./app/

RUN npm install && npm run prepare

##remove build tools
RUN npm prune --production

CMD [ "npm", "start" ]
