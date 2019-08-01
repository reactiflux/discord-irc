FROM node:8-alpine
ENV LIBRARY_PATH=/lib:/usr/lib

RUN mkdir /bot
COPY . /bot

WORKDIR /bot

RUN apk add --update tini && \
	npm install && \
	npm run build && \
	mkdir /config

ENTRYPOINT ["/sbin/tini", "--"]
CMD ["npm", "start", "--", "--config", "/config/config.json"]
