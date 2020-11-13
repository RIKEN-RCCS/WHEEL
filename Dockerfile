#build WHEEL client code
FROM node:erbium-slim as builder
WORKDIR /usr/src/

# copy necessary files
COPY package.json webpack.config.js ./
COPY app/ ./app/
# to install phantomjs
RUN apt-get update && apt -y install bzip2

# build wheel
RUN npm install && npm run prepare && rm -fr ./app/src

#build base image to run WHEEL
FROM node:erbium-slim as runner
RUN apt-get update && apt -y install curl &&\
    curl -s https://packagecloud.io/install/repositories/github/git-lfs/script.deb.sh | bash &&\
    apt -y install python3-pip python3-dev libssl-dev libcurl4-openssl-dev git git-lfs&&\
    pip3 install -U jupyter  &&\
    apt-get clean  &&\
    rm -rf /var/lib/apt/lists/*

# run UT
FROM runner as test
WORKDIR /usr/src/
COPY --from=builder /usr/src .
COPY test test
CMD ["npm", "run", "coverage:server"]

# run WHEEL
FROM runner as exec
WORKDIR /usr/src/

COPY --from=builder /usr/src/ .
COPY package.json webpack.config.js ./
RUN npm prune --production && rm -fr ./app/config

CMD [ "npm", "start" ]
