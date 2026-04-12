#!/bin/bash
# Mobile app dev server
# Usage: ./mobile/dev.sh [--ios|--android]
set -e

DIR="$(cd "$(dirname "$0")" && pwd)"

lsof -ti:8081 2>/dev/null | xargs kill 2>/dev/null || true
rm -rf "$DIR/node_modules/.cache" "$DIR/.expo" 2>/dev/null || true

cd "$DIR" && exec npx expo start --clear "$@"
