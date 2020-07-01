# WHEEL
__W__ orkflow in __H__ ierarchical distribut __E__ d parall __EL__.

## Prerequirements
latest version of [docker](https://www.docker.com/)

## How to use
1. create new directory (hereafter referrd to as `CONFIG_DIR`)
2. download following 2 files to the `CONFIG_DIR`
    - [jobScheduler.json](https://raw.githubusercontent.com/RIKEN-RCCS/WHEEL/master/app/config/jobScheduler.json)
    - [server.json](https://raw.githubusercontent.com/RIKEN-RCCS/WHEEL/master/app/config/server.json)
3. create or server certification and key file for https, and put them into `CONFIG_DIR`
4. type following command

```
> docker run -d -v ${HOME}:/root -v CONFIG_DIR:/usr/src/app/config -p 8089:8089 -p 8090:8090 tmkawanabe/wheel:latest
```

`CONFIG_DIR` must be absolute path in host machine.

above command line, we specify following options

- project files will be create under ${HOME}
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

#### about CI process
if you push new commit which includes user guide update,
CI runner will commit new version of html user guide.
so, you have to git pull for master branch after push and CI process is finished.

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
