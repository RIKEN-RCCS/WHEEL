#!/bin/bash -e
TAG=wheel_release_test 
TAG_TEST_SERVER=wheel_release_test_server

function cleanup()
{
    echo "============================================="
    echo "start cleanup process"
    docker stop ${TAG} ${TAG_TEST_SERVER}
    sleep 3
    rm -fr ${CONFIG_DIR}
    echo "remaining container"
    docker ps -a
}

#build test server container
pushd testServer/docker_pbspro_sshd
docker build --rm=true -t ${TAG_TEST_SERVER}  .
rt=$?
popd
if [ ${rt} -ne 0 ];then
  echo "ERROR: build test server failed ${rt}"
  cleanup
  exit 1
fi

# start test server
docker run --rm -d --name ${TAG_TEST_SERVER} ${TAG_TEST_SERVER}
if [ $? -ne 0 ];then
  echo "ERROR: run test server failed $?"
  cleanup
  exit 2
fi
IPAddress=$(docker inspect -f '{{range .NetworkSettings.Networks}}{{.IPAddress}}{{end}}' ${TAG_TEST_SERVER})

# build WHEEL docker image
pushd ../
docker build --rm=true -t ${TAG} .
rt=$?
popd
if [ ${rt} -ne 0 ];then
  echo "ERROR: build wheel failed ${rt}"
  cleanup
  exit 3
fi

# crate config files
CONFIG_DIR=$(mktemp -d tmp.XXXXXXXXXX)

# create self-signed-certification files
echo '[dn]
CN=localhost
[req]
distinguished_name = dn
[EXT]
subjectAltName=DNS:localhost
keyUsage=digitalSignature
extendedKeyUsage=serverAuth
' |  openssl req -x509 -out ${CONFIG_DIR}/server.crt -keyout ${CONFIG_DIR}/server.key  -newkey rsa:2048 \
-nodes -sha256  -subj '/CN=localhost' -extensions EXT -config -

#copy default setting files
cp ../app/config/{server,jobScheduler}.json ${CONFIG_DIR}

#create rmeotehost.json
{
echo '[{'
echo '  "name": "testServer",'
echo '  "host": "'${IPAddress}'",'
echo '  "path": "/home/pbsuser",'
echo '  "keyFile": null,'
echo '  "username": "pbsuser",'
echo '  "numJob": 5,'
echo '  "port": 22,'
echo '  "id": "dummy-id",'
echo '  "jobScheduler": "PBSPro",'
echo '  "renewInterval": 0,'
echo '  "renewDelay": 0,'
echo '  "statusCheckInterval": 10,'
echo '  "maxStatusCheckError": 10'
echo '}]' 
} > ${CONFIG_DIR}/remotehost.json

#create wheel container
docker run --env "WHEEL_TEST_REMOTEHOST=testServer" \
           --env "WHEEL_TEST_REMOTE_PASSWORD=hoge"  \
           --rm -d\
           -v $(readlink -f ${CONFIG_DIR}):/usr/src/app/config  \
           -p 8089:8089  \
           -p 8090:8090  \
           --name ${TAG} ${TAG}
if [ $? -ne 0 ];then
  echo "ERROR: run wheel failed $?"
  cleanup
  exit 4
fi
          
# install test tools
docker cp ../test/ ${TAG}:/usr/src/test/
if [ $? -ne 0 ];then
  echo "ERROR: copy test files failed $?"
  cleanup
  exit 5
fi

# install devdependencies
docker exec ${TAG} npm install \
  chai\
  chai-as-promised\
  chai-fs\
  chai-iterator\
  chai-json-schema\
  mocha\
  npm-run-all\
  nyc\
  rewire\
  sinon\
  sinon-chai
 
if [ $? -ne 0 ];then
  echo "ERROR: install test tools failed $?"
  cleanup
  exit 6
fi

# run UT on container
docker exec ${TAG} npm run UT:server
if [ $? -ne 0 ];then
  echo "ERROR: unit test failed $?"
  cleanup
  exit 7
fi

#run E2E test from host
#TODO
# please note that wheel and jupyter is already running at port 8089, 8090 respectively 

#stop containers
cleanup
