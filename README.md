# WHEEL
__W__orkflow in __H__ierarchical distribut __E__d parall __EL__.

## Prerequirements
[node.js](https://nodejs.org/en/) v8.0.0 or later

## How to use by cloning this repository
install
```
> git clone https://gitlab.com/aicshud/WHEEL.git
> cd WHEEL
> git checkout -b dev2017-GUI
> git pull origin dev2017-GUI
> npm install
```
run
```
> npm start
```
## How to install from package (not available for now)
```
> npm install -g WHEEL-{version}.tgz
```

## How to use
```
> wheel
```

## How to uninstall
```
> npm uninstall -g WHEEL
```

# for developpers
## important notice
we are using webpack for client-side code(under the "src" directory).
please note that:

 - do not change any files under public (it will be overwritten after you run build script)
 - you have to run `npm run prepare` after you change somthing in 'src'

## scripts

- `npm start` launch wheel
- `npm run dev` run node-dev and watch script in parallel
- `npm run node-dev`   start server and keep watching to restart server if file change is detected
- `npm run debug` dev with verbose debug log from express and socket.io
- `npm run prepare` call webpack and build client-side code
- `npm run watch` build and keep watching for changes in src files

## how to make package
```
> npm pack
```
it will produce WHEEL-{version}.tgz

