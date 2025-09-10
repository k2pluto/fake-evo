#! /bin/bash

docker build  --progress=plain --build-arg ENV=$2 --build-arg STAGE_ENV=$2 -f ./docker/$1.Dockerfile -t $1:$2 .

docker tag $1:$2 633624879762.dkr.ecr.ap-northeast-1.amazonaws.com/$1:$2

docker login --username AWS -p $(aws ecr get-login-password --region ap-northeast-1 --profile faker) 633624879762.dkr.ecr.ap-northeast-1.amazonaws.com

docker push 633624879762.dkr.ecr.ap-northeast-1.amazonaws.com/$1:$2
