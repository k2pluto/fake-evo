# server-base 이미지 부터 시작
FROM oven/bun:1.1.27-alpine as builder

RUN mkdir /app

WORKDIR /app

COPY bun.lockb . 
COPY package.json . 

# Install dependencies
RUN bun install

# 앱 소스 추가
ADD . .

RUN bun build src/main.ts --target bun --outdir ./dist

# server-base 이미지 부터 시작
FROM oven/bun:1.1.27-alpine

RUN mkdir /app

WORKDIR /app

COPY --from=builder /app/dist /app/dist

#RUN cat ./dist/main.js

ARG ENV=prod
ENV ENV ${ENV}

ARG STAGE_ENV=prod
ENV STAGE_ENV ${STAGE_ENV}

EXPOSE 443

ENV TZ='Asia/Seoul'
# 런타임 명령어 정의
CMD ["bun", "dist/main.js"]