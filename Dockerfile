FROM lukechannings/deno AS builder
WORKDIR /app

COPY . .

RUN deno task prepare

FROM debian:stable-slim
WORKDIR /app

COPY --from=builder /app/discord-irc .

ENTRYPOINT ["/app/discord-irc"]
