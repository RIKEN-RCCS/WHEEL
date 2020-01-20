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
COPY package.json webpack.config.js app/ test/ ./
COPY  app/ ./app
COPY  test/ ./test

RUN pwd && ls 
RUN npm install --production && npm run prepare

##remove build tools
RUN npm uninstal --no-save\
    ace-builds\
    css-loader\
    extract-text-webpack-plugin\
    file-loader\
    font-awesome\
    jquery\
    jquery-contextmenu\
    jquery-ui\
    js-cookie\
    json-loader\
    jstree\
    material-design-icons-iconfont\
    mini-css-extract-plugin\
    split.js\
    style-loader\
    svg.draggable.js\
    svgjs\
    uglifyjs-webpack-plugin\
    url-loader\
    viewerjs\
    vue\
    vuetify\
    webpack-cli\
    webpack
  

CMD [ "npm", "start" ]
