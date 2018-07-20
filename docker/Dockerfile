FROM node:8-alpine
RUN apk add --update tini

RUN mkdir /bot
COPY . /bot

WORKDIR /bot

ENV LIBRARY_PATH=/lib:/usr/lib

RUN npm install
RUN npm run build
RUN mkdir /config

ENTRYPOINT ["/sbin/tini", "--"]
CMD ["npm", "start", "--", "--config", "/config/config.json"]
