# Scripts

## dev.sh
Starts the development environment.

```bash
./scripts/dev.sh
```

Runs all services using `compose.yml` + `compose.dev.yml` with `.env.dev`.
Hot reload is enabled for the API and web via bind mounts.

## dev-down.sh
Stops the development environment.

```bash
./scripts/dev-down.sh
```

Stops and removes all development containers but keeps volumes intact,
so your database and uploads are preserved.

## dev-rebuild.sh
Rebuilds all Docker images and restarts all services.

```bash
./scripts/dev-rebuild.sh
```

Use this when you change a Dockerfile, install new dependencies, or add new files
that aren't covered by bind mounts (e.g. files outside `src/`).

## reset.sh
Wipes everything and starts fresh.

```bash
./scripts/dev-reset.sh
```

This will:
- Stop and remove all containers
- Delete all volumes (database, redis, uploads)
- Rebuild all images from scratch
- Start all services

⚠️ You will lose all local data including your database. Use with caution.

## prod.sh
Starts the production environment in detached mode.

```bash
./scripts/prod.sh
```

Runs all services using `compose.yml` + `compose.prod.yml` with `.env`.
Runs in the background — use `prodDown.sh` to stop.

## prod-down.sh
Stops the production environment.

```bash
./scripts/prod-down.sh
```

Stops and removes all production containers but keeps volumes intact.


## prod-rebuild.sh
Rebuild Containers for prod.

```bash
./scripts/prod-rebuild.sh
```


## prod-down.sh
Stops the production environment.

```bash
./scripts/prod-down.sh
```

Stop all containers in production environment.
