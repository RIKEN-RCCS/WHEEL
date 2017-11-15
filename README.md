# WHEEL
**W**orkflow in **H**ierarchical distribut**E**d parall**EL**.

## Prerequirements
node.js v8.0.0 or later
<https://nodejs.org/en/>

## How to install
```
> git clone
> npm install
```

## How to use
```
> npm start
```

## important notice for developers
we are using webpack for client-side code(under the "src" directory).
please note that:

 - do not change any files under public (it will be overwrite after you run build script)
 - you have to run `npm run build` after you change somthing in 'src'


## scripts

- `npm start` launch wheel
- `npm run dev` run node-dev and watch script in parallel
- `npm run node-dev`   start server and keep watching to restart server if file change is detected
- `npm run debug` dev with verbose debug log from express and socket.io
- `npm run build` call webpack and build client-side code
- `npm run watch` build and keep watching for changes in src files
