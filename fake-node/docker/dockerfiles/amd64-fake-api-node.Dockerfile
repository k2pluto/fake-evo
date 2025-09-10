# server-base 이미지 부터 시작
FROM pluto-build-base

# 앱 디렉터리 생성
RUN mkdir -p /app/

WORKDIR /app/

COPY /pnpm-lock.yaml .

# package.json 파일이 변경이 안되면 이 단계는 도커에서 스킵해 주기 때문에 이 단계는 따로 빼준다.
COPY /package.json .

# lib 의존성 설치
RUN pnpm install

# 앱 소스 추가
ADD . .

RUN tsc

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
#CMD node ./dist/src/fake-api/main.js --env=${ENV} --env=${STAGE_ENV}

CMD node -r ts-node/register/transpile-only -r tsconfig-paths/register ./dist/src/fake-api/main.js --env=${ENV} --env=${STAGE_ENV}