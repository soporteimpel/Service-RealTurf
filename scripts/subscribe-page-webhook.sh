#!/usr/bin/env bash
# Suscribe la página de Facebook a la app para recibir webhooks leadgen
# Uso: ./scripts/subscribe-page-webhook.sh

set -euo pipefail

ROOT_DIR="$(cd "$(dirname "${BASH_SOURCE[0]}")/.." && pwd)"
ENV_FILE="${ENV_FILE:-$ROOT_DIR/.env}"

if [[ -f "$ENV_FILE" ]]; then
  set -a
  # shellcheck disable=SC1090
  source "$ENV_FILE"
  set +a
fi

PAGE_ID="${FB_PAGE_ID:-}"
TOKEN="${FB_PAGE_ACCESS_TOKEN:-}"
VERSION="${FB_GRAPH_API_VERSION:-v21.0}"

if [[ -z "$TOKEN" ]]; then
  echo "Error: FB_PAGE_ACCESS_TOKEN no configurado"
  exit 1
fi

if [[ -z "$PAGE_ID" ]]; then
  PAGE_ID="$(curl -s "https://graph.facebook.com/${VERSION}/me?fields=id&access_token=${TOKEN}" | python3 -c "import sys,json; print(json.load(sys.stdin).get('id',''))")"
fi

if [[ -z "$PAGE_ID" ]]; then
  echo "Error: no se pudo obtener el ID de la página"
  exit 1
fi

echo ">> Suscribiendo página $PAGE_ID a leadgen webhooks..."

curl -s -X POST "https://graph.facebook.com/${VERSION}/${PAGE_ID}/subscribed_apps" \
  -d "subscribed_fields=leadgen" \
  -d "access_token=${TOKEN}" | python3 -m json.tool

echo ""
echo ">> Verificando suscripción..."
curl -s "https://graph.facebook.com/${VERSION}/${PAGE_ID}/subscribed_apps?access_token=${TOKEN}" | python3 -m json.tool
