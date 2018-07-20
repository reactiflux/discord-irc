#!/bin/bash

if [[ $CI_COMMIT_REF_SLUG == 'master' ]]; then
    echo "Connecting to docker hub"
    echo "$DOCKER_PASSWORD" | docker login -u "$DOCKER_USERNAME" --password-stdin

    changed_lines=$(git diff HEAD~1 HEAD docker/Dockerfile | wc -l)

    echo "Dockerfile was changed"

    echo "Building..."
    docker build -t reactiflux/discord-irc:latest -f docker/Dockerfile .

    echo "Pushing image to Docker Hub..."
    docker push reactiflux/discord-irc:latest
else
    echo "Skipping deploy; Dockerfile was not changed"
fi
