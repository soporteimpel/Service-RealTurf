#!/usr/bin/env bash
# Conectar y subir a un repo nuevo de GitHub
# Uso: ./scripts/setup-new-repo.sh soporteimpel/Service-RealTurf

set -euo pipefail

REPO="${1:-soporteimpel/Service-RealTurf}"
REMOTE_URL="https://github.com/${REPO}.git"

echo ">> Remote: $REMOTE_URL"

git remote remove origin 2>/dev/null || true
git remote add origin "$REMOTE_URL"
git branch -M main
git push -u origin main

echo ">> Listo: https://github.com/${REPO}"
