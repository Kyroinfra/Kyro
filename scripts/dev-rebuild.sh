#!/bin/bash
# Rebuild dev images and restart everything. Use for Dockerfile changes or
# dependency installs outside the bind-mounted paths.
set -e
docker compose up --build --force-recreate "$@"
