# server-base 이미지 부터 시작
FROM amd64-server-base

# 앱 디렉터리 생성
RUN mkdir -p /usr/server/fake-evo

WORKDIR /usr/server/fake-evo

# package.json 파일이 변경이 안되면 이 단계는 도커에서 스킵해 주기 때문에 이 단계는 따로 빼준다.
COPY /fake-evo/package.json .
COPY /fake-evo/yarn.lock .

# lib 의존성 설치
RUN yarn install --network-timeout 600000


WORKDIR /usr/server/service

# package.json 파일이 변경이 안되면 이 단계는 도커에서 스킵해 주기 때문에 이 단계는 따로 빼준다.
COPY /service/package.json .
COPY /service/yarn.lock .

# lib 의존성 설치
RUN yarn install --network-timeout 600000

WORKDIR /usr/server

# 앱 소스 추가
ADD service ./service

ADD fake-evo ./fake-evo

WORKDIR /usr/server/fake-evo

RUN tsc

ARG ENV=prod
ENV ENV ${ENV}

ARG STAGE_ENV=prod
ENV STAGE_ENV ${STAGE_ENV}
ENV GAME_TYPE=casino

ENV TZ='Asia/Seoul'
# 런타임 명령어 정의
CMD node ./dist/fake-evo/src/fake-history/main.js --env=${ENV} --env=${STAGE_ENV}