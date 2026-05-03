#!/bin/bash
set -e

docker compose \
  -f compose.yml \
  -f compose.dev.yml \
  --env-file .env.dev \
  up "$@"
