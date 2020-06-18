FROM node:erbium-slim

# Create app directory
WORKDIR /usr/src/

# copy necessary files
COPY package.json webpack.config.js ./
COPY app/ ./app/

# install necessary packages for wheel
# build wheel
# remove devdependencies to reduce image size
RUN apt-get update &&\
    apt -y install python3-pip python3-dev libssl-dev libcurl4-openssl-dev git&&\
    pip3 install -U jupyter  &&\
    apt-get clean  &&\
    rm -rf /var/lib/apt/lists/* &&\
    npm install &&\
    npm run prepare &&\
    npm prune --production

CMD [ "npm", "start" ]
