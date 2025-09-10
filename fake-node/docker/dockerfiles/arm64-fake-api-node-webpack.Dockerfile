# server-base 이미지 부터 시작
FROM pluto-build-base as builder

# 앱 디렉터리 생성
RUN mkdir -p /app/fake-evo
RUN mkdir -p /app/service

WORKDIR /app/

COPY /pnpm-lock.yaml .
COPY /pnpm-workspace.yaml .

# package.json 파일이 변경이 안되면 이 단계는 도커에서 스킵해 주기 때문에 이 단계는 따로 빼준다.
COPY /fake-evo/package.json ./fake-evo

COPY /service/package.json ./service

# lib 의존성 설치
RUN pnpm install

# 앱 소스 추가
ADD . . 

WORKDIR /app/fake-evo

RUN pnpm build:api

# server-base 이미지 부터 시작
FROM pluto-runtime-base

RUN mkdir /app

WORKDIR /app

COPY --from=builder /app/fake-evo/build/out.js /app/

ARG ENV=prod
ENV ENV ${ENV}

ARG STAGE_ENV=prod
ENV STAGE_ENV ${STAGE_ENV}

ENV TZ='Asia/Seoul'

CMD node out.js --env=${ENV} --env=${STAGE_ENV}
