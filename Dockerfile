FROM denoland/deno
ENV LIBRARY_PATH=/lib:/usr/lib

RUN mkdir /bot
COPY . /bot

WORKDIR /bot

RUN deno task prepare && \
	mkdir /config

ENTRYPOINT ["/bot/discord-irc"]
