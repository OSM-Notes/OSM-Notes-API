# Deploy - OSM Notes API

## Systemd service (port 3000)

To run the API as a system service on the server (e.g. 192.168.0.7):

### 1. Build the app

`npm run build` needs **TypeScript** (`tsc`), which is a **devDependency**. You must install dev deps for the build, then you can remove them to save disk.

- **`npm ci --ignore-scripts`** – installs all lockfile dependencies (including dev) but skips `prepare` (avoids Husky on servers without a full git hook setup). Same idea as the [Dockerfile](../docker/Dockerfile) build stage.
- **`npm prune --omit=dev`** – after a successful build, drop dev packages; runtime only needs `node dist/index.js` and production `node_modules`.

```bash
cd /home/notes/OSM-Notes-API   # or your install path
npm ci --ignore-scripts
npm run build
npm prune --omit=dev
```

**Do not use `npm ci --omit=dev` before `npm run build` on the server** — you will get `tsc: not found` because the compiler is not installed.

**Node**: The app supports Node 18+. For a clean install, Node 20+ is recommended.

### 2. Install the unit file

```bash
sudo cp deploy/osm-notes-api.service /etc/systemd/system/
# Edit if paths or user differ:
sudo nano /etc/systemd/system/osm-notes-api.service
```

Adjust in the unit file if needed:

- `User` / `Group` – user that runs the API (e.g. `notes`)
- `WorkingDirectory` – app directory (e.g. `/home/notes/OSM-Notes-API`)
- `EnvironmentFile` – path to `.env`
- `Environment=PORT=3000` – port (default 3000; can match or override `PORT` in `EnvironmentFile`)

### 3. Enable and start

```bash
sudo systemctl daemon-reload
sudo systemctl enable osm-notes-api
sudo systemctl start osm-notes-api
sudo systemctl status osm-notes-api
```

### 4. Verify

```bash
# Health and version headers
curl -sI -H "User-Agent: Test/1.0 (a@b.com)" http://127.0.0.1:3000/health | grep -i x-api
# X-API-Version: 0.1.0
# X-API-Name: osm-notes-api

curl -s -H "User-Agent: Test/1.0 (a@b.com)" http://127.0.0.1:3000/health | jq .
curl -s -H "User-Agent: Test/1.0 (a@b.com)" "http://127.0.0.1:3000/notes-api/v1/notes?limit=2" | jq .
```

### Useful commands

```bash
sudo systemctl status osm-notes-api   # status
sudo systemctl restart osm-notes-api  # restart
sudo journalctl -u osm-notes-api -f   # logs (follow)
```
