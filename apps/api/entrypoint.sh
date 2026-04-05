#!/bin/sh
set -e

echo "Running database migrations..."
node dist/db/schema.js

echo "Starting server..."
exec node dist/index.js
