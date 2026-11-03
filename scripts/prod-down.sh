#!/bin/bash
# Prod counterpart of prod.sh — same file/profile resolution, teardown only.
set -e
docker compose \
    -f compose.yml \
    --profile prod \
    down
