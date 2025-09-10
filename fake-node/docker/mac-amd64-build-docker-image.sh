#! /bin/bash

docker buildx build --platform linux/amd64  -f ./dockerfiles/pluto-runtime-base.Dockerfile -t pluto-runtime-base .

docker buildx build --platform linux/amd64  -f ./dockerfiles/pluto-build-base.Dockerfile -t pluto-build-base .

cd ..

docker buildx build --platform linux/amd64 --build-arg ENV=$2 --build-arg STAGE_ENV=$2 -f ./docker/dockerfiles/$1.Dockerfile -t $1:$2 .

docker tag $1:$2 633624879762.dkr.ecr.ap-northeast-1.amazonaws.com/$1:$2

docker login --username AWS -p $(aws ecr get-login-password --region ap-northeast-1 --profile faker) 633624879762.dkr.ecr.ap-northeast-1.amazonaws.com

docker push 633624879762.dkr.ecr.ap-northeast-1.amazonaws.com/$1:$2
