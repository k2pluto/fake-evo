# Docker Hub 에 있는 node 의 최신 버전인 13의 alpine 리눅스 버전을 사용
FROM node:20-alpine

#타입스크립트 설치
RUN npm i -g typescript@5
RUN npm i -g pnpm
