#build WHEEL client code
FROM node:erbium-slim as builder
WORKDIR /usr/src/

# to install phantomjs
RUN apt-get update && apt -y install bzip2

# copy necessary files
COPY client client
COPY server server

RUN cd server && npm install && npm run prepare &&\
    cd ../client && npm install && npm run build &&\
    mv dist/*.html ../server/app/views/  &&\
    cp -r dist/* ../server/app/public/  &&\
    cp -r src/oldImgTmp/* ../server/app/public/image/

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
COPY --from=builder /usr/src/server/ .
CMD ["npm", "run", "coverage:server"]

# run WHEEL
FROM runner as exec
WORKDIR /usr/src/

COPY --from=builder /usr/src/server/ .
RUN npm prune --production && rm -fr ./app/config

CMD [ "npm", "start" ]
