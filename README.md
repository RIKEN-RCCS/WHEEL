# WHEEL
__W__ orkflow in __H__ ierarchical distribut __E__ d parall __EL__.

## Prerequirements
latest version of [docker](https://www.docker.com/)
[node.js](https://nodejs.org/en/) v12 or later

## How to use with docker
```
> git clone https://gitlab.com/aicshud/WHEEL.git
> cd WHEEL
> docker build -t wheel .
> docker run -d -v ${HOME}:/root -v ${PWD}/app/config:/usr/src/app/config -p 8089:8089 -p 8090:8090 wheel
```
please note that you have to place your certification files for https under ./app/config before docker run

## How to use without docker (not recomended)
### install
```
> git clone https://gitlab.com/aicshud/WHEEL.git
> cd WHEEL
> npm install
```

on several Linux distribution (e.g. RHEL, CentOS) you have to rebuild nodegit as follows.
please be sure to install C++, make openssl-devel and libcurl-devel package on your machine before rebuild.
```
> sudo yum install -y gcc-c++ openssl-devel libcurl-devel
> cd WHEEL/node_modules/nodegit
> BUILD_ONLY=yes npm install
```

### run
```
> npm start
```

## for developpers
### important notice
we are using webpack for client-side code(under the "src" directory).
please note that:

 - do not change any files under public (it will be overwritten after you run build script)
 - you have to run `npm run prepare` after you change something in 'src'

### scripts
- `npm start` launch wheel
- `npm run dev` run node-dev and watch script in parallel
- `npm run node-dev`   start server and keep watching to restart server if file change is detected
- `npm run debug` dev with verbose debug log from express and socket.io
- `npm run prepare` call webpack and build client-side code
- `npm run watch` build and keep watching for changes in src files
