#!/bin/bash
# Wipes everything (volumes included) and starts fresh — DB data, uploads and
# pgadmin state are gone.
set -e
docker compose down --volumes --remove-orphans
docker compose up --build "$@"
