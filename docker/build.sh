#!/bin/bash

if [[ $TRAVIS_BRANCH == 'master' && $TRAVIS_PULL_REQUEST == 'false' ]]; then
    changed_lines=$(git diff HEAD~1 HEAD docker/Dockerfile | wc -l)

    if [ $changed_lines != '0' ]; then
        echo "Connecting to docker hub"
        echo "$DOCKER_PASSWORD" | docker login -u "$DOCKER_USERNAME" --password-stdin

        echo "Dockerfile was changed"

        echo "Building..."
        docker build -t reactiflux/discord-irc:latest -f docker/Dockerfile .

        echo "Pushing image to Docker Hub..."
        docker push reactiflux/discord-irc:latest
    else
      echo "Dockerfile was not changed, not building"
    fi
else
    echo "Skipping deploy; This is a PR or not on the master branch"
fi
