#!/usr/bin/env bash
# run.sh — fast launcher for GEO_ERP (dev: API :4000 + Vite :5173)
# Ensures Node 20 is used (default Node can't build better-sqlite3),
# installs deps + seeds the DB only if missing, then starts the dev server.
set -euo pipefail

cd "$(dirname "$0")"

# --- Node 20 on PATH (Homebrew keg) -----------------------------------------
NODE20="/opt/homebrew/opt/node@20/bin"
if [ -x "$NODE20/node" ]; then
  export PATH="$NODE20:$PATH"
fi

NODE_VER="$(node -v)"
case "$NODE_VER" in
  v20.*) : ;;
  *) echo "⚠  Node $NODE_VER in use — this project needs Node 20 (better-sqlite3)." >&2
     echo "   Install it:  brew install node@20" >&2 ;;
esac
echo "▶ Node $NODE_VER"

# --- deps: install only if missing ------------------------------------------
if [ ! -x node_modules/.bin/vite ]; then
  echo "▶ Installing dependencies…"
  npm install
else
  echo "▶ Dependencies present — skipping install"
fi

# --- DB: seed only if not yet seeded ----------------------------------------
if [ ! -f server/data/erp.db ]; then
  echo "▶ Seeding database…"
  npm run seed
else
  echo "▶ Database present — skipping seed"
fi

# --- go ---------------------------------------------------------------------
echo "▶ Starting dev server → web http://localhost:5173  ·  api http://localhost:4000"
exec npm run dev
