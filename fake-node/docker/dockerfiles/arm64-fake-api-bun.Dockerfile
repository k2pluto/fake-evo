# server-base 이미지 부터 시작
FROM oven/bun:1.1.12-alpine

# 앱 디렉터리 생성
RUN mkdir -p /usr/server/fake-evo

WORKDIR /usr/server/

COPY /pnpm-workspace.yaml .
COPY /pnpm-lock.yaml .

WORKDIR /usr/server/fake-evo

# Install python/pip for node-gyp
#RUN apk add g++ make py3-pip

# package.json 파일이 변경이 안되면 이 단계는 도커에서 스킵해 주기 때문에 이 단계는 따로 빼준다.
COPY /fake-evo/package.json .

# lib 의존성 설치
RUN bun install


WORKDIR /usr/server/service

# package.json 파일이 변경이 안되면 이 단계는 도커에서 스킵해 주기 때문에 이 단계는 따로 빼준다.
COPY /service/package.json .

# lib 의존성 설치
RUN bun install

WORKDIR /usr/server

# 앱 소스 추가
ADD service ./service

ADD fake-evo ./fake-evo

WORKDIR /usr/server/fake-evo

ARG ENV=prod
ENV ENV ${ENV}

ARG STAGE_ENV=prod
ENV STAGE_ENV ${STAGE_ENV}
ENV GAME_TYPE=casino

EXPOSE 443
EXPOSE 80
EXPOSE 3000
EXPOSE 4000

ENV TZ='Asia/Seoul'
# 런타임 명령어 정의
CMD ["bun", "src/fake-api/bun.ts", "--env=${ENV}", "--env=${STAGE_ENV}"]
