# 페이크는 16버전으로 해야 에볼루션의 웹소켓이 열린다.
FROM pluto-runtime-base

#타입스크립트 설치
RUN npm i -g typescript@5
RUN npm i -g pnpm

