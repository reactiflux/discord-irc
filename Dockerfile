FROM denoland/deno

RUN mkdir /bot
COPY . /bot

WORKDIR /bot

RUN deno task prepare

ENTRYPOINT ["/bot/discord-irc"]
