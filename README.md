# WHEEL
__W__ orkflow in __H__ ierarchical distribut __E__ d parall __EL__.

## Prerequirements
latest version of [docker](https://www.docker.com/)

## How to use
```
> docker run -d -v ${HOME}:/root -v ${PWD}/app/config:/usr/src/app/config -p 8089:8089 -p 8090:8090 tmkawanabe/wheel:latest
```

above command line means:

- project files will be create under ${HOME}
- all configuration files (including server certification and key) will be read from ${PWD}/app/config
- port 8089 and 8090 is used for WHEEL itself and jupyter notebook respectively

for detailed information about configuration, see [administrator's guide](./documentMD/AdminGuide.md)

for user's guide, see [user's guide](https://riken-rccs.github.io/WHEEL/)


## history
WHEEL was originaly developed by Research Institute for Information Technology(RITT), Kyushu University in 2016
It is still hosted at https://github.com/RIIT-KyushuUniv/WHEEL

RIKEN R-CCS forks it and continues the development


## for developpers
### important notice
#### about client-code
We are using webpack for client-side code(under the "src" directory).
please note that:

 - do not change any files under public (it will be overwritten after you run build script)
 - you have to run `npm run prepare` after you change something in 'src'

#### about user document
All html documents under docs directory is converted from documentMD/user\_guide in CI process.
so, plese do NOT change any files under docs directory.


### scripts
- `npm start` launch wheel
- `npm run lint` call eslint and fix JS files
- `npm run UT:server` unit test for server side code
- `npm run UT:client` unit test for client side code
- `npm run coverage:server` make coverage report after server side UT
- `npm run coverage:client` make coverage report after client side UT
- `npm run E2E` run E2E test
- `npm run dev` run node-dev and watch script in parallel
- `npm run node-dev`   start server and keep watching to restart server if file change is detected
- `npm run prepare` call webpack and build client-side code
- `npm run watch` build and keep watching for changes in src files
- `npm run license-report` make lincense report about dependent packages
- `npm run convertDoc` make html version of user's guide under documentMD/_user_guide
