# Deploying Behind Cloudflare (notes-api.osm.lat)

This guide explains how to expose the OSM Notes API at **notes-api.osm.lat** using Cloudflare as DNS and proxy (and optionally Cloudflare Tunnel). The API itself runs on your own server; Cloudflare provides DNS, SSL, and DDoS protection in front of it.

## Prerequisites

- The **osm.lat** domain (or the subdomain you use) must be [added to Cloudflare](https://dash.cloudflare.com/) and use Cloudflare nameservers.
- The API is running somewhere reachable:
  - **Option A**: Server with a **public IP** (e.g. 192.168.0.7 if it has a public IP, or a VPS).
  - **Option B**: Server **without a public IP** or behind NAT → use **Cloudflare Tunnel** (recommended for home/private servers).

The app already sets `trust proxy = 1`, so it will correctly use `X-Forwarded-For` and similar headers when behind Cloudflare.

---

## Option A: Origin Has a Public IP

Use this when your API server has a public IPv4 (and optionally IPv6) address.

### 1. DNS in Cloudflare

1. In [Cloudflare Dashboard](https://dash.cloudflare.com/) → select the zone for **osm.lat**.
2. Go to **DNS** → **Records**.
3. Add a record:
   - **Type**: `A` (or `AAAA` for IPv6 if you have it).
   - **Name**: `notes-api` (so the hostname is `notes-api.osm.lat`).
   - **IPv4 address**: The public IP of the server where the API runs.
   - **Proxy status**: **Proxied** (orange cloud) so traffic goes through Cloudflare (SSL and protection).
   - **TTL**: Auto (or 300 if you prefer).

Save. After propagation, `notes-api.osm.lat` will resolve through Cloudflare to your server.

### 2. SSL/TLS in Cloudflare

1. **SSL/TLS** → **Overview**: mode **Full** or **Full (strict)**.
   - **Full**: Cloudflare encrypts to your origin; origin can use HTTP or HTTPS.
   - **Full (strict)**: Origin must have a valid certificate (e.g. Let’s Encrypt). Recommended if you configure HTTPS on the server.

2. **Edge Certificates**:
   - Enable **Always Use HTTPS** if you want HTTP to redirect to HTTPS.
   - Optional: **Minimum TLS Version** 1.2 or 1.3.

### 3. Origin Server (your API host)

- Open the port where the API listens (e.g. **3010** or **3000**) in the firewall, so Cloudflare can reach it.
- If using **Full (strict)**:
  - Install a TLS certificate on the server (e.g. Certbot for Let’s Encrypt), or
  - Use **Cloudflare Origin CA** (in SSL/TLS → Origin Server): create a cert and install it on the server so Cloudflare can connect with HTTPS.

### 4. Optional: Restrict Direct Access to Origin

To allow only Cloudflare IPs to hit your origin (recommended):

- In the firewall on the API server, allow **only** [Cloudflare IPv4 and IPv6 ranges](https://www.cloudflare.com/ips/) to the API port; block everyone else.
- Or use **Authenticated Origin Pulls** (Cloudflare SSL/TLS → Origin Server) so only requests with a valid Cloudflare client certificate reach the origin.

---

## Option B: Origin Without Public IP (Cloudflare Tunnel)

Use this when the API runs behind NAT, at home, or on a machine without a public IP. **Cloudflare Tunnel** (cloudflared) creates an outbound connection from your server to Cloudflare; you do **not** open any inbound ports.

### If you already have a tunnel (CNAME → `*.cfargotunnel.com`)

If other hostnames in Cloudflare already use a **CNAME** to your tunnel (e.g. `1b718247-fe2d-4391-84c0-819c1501e6c2.cfargotunnel.com`), add **notes-api.osm.lat** the same way:

1. **DNS in Cloudflare**  
   - **DNS** → **Records** → **Add record**  
   - **Type**: CNAME  
   - **Name**: `notes-api`  
   - **Target**: `1b718247-fe2d-4391-84c0-819c1501e6c2.cfargotunnel.com`  
   - **Proxy status**: Proxied (orange cloud) — usually automatic for tunnel CNAMEs  
   - Save.

2. **Tunnel config (on the server where cloudflared runs)**  
   Edit the tunnel config (e.g. `/etc/cloudflared/config.yml` or `~/.cloudflared/config.yml`) and add an **ingress** entry for this hostname before the catch‑all:

   ```yaml
   ingress:
     - hostname: notes-api.osm.lat
       service: http://127.0.0.1:3010   # port where the API listens (adjust if different)
     # ... your other hostnames ...
     - service: http_status:404
   ```

3. **Restart cloudflared**  
   `sudo systemctl restart cloudflared` (or restart the tunnel process).

After DNS propagation, **notes-api.osm.lat** will go through the same tunnel to the service you defined (e.g. the API on port 3010).

---

### 1. Install cloudflared on the API server (new tunnel)

**Linux (Debian/Ubuntu)**:

```bash
# Add package repo and install
curl -L --output cloudflared.deb https://github.com/cloudflare/cloudflared/releases/latest/download/cloudflared-linux-amd64.deb
sudo dpkg -i cloudflared.deb
```

Or see [Cloudflare Tunnel docs](https://developers.cloudflare.com/cloudflare-one/connections/connect-apps/install-and-setup/installation/).

### 2. Log in and create a tunnel

```bash
# Log in (opens browser to authenticate with Cloudflare)
cloudflared tunnel login
```

Then create a tunnel and a DNS record for notes-api.osm.lat:

```bash
# Create tunnel (e.g. name: osm-notes-api)
cloudflared tunnel create osm-notes-api

# List tunnels to get the tunnel ID
cloudflared tunnel list
```

### 3. Configure the tunnel

Create a config file, e.g. `/etc/cloudflared/config.yml` (or `~/.cloudflared/config.yml`):

```yaml
tunnel: <TUNNEL_ID>   # from "cloudflared tunnel list"
credentials-file: /path/to/<TUNNEL_ID>.json   # from tunnel create

ingress:
  - hostname: notes-api.osm.lat
    service: http://127.0.0.1:3010   # or the host:port where the API listens
  - service: http_status:404
```

Replace `<TUNNEL_ID>` and the path to the credentials file. Use the same port your API uses (e.g. 3010 from the systemd service).

### 4. Create DNS (CNAME) for the tunnel

```bash
cloudflared tunnel route dns osm-notes-api notes-api.osm.lat
```

This creates a CNAME for `notes-api.osm.lat` pointing to the tunnel. No A record needed; no open ports on your server.

### 5. Run the tunnel as a service

```bash
sudo cloudflared service install
sudo systemctl start cloudflared
sudo systemctl enable cloudflared
```

(If you used a config path other than the default, pass it with `--config /path/to/config.yml` in the service install step; see Cloudflare docs.)

After this, traffic to **notes-api.osm.lat** goes: Internet → Cloudflare → tunnel → your API on `http://127.0.0.1:3010`.

### 6. SSL/TLS in Cloudflare

- **SSL/TLS** → **Overview**: **Full** is enough (traffic from Cloudflare to the tunnel is encrypted by the tunnel; the local `service` is HTTP to localhost).
- Enable **Always Use HTTPS** under **Edge Certificates** if you want.

---

## Summary Checklist

| Step | Option A (public IP) | Option B (tunnel) |
|------|----------------------|-------------------|
| Domain in Cloudflare | Yes (osm.lat) | Yes |
| DNS record | A (or AAAA) for `notes-api` → server IP | CNAME `notes-api` → tunnel (via `cloudflared tunnel route dns`) |
| Proxy (orange cloud) | On for the A record | N/A (tunnel is always proxied) |
| SSL/TLS mode | Full or Full (strict) | Full |
| Open port on server | Yes (e.g. 3010) | No |
| Trust proxy in app | Already set | Already set |

---

## Verify

```bash
# Health (replace with your domain)
curl -sI -H "User-Agent: Test/1.0 (a@b.com)" https://notes-api.osm.lat/health

# API version headers
curl -sI -H "User-Agent: Test/1.0 (a@b.com)" https://notes-api.osm.lat/notes-api/v1 | grep -i x-api
```

---

## Optional: Caching and Firewall Rules

- **Caching**: For a dynamic API, either leave default (no cache) or in **Caching** → **Configuration** add a rule for `notes-api.osm.lat/*` with **Cache Level: Bypass** (or short TTL only for specific paths if you ever want to cache something).
- **Firewall / WAF**: You can add **Firewall rules** or **WAF** rules in Cloudflare to limit by country, rate, or known bad IPs if needed.

Once DNS and (if used) the tunnel are in place, the project is “published” on Cloudflare and reachable at **notes-api.osm.lat**.
