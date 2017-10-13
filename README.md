# WHEEL
**W**orkflow in **H**ierarchical distribut **E**d parall **EL**

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

 - do not change js files under public
 - you have to run `npm run build` after you change somthing in 'src'


## scripts

- `npm start` launch wheel
- `npm run dev`   start server and automatically restart if some files are changed
- `npm run debug` dev with verbose debug log from express and socket.io
- `npm run build` call webpack and build client-side code
- `npm run watch` build and keep watching for changes in src files
