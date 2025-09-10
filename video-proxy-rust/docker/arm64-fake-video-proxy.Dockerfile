FROM rust:1.79 as builder
WORKDIR /usr/src/myapp
COPY . .
#RUN apk add openssl-dev musl-dev
RUN cargo install --path .

# server-base 이미지 부터 시작
FROM debian:bookworm-slim
RUN apt-get update && apt install -y openssl
COPY --from=builder /usr/local/cargo/bin/main /usr/local/bin/main
COPY ./key ./key
CMD ["main"]