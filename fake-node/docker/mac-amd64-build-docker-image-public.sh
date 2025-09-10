#! /bin/bash
docker buildx build --platform linux/amd64  -f ./dockerfiles/amd64-server-base.Dockerfile -t amd64-server-base .

cd ..

docker buildx build --platform linux/amd64 --build-arg ENV=$2 --build-arg STAGE_ENV=$2 -f ./docker/dockerfiles/$1.Dockerfile -t $1:$2 .

docker tag $1:$2 public.ecr.aws/s6p9h5e2/$1:$2

#aws ecr-public get-login-password --region ap-northeast-1 --profile faker | docker login --username AWS --password-stdin public.ecr.aws/s6p9h5e2

docker login --username AWS -p $(aws ecr-public get-login-password --region us-east-1 --profile faker) public.ecr.aws/s6p9h5e2

docker push public.ecr.aws/s6p9h5e2/$1:$2
