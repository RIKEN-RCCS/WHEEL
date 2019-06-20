# WHEEL
__W__orkflow in __H__ierarchical distribut __E__d parall __EL__.

## Prerequirements
[node.js](https://nodejs.org/en/) v8.0.0 or later

## tested environments

| OS                          | node    | checked            |
|-----------------------------|---------|--------------------|
| 18.04.2 LTS (Bionic Beaver) |  8.16.0 | :white_check_mark: |
|                             | 10.16.0 | :white_check_mark: |
| macOS Mojave 10.14.5        |  8.16.0 | :white_check_mark: |
|                             | 10.16.0 | :white_check_mark: |
| windows10 Pro               |  8.16.0 | :white_check_mark: |
|                             | 10.16.0 | :white_check_mark: |


## How to use by cloning this repository
### install
```
> git clone https://gitlab.com/aicshud/WHEEL.git
> cd WHEEL
> git checkout -b dev2018
> git pull origin dev2018 -Xtheirs
> npm install
```

on several Linux distribution (e.g. RHEL, CentOS) you have to rebuild nodegit as follows.
please be sure to install C++, make openssl-devel and libcurl-devel package on your machine before rebuild.
```
> cd WHEEL/node_modules/nodegit
> BUILD_ONLY=yes npm install
```

if you are using node v10, you have to edit package.json before npm install
```
> sed -i -e 's/"bcrypt": "^1.0.3"/"bcrypt": "^3.0.0"/' package.json
> npm install
```



### run
```
> npm start
```
## How to use from package (not available for now)
### install
```
> npm install -g WHEEL-{version}.tgz
```

### run
```
> wheel
```

### uninstall
```
> npm uninstall -g WHEEL
```

## for developpers
### important notice
we are using webpack for client-side code(under the "src" directory).
please note that:

 - do not change any files under public (it will be overwritten after you run build script)
 - you have to run `npm run prepare` after you change somthing in 'src'

### scripts

- `npm start` launch wheel
- `npm run dev` run node-dev and watch script in parallel
- `npm run node-dev`   start server and keep watching to restart server if file change is detected
- `npm run debug` dev with verbose debug log from express and socket.io
- `npm run prepare` call webpack and build client-side code
- `npm run watch` build and keep watching for changes in src files

### how to make package
```
> npm pack
```
it will produce WHEEL-{version}.tgz

