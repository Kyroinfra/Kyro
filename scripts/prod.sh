#!/bin/bash
# Prod: bypass the dev override with an explicit -f and bring nginx via the
# prod profile. API_REPLICAS scales api replicas (default 3).
set -e
docker compose \
    -f compose.yml \
    --profile prod \
    --scale api=${API_REPLICAS:-3} \
    up -d "$@"
