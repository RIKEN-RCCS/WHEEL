#!/bin/bash
TAG=wheel_release_test 
# build docker image
docker build  --no-cache --rm=true -t ${TAG} .

# start container
docker run -d -p 8089:8089 -p 8090:8090 --rm --name wheel_test ${TAG}

# install test tools
docker cp test/ wheel_test:/usr/src/test/
docker exec wheel_test npm install

# run UT on container
docker exec wheel_test npm run UT:server

#run E2E test from host
#TODO

#cleanup 
docker exec wheel_test rm -fr /usr/src/test
docker stop wheel_test
docker rmi --force ${TAG}