#!/bin/bash

set -e  # stop on error

echo "Stopping containers..."
docker compose down

echo "Rebuilding and starting containers..."
docker compose up --build -d

echo "Done."
