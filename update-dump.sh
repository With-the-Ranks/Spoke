#!/bin/bash

SCRIPT_DIR="$(cd "$(dirname "${BASH_SOURCE[0]}")" && pwd)"
cd "$SCRIPT_DIR"

# If yarn isn't usable (not in PATH, or asdf shim broken in non-interactive shell),
# resolve node/yarn from asdf install paths using the script owner's home directory
# so this works correctly even when run via sudo.
if ! yarn --version &>/dev/null; then
  _owner=$(stat -c '%U' "${BASH_SOURCE[0]}")
  _owner_home=$(getent passwd "$_owner" | cut -d: -f6)
  ASDF_INSTALLS="${ASDF_DATA_DIR:-$_owner_home/.asdf}/installs"
  while IFS=' ' read -r _tool _ver; do
    [[ "$_tool" == "nodejs" ]] && export PATH="$ASDF_INSTALLS/nodejs/$_ver/bin:$PATH"
    [[ "$_tool" == "yarn"   ]] && export PATH="$ASDF_INSTALLS/yarn/$_ver/bin:$PATH"
  done < "$SCRIPT_DIR/.tool-versions"
fi

PG_HOST_PORT=${1:-"6432"}
SPOKE_DB="spoke"

echo "Spinning up Postgres Docker container..."

# Start the container in the background
CONTAINER_ID=$(docker container run -d  \
  --cap-add SYS_RESOURCE \
  --platform linux/amd64 \
  -p $PG_HOST_PORT:5432  \
  -e ALLOW_NOSSL=true \
  -e POSTGRES_DB=postgres \
  -e POSTGRES_USER=postgres \
  -e POSTGRES_PASSWORD=zalando \
  registry.opensource.zalan.do/acid/spilo-14:2.1-p6)


retVal=$?
if [ $retVal -ne 0 ]; then
  echo "Failed to start container"
  exit $retVal
fi

# Crude wait for container to be ready
export DATABASE_URL=postgres://postgres:zalando@127.0.0.1:$PG_HOST_PORT/postgres
echo "Waiting for container to be ready..."
until psql --no-psqlrc $DATABASE_URL -c 'select 1' 2>/dev/null 1>/dev/null; do
  sleep 0.2
done
echo -e "Container is ready. Running migrations...\n"

psql --no-psqlrc $DATABASE_URL -c "create database $SPOKE_DB;";
export DATABASE_URL=postgres://postgres:zalando@127.0.0.1:$PG_HOST_PORT/$SPOKE_DB

# Run the migrations against the temporary Docker container
NODE_ENV=production yarn migrate:worker && NODE_ENV=production yarn knex migrate:latest

# Dump the schema using the pegged pg_dump version in the container
docker exec -e PGPASSWORD=zalando $CONTAINER_ID pg_dump -U postgres -d $SPOKE_DB --schema-only  \
  --schema public \
  > ./schema-dump.sql

docker kill $CONTAINER_ID 1>/dev/null
