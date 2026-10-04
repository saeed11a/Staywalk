# Staywalk — Base44 dev environment

## Current state
The repository contains **no application code**: only `README.md` (a single "# Staywalk" heading), `LICENSE`, an Unreal-Engine-style `.gitignore`, and `Staywalk.html` (an empty file with one newline). There was nothing to build or run, so `docker-compose.base44.yml` currently serves the repo root statically with nginx — the preview shows a blank page, which is the honest state of the project.

## Running it
- `docker compose -f docker-compose.base44.yml up -d` — nginx:alpine on host port 3000, repo root bind-mounted read-only at `/usr/share/nginx/html`, site config in `.base44/nginx.conf` (index = `Staywalk.html`).
- The sandbox repo root directory can be mode 700; if nginx returns 403, run `chmod o+rx .` so the nginx worker user can traverse it.

## When real code arrives
- Replace the nginx service with a live-reload dev server (vite/next dev, etc.) running from a plain runtime base image with the source bind-mounted, per Base44 dev-mode rules.
- `.base44/environment.json` records `previewPort: 3000`, `healthPath: /`, and the start command; keep it in sync with compose changes.

## Verification
`curl -s -o /dev/null -w "%{http_code}" http://localhost:3000/` should return 200, and `docker compose -f docker-compose.base44.yml ps` should show the web container healthy.
