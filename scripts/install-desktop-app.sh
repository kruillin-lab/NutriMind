#!/usr/bin/env bash
set -euo pipefail

APP_DIR="$(cd "$(dirname "${BASH_SOURCE[0]}")/.." && pwd)"
DESKTOP_SOURCE="$APP_DIR/packaging/nutrimind.desktop"
DESKTOP_TARGET="${XDG_DATA_HOME:-${HOME}/.local/share}/applications/nutrimind.desktop"

cd "$APP_DIR"
/usr/bin/npm ci --no-audit
NUTRIMIND_DESKTOP=1 /usr/bin/npm run build
/usr/bin/npm exec -- prisma migrate deploy

chmod +x "$APP_DIR/scripts/nutrimind-desktop"
install -Dm644 "$DESKTOP_SOURCE" "$DESKTOP_TARGET"

if command -v update-desktop-database >/dev/null 2>&1; then
  update-desktop-database "$(dirname "$DESKTOP_TARGET")"
fi

printf 'NutriMind is installed. Open the application launcher and search for NutriMind.\n'
