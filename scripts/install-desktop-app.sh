#!/usr/bin/env bash
set -euo pipefail

APP_DIR="$(cd "$(dirname "$(readlink -f "${BASH_SOURCE[0]}")")/.." && pwd)"
DESKTOP_TEMPLATE="$APP_DIR/packaging/nutrimind.desktop"
DESKTOP_TARGET="${XDG_DATA_HOME:-${HOME}/.local/share}/applications/nutrimind.desktop"
ICON_SOURCE="$APP_DIR/packaging/nutrimind.png"

if ! command -v pnpm >/dev/null 2>&1; then
  printf 'NutriMind: pnpm is required for the desktop install (npm mishandles optional native deps).\n' >&2
  printf 'Install it with: sudo dnf install -y nodejs-pnpm  (or: corepack enable)\n' >&2
  exit 1
fi

if [[ ! -f "$ICON_SOURCE" ]]; then
  printf 'NutriMind: missing icon at %s\n' "$ICON_SOURCE" >&2
  exit 1
fi

cd "$APP_DIR"

pnpm install
NUTRIMIND_DESKTOP=1 pnpm run build
pnpm exec -- prisma migrate deploy

chmod +x "$APP_DIR/scripts/nutrimind-desktop"

mkdir -p "$(dirname "$DESKTOP_TARGET")"
# Substitute the real install path so the entry works wherever the repo lives.
sed "s|@APP_DIR@|$APP_DIR|g" "$DESKTOP_TEMPLATE" >"$DESKTOP_TARGET"
chmod 644 "$DESKTOP_TARGET"

if command -v update-desktop-database >/dev/null 2>&1; then
  update-desktop-database "$(dirname "$DESKTOP_TARGET")" >/dev/null 2>&1 || true
fi

if command -v gtk-update-icon-cache >/dev/null 2>&1; then
  gtk-update-icon-cache -q -t -f "$(dirname "$DESKTOP_TARGET")" >/dev/null 2>&1 || true
fi

printf 'NutriMind is installed at %s\n' "$APP_DIR"
printf 'Launch it from your application menu, or run: %s/scripts/nutrimind-desktop launch\n' "$APP_DIR"
