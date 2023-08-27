FROM denoland/deno

RUN mkdir /bot
COPY . /bot

WORKDIR /bot

RUN deno task prepare && \
	mkdir /config

ENTRYPOINT ["/bot/discord-irc"]
