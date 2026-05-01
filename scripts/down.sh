#!/bin/bash
set -e

docker compose -f compose.yml -f compose.dev.yml down

# Verify nothing is left
# docker ps -a | grep kyro
#
# Start fresh
# ./scripts/dev.sh -d
