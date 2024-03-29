#!/bin/bash
set -e
SCRIPT_DIR=$(cd $(dirname $0); pwd)
pushd ${SCRIPT_DIR}

#build old client code
cd server
npm install
npm run prepare

#build new client code
cd ../client
npm install
npm run build -- --no-clean --mode development

popd
