#!/bin/bash
# Tail logs of the dev stack (flagless compose resolution; add `-f compose.yml`
# after the tool name to point it at a prod-style stack instead).
set -e
docker compose logs -f --tail=100 "$1"
