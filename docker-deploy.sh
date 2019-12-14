#!/bin/bash

echo "Connecting to docker hub"
echo "$DOCKER_PASSWORD" | docker login -u "$DOCKER_USERNAME" --password-stdin

echo "Building..."
docker build -t discordirc/discord-irc:latest .

echo "Pushing image to Docker Hub..."
docker push discordirc/discord-irc:latest
