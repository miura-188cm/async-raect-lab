# introduction

hi there

this repository is React v19 template

## Tech Stack

- TypeScript 5
- React 19
- Bun
- Docker
- Vite 7

## How to start vite server

1. Start Compose

```bash
docker compose up
```

1. Access the top page in your browser

```planetext
http://localhost:5173/
```

## How to add Library

1. Docker run

```bash
docker compose run --rm app "[YOUR-USE-LIBRARY]"
```

example

```bash
docker compose run --rm app bun install zod
```
