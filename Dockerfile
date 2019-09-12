FROM node:8

# Create app directory
WORKDIR /usr/src/app

# copy necessary files
COPY package*.json webpack.config.js ./
COPY app ./app


RUN apt update
# install jupyter not work for now...
RUN apt -y install python3-pip python3-dev openssl
RUN pip3 install jupyter

# create self-signed certification files
RUN echo "[dn]\nCN=localhost\n[req]\ndistinguished_name = dn\n[EXT]\nsubjectAltName=DNS:localhost\nkeyUsage=digitalSignature\nextendedKeyUsage=serverAuth" >self-signed-certification.conf
RUN openssl req -x509 -out app/db/server.crt -keyout app/db/server.key -newkey rsa:2048 -nodes -sha256 -subj '/CN=localhost' -extensions EXT -config self-signed-certification.conf
RUN rm self-signed-certification.conf

# install dependent packages
RUN npm install
RUN npm run prepare

CMD [ "npm", "start" ]
