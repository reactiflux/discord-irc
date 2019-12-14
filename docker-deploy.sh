#!/bin/bash

set -e

echo "Connecting to docker hub"
echo "$DOCKER_PASSWORD" | docker login -u "$DOCKER_USERNAME" --password-stdin

REPO=discordirc/discord-irc

echo "Building..."
docker build -t $REPO:latest -t $REPO:$TRAVIS_COMMIT .

echo "Pushing image to Docker Hub..."
docker push $REPO:latest
docker push $REPO:$TRAVIS_COMMIT
