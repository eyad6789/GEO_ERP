#!/usr/bin/env bash
# ============================================================================
# GEO ERP — one-shot deploy for a fresh Ubuntu/Debian server.
# Runs the Node app as a systemd service (auto-restart) behind nginx on port 80.
#
# Run this ON THE SERVER, from the project root, as root/sudo:
#   sudo ./deploy/deploy.sh
#
# Optional overrides (env vars):
#   SERVER_NAME=187.124.183.65   # nginx server_name (default below)
#   APP_PORT=4000                # internal Node port (proxied by nginx)
#   RUN_USER=eyad                # OS user the service runs as
#   FORCE_SEED=1                 # re-run the DB seed even if a DB exists
# ============================================================================
set -euo pipefail

APP_NAME="geo-erp"
APP_PORT="${APP_PORT:-4000}"
SERVER_NAME="${SERVER_NAME:-187.124.183.65}"
SCRIPT_DIR="$(cd "$(dirname "${BASH_SOURCE[0]}")" && pwd)"
APP_DIR="$(cd "$SCRIPT_DIR/.." && pwd)"
RUN_USER="${RUN_USER:-${SUDO_USER:-$(id -un)}}"

if [ "$(id -u)" -ne 0 ]; then
  echo "✖ Please run with sudo:  sudo ./deploy/deploy.sh" >&2
  exit 1
fi

echo "▶ App dir   : $APP_DIR"
echo "▶ Run user  : $RUN_USER"
echo "▶ Node port : $APP_PORT  (nginx → 80)"
echo "▶ server_name: $SERVER_NAME"

# ---- 1. System packages: Node 20, build tools (better-sqlite3), nginx --------
export DEBIAN_FRONTEND=noninteractive
NODE_MAJOR="$(command -v node >/dev/null 2>&1 && node -p 'process.versions.node.split(".")[0]' || echo 0)"
if [ "$NODE_MAJOR" -lt 18 ]; then
  echo "▶ Installing Node.js 20.x ..."
  curl -fsSL https://deb.nodesource.com/setup_20.x | bash -
  apt-get install -y nodejs
fi
echo "▶ Installing build tools + nginx ..."
apt-get install -y build-essential python3 nginx curl

NPM_BIN="$(command -v npm)"

# ---- 2. Install dependencies + build the frontend (as RUN_USER) -------------
# NOTE: do NOT set NODE_ENV=production here — devDeps (vite, tsx, typescript)
# are required to build and to run the server.
echo "▶ npm install + build ..."
sudo -u "$RUN_USER" env -u NODE_ENV bash -lc "cd '$APP_DIR' && npm install && npm run build"

# ---- 3. Seed the SQLite DB on first deploy only -----------------------------
if [ ! -f "$APP_DIR/server/data/erp.db" ] || [ "${FORCE_SEED:-0}" = "1" ]; then
  echo "▶ Seeding database ..."
  sudo -u "$RUN_USER" env -u NODE_ENV bash -lc "cd '$APP_DIR' && npm run seed"
else
  echo "▶ Existing database found — skipping seed (use FORCE_SEED=1 to reseed)."
fi

# ---- 4. systemd service ------------------------------------------------------
echo "▶ Writing systemd unit /etc/systemd/system/${APP_NAME}.service ..."
cat > "/etc/systemd/system/${APP_NAME}.service" <<EOF
[Unit]
Description=GEO ERP System (Node + Express + SQLite)
After=network.target

[Service]
Type=simple
User=$RUN_USER
WorkingDirectory=$APP_DIR
Environment=NODE_ENV=production
Environment=PORT=$APP_PORT
Environment=HOST=127.0.0.1
ExecStart=$NPM_BIN run start
Restart=on-failure
RestartSec=3

[Install]
WantedBy=multi-user.target
EOF

systemctl daemon-reload
systemctl enable "${APP_NAME}.service"
systemctl restart "${APP_NAME}.service"

# ---- 5. nginx reverse proxy (port 80 → Node) --------------------------------
echo "▶ Configuring nginx site ..."
cat > "/etc/nginx/sites-available/${APP_NAME}.conf" <<EOF
server {
    listen 80;
    listen [::]:80;
    server_name $SERVER_NAME;
    client_max_body_size 5m;

    location / {
        proxy_pass http://127.0.0.1:$APP_PORT;
        proxy_http_version 1.1;
        proxy_set_header Host \$host;
        proxy_set_header X-Real-IP \$remote_addr;
        proxy_set_header X-Forwarded-For \$proxy_add_x_forwarded_for;
        proxy_set_header X-Forwarded-Proto \$scheme;
    }
}
EOF
ln -sf "/etc/nginx/sites-available/${APP_NAME}.conf" "/etc/nginx/sites-enabled/${APP_NAME}.conf"
rm -f /etc/nginx/sites-enabled/default   # stop the default site shadowing ours
nginx -t
systemctl reload nginx

# ---- 6. Firewall (only if ufw is active) ------------------------------------
if command -v ufw >/dev/null 2>&1 && ufw status 2>/dev/null | grep -q "Status: active"; then
  echo "▶ Opening port 80 in ufw ..."
  ufw allow 80/tcp || true
fi

echo ""
echo "✅ Deployed.  → http://$SERVER_NAME"
echo "   service : sudo systemctl status $APP_NAME"
echo "   logs    : sudo journalctl -u $APP_NAME -f"
echo "   redeploy: re-run this script after copying new code (DB is preserved)."
