#!/bin/bash

if [[ $TRAVIS_BRANCH == 'master' && $TRAVIS_PULL_REQUEST == 'false' ]]; then
    echo "Connecting to docker hub"
    echo "$DOCKER_PASSWORD" | docker login -u "$DOCKER_USERNAME" --password-stdin

    echo "Building..."
    docker build -t reactiflux/discord-irc:latest -f docker/Dockerfile .

    echo "Pushing image to Docker Hub..."
    docker push reactiflux/discord-irc:latest
else
    echo "Skipping deploy; This is a PR or not on the master branch"
fi
