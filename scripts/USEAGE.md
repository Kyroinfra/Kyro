# Scripts

All scripts rely on the same two compose conventions (#46):

- **Dev**: plain `docker compose …` — Docker auto-loads `compose.yml` +
  `compose.override.yml` and the root `.env`. Nothing to stitch.
- **Prod**: `docker compose -f compose.yml …` — the explicit `-f` bypasses the
  dev override file, which is what keeps hot-reload builds, source bind
  mounts, published ports, ollama and pgadmin out of prod. Nginx lives behind
  the `prod` profile.

## dev.sh
Starts the development environment.

```bash
./scripts/dev.sh
```

Equivalent to `docker compose up` with no extra flags. Hot reload is enabled
for the api and web via bind mounts; `ollama` and `pgadmin` start too.

## dev-down.sh
Stops the development environment.

```bash
./scripts/dev-down.sh
```

Stops and removes all development containers but keeps volumes intact, so
your database and uploads are preserved.

## dev-rebuild.sh
Rebuilds all Docker images and restarts all services.

```bash
./scripts/dev-rebuild.sh
```

Use this when you change a Dockerfile, install new dependencies, or add new
files that aren't covered by bind mounts (e.g. files outside `src/`).

## dev-reset.sh
Wipes everything and starts fresh.

```bash
./scripts/dev-reset.sh
```

This runs `down --volumes --remove-orphans` and starts clean — the database,
uploads and pgadmin state are lost. Migrations re-run automatically at api
startup (advisory-locked), so the fresh boot is fully self-sufficient.

## prod.sh
Starts the production stack.

```bash
./scripts/prod.sh
```

Runs `docker compose -f compose.yml --profile prod --scale api=3 up -d`.
`API_REPLICAS` scales the api replicas (e.g. `API_REPLICAS=1 ./scripts/prod.sh`).
Migrations run inside each api start under an advisory lock, so scaled
replicas queue instead of racing.

## prod-down.sh
Stops the production stack (same file/profile resolution as prod.sh).

```bash
./scripts/prod-down.sh
```

## prod-rebuild.sh
Rebuilds the production images and restarts (same resolution as prod.sh).

```bash
./scripts/prod-rebuild.sh
```

## log.sh
Tails the dev stack logs.

```bash
./scripts/log.sh            # all services
./scripts/log.sh api        # one service
```
