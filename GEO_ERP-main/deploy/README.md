# Deploying GEO ERP to a server (systemd + nginx, port 80)

Target server: **187.124.183.65**

The app is Node + Express + SQLite, serving the built React app + API from one
process. `deploy/deploy.sh` sets it up as a `systemd` service behind `nginx` on
port 80.

## Step 1 — copy the project to the server

From your machine (this project folder), rsync the code up. Replace `USER` with
your SSH user on the server:

```bash
rsync -avz \
  --exclude node_modules \
  --exclude dist \
  --exclude '.git' \
  --exclude 'server/data/*.db*' \
  ./  USER@187.124.183.65:/opt/geo-erp/
```

(If `/opt/geo-erp` doesn't exist or you lack permission, first run
`ssh USER@187.124.183.65 'sudo mkdir -p /opt/geo-erp && sudo chown $USER /opt/geo-erp'`.)

> No rsync? Use scp: `scp -r ./ USER@187.124.183.65:/opt/geo-erp/` (then delete
> `node_modules`/`dist` on the server before step 2).

## Step 2 — run the deploy script on the server

```bash
ssh USER@187.124.183.65
cd /opt/geo-erp
sudo ./deploy/deploy.sh
```

That script will:
1. Install Node 20, build tools (for `better-sqlite3`), and nginx if missing.
2. `npm install` + `npm run build`.
3. `npm run seed` — **only on the first deploy** (your data is preserved on
   later runs; pass `FORCE_SEED=1` to wipe and reseed).
4. Create + start a `geo-erp` systemd service (auto-restarts on crash/boot).
5. Configure nginx to proxy port 80 → the app.

When it finishes, open **http://187.124.183.65**.

## Useful commands (on the server)

```bash
sudo systemctl status geo-erp      # service state
sudo journalctl -u geo-erp -f      # live logs
sudo systemctl restart geo-erp     # restart after a code change
```

## Redeploying after code changes

Re-run **Step 1** (rsync) then **Step 2** (`sudo ./deploy/deploy.sh`). The
script rebuilds and restarts the service; the existing database is kept.

## Optional overrides

```bash
sudo SERVER_NAME=erp.example.com APP_PORT=4000 RUN_USER=eyad ./deploy/deploy.sh
sudo FORCE_SEED=1 ./deploy/deploy.sh   # reseed the DB from scratch
```

## Notes

- The Node app binds to `127.0.0.1:4000` (not public); nginx is the only thing
  exposed on port 80. If a firewall (ufw) is active the script opens port 80.
- For HTTPS later: point a domain at the server and run
  `sudo apt install certbot python3-certbot-nginx && sudo certbot --nginx`.
