#!/bin/bash
set -e
docker compose \
    -f compose.yml \
    -f compose.prod.yml \
    --env-file .env.dev \
    down
