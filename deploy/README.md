# Deploy - OSM Notes API

## Systemd service (port 3010)

To run the API as a system service on the server (e.g. 192.168.0.7):

### 1. Build the app

```bash
cd /home/notes/OSM-Notes-API   # or your install path
npm ci --production
npm run build
```

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
- `Environment=PORT=3010` – port (default 3010)

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
curl -sI -H "User-Agent: Test/1.0 (a@b.com)" http://127.0.0.1:3010/health | grep -i x-api
# X-API-Version: 0.1.0
# X-API-Name: osm-notes-api

curl -s -H "User-Agent: Test/1.0 (a@b.com)" http://127.0.0.1:3010/health | jq .
curl -s -H "User-Agent: Test/1.0 (a@b.com)" "http://127.0.0.1:3010/notes-api/v1/notes?limit=2" | jq .
```

### Useful commands

```bash
sudo systemctl status osm-notes-api   # status
sudo systemctl restart osm-notes-api  # restart
sudo journalctl -u osm-notes-api -f   # logs (follow)
```
