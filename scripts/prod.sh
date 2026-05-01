#!/bin/bash
set -e

docker compose \
  -f compose.yml \
  --env-file .env \
  up "$@"
