#!/bin/bash
# Rebuild prod images and restart (same resolution as prod.sh).
# API_REPLICAS scales api replicas (default 3).
set -e
docker compose \
    -f compose.yml \
    --profile prod \
    --scale api=${API_REPLICAS:-3} \
    up --build --force-recreate "$@"
