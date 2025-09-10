
docker build -f ./dockerfiles/amd64-server-base.Dockerfile -t amd64-server-base .

cd ..

docker build --build-arg ENV=%2 --build-arg STAGE_ENV=%2 --progress=plain -f ./docker/dockerfiles/%1.Dockerfile -t %1:%2 .

docker tag %1:%2 633624879762.dkr.ecr.ap-northeast-1.amazonaws.com/%1:%2

rem AWS ecr get-login 명령어로 docker login 스크립트를 받은 후 docker login 스크립트를 실행

@for /F "delims=" %%i in ('aws ecr get-login --no-include-email --region ap-northeast-1 --profile faker') do @(
    set output=%%i
)

call %output%

docker push 633624879762.dkr.ecr.ap-northeast-1.amazonaws.com/%1:%2

pause