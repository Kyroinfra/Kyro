#!/bin/bash
# Dev: plain `docker compose` auto-loads compose.yml + compose.override.yml and
# the root .env — no stitching. See compose.override.yml for what dev adds.
set -e
docker compose up "$@"
