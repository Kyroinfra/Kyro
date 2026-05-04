./scripts/dev.sh          # normal start
./scripts/dev.sh -d       # detached
./scripts/dev.sh --build  # force rebuild
./scripts/dev.sh -d --build api worker  # rebuild + restart specific services

docker compose -f compose.yml -f compose.dev.yml --env-file .env.dev down -v --remove-orphans # To clear everything
docker compose -f compose.yml -f compose.dev.yml --env-file .env.dev logs -f # To watch start up logs
