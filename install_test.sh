# build docker image
docker build --rm=true -t wheel_release_test .

# run UT in container
docker run --rm --no-cache --name wheel_UT wheel_release_test npm run UT:server

# run container and start E2E test on host
