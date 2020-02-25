#!/bin/bash -e
TAG=wheel_release_test 
TAG_TEST_SERVER=wheel_release_test_server

cleanup()
{
    echo "============================================="
    echo "starting cleanup process"
    docker stop ${TAG} ${TAG_TEST_SERVER}
    sleep 3
    rm -fr ${CONFIG_DIR}
    echo "remaining container"
    docker ps -a
}

onError()
{
    echo "============================================="
    echo "Error !!"
    cleanup
    exit 1
}

trap onError ERR


#build test server container
pushd testServer/docker_pbspro_sshd
docker build --rm=true -t ${TAG_TEST_SERVER}  .
popd

# build WHEEL docker image
pushd ../
docker build --rm=true -t ${TAG} .
popd

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
#TODO create remotehost.json in ${CONFIG_DIR}
cp ../app/config/{server,jobScheduler}.json ${CONFIG_DIR}

# start containers
docker run --rm -d -v $(readlink -f ${CONFIG_DIR}):/usr/src/app/config -p 8089:8089 -p 8090:8090 --name ${TAG} ${TAG}
docker run --rm -d -p 20022:22 --name ${TAG_TEST_SERVER} ${TAG_TEST_SERVER}

# install test tools
docker cp ../test/ ${TAG}:/usr/src/test/

# re-install devdependencies
docker exec ${TAG} npm install

# run UT on container
docker exec ${TAG} npm run UT:server

#run E2E test from host
#TODO
# please note that wheel and jupyter is already running at port 8089, 8090 respectively 

#stop containers
cleanup
