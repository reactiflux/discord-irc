push:
	docker-compose push discord-irc
build:
	docker-compose -f docker-compose.yml up -d --build --remove-orphans
