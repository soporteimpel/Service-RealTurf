#!/usr/bin/env bash
# Carga variables desde .env local hacia Cloud Run
# Uso:
#   GCP_PROJECT_ID=tu-proyecto ./scripts/set-cloud-run-env.sh
#   CLOUD_RUN_SERVICE=realturf-facebook-webhook CLOUD_RUN_REGION=us-central1 ...

set -euo pipefail

ROOT_DIR="$(cd "$(dirname "${BASH_SOURCE[0]}")/.." && pwd)"
ENV_FILE="${ENV_FILE:-$ROOT_DIR/.env}"
SERVICE_NAME="${CLOUD_RUN_SERVICE:-realturf-facebook-webhook}"
REGION="${CLOUD_RUN_REGION:-us-central1}"
PROJECT_ID="${GCP_PROJECT_ID:-}"

if [[ -z "$PROJECT_ID" ]]; then
  echo "Error: define GCP_PROJECT_ID"
  echo "Ejemplo: GCP_PROJECT_ID=mi-proyecto ./scripts/set-cloud-run-env.sh"
  exit 1
fi

if [[ ! -f "$ENV_FILE" ]]; then
  echo "Error: no existe $ENV_FILE"
  exit 1
fi

ENV_VARS=()

while IFS= read -r line || [[ -n "$line" ]]; do
  line="${line//$'\r'/}"
  [[ -z "$line" || "$line" =~ ^[[:space:]]*# ]] && continue

  key="${line%%=*}"
  value="${line#*=}"

  key="$(echo "$key" | xargs)"
  value="$(echo "$value" | xargs)"

  # Cloud Run asigna PORT automáticamente
  [[ "$key" == "PORT" ]] && continue
  [[ -z "$key" ]] && continue
  [[ -z "$value" ]] && continue

  # Quitar comillas envolventes
  value="${value#\"}"
  value="${value%\"}"
  value="${value#\'}"
  value="${value%\'}"

  ENV_VARS+=("${key}=${value}")
done < "$ENV_FILE"

if [[ ${#ENV_VARS[@]} -eq 0 ]]; then
  echo "Error: no se encontraron variables en $ENV_FILE"
  exit 1
fi

JOINED="$(IFS=,; echo "${ENV_VARS[*]}")"

echo ">> Proyecto: $PROJECT_ID"
echo ">> Servicio: $SERVICE_NAME ($REGION)"
echo ">> Variables: ${#ENV_VARS[@]}"

gcloud config set project "$PROJECT_ID"

gcloud run services update "$SERVICE_NAME" \
  --region "$REGION" \
  --update-env-vars "$JOINED"

echo ">> Variables aplicadas correctamente"
gcloud run services describe "$SERVICE_NAME" --region "$REGION" --format='value(status.url)'
