#!/usr/bin/env bash
set -euo pipefail

PROJECT_ID="${GCP_PROJECT_ID:-}"
REGION="${CLOUD_RUN_REGION:-us-central1}"
SERVICE_NAME="${CLOUD_RUN_SERVICE:-realturf-facebook-webhook}"

if [[ -z "$PROJECT_ID" ]]; then
  echo "Define GCP_PROJECT_ID antes de desplegar."
  echo "Ejemplo: GCP_PROJECT_ID=mi-proyecto ./scripts/deploy-cloud-run.sh"
  exit 1
fi

gcloud config set project "$PROJECT_ID"

echo ">> Build y deploy con Cloud Build..."
gcloud builds submit --config cloudbuild.yaml .

echo ">> Servicio desplegado: $SERVICE_NAME ($REGION)"
gcloud run services describe "$SERVICE_NAME" --region "$REGION" --format='value(status.url)'
