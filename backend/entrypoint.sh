#!/bin/sh
set -e

# Wait for PostgreSQL to accept connections before running migrations.
DB_HOST="${DB_HOST:-postgres}"
DB_PORT="${DB_PORT:-5432}"

echo "Waiting for PostgreSQL at ${DB_HOST}:${DB_PORT}..."
attempts=0
until python - <<PY 2>/dev/null
import socket
socket.create_connection(("${DB_HOST}", ${DB_PORT}), 2)
PY
do
  attempts=$((attempts + 1))
  if [ "$attempts" -ge 30 ]; then
    echo "Could not connect to PostgreSQL after 30 attempts" >&2
    exit 1
  fi
  sleep 1
done

echo "Applying database migrations..."
flask db upgrade

echo "Starting Gunicorn..."
exec gunicorn --workers 4 --bind 0.0.0.0:5000 app:app
