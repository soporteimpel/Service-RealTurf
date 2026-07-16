# Facebook Lead Ads → Rollbase (Cloud Run)

Webservice **Node.js + Express** que:
1. Recibe webhooks de Facebook Lead Ads
2. **Consulta Graph API** para obtener los datos del lead
3. Envía el registro a **Prospecto3** en Rollbase

Patrón igual a [Service-Musas-wompi](https://github.com/soporteimpel/Service-Musas-WOMPI).

## Endpoints

| Método | Ruta | Descripción |
|--------|------|-------------|
| GET | `/webhook/facebook` | Verificación webhook Meta |
| POST | `/webhook/facebook` | Recibe lead → consulta Facebook → Rollbase |
| GET/POST | `/sync/leads` | Consulta leads en Facebook y envía a Rollbase |
| GET | `/health` | Health check |

## Despliegue en Google Cloud Run

### Prerrequisitos

- `gcloud` CLI instalado
- Proyecto GCP con Cloud Run y Cloud Build habilitados

### Opción 1 — Despliegue rápido (recomendado)

```bash
gcloud config set project TU_PROJECT_ID

gcloud run deploy realturf-facebook-webhook \
  --source . \
  --platform managed \
  --region us-central1 \
  --allow-unauthenticated
```

Luego configura variables de entorno en Cloud Run (ver abajo).

### Opción 2 — Dockerfile + Cloud Build

```bash
export GCP_PROJECT_ID=TU_PROJECT_ID
chmod +x scripts/deploy-cloud-run.sh
./scripts/deploy-cloud-run.sh
```

O manualmente:

```bash
gcloud builds submit --config cloudbuild.yaml .
```

### Variables de entorno en Cloud Run

```bash
gcloud run services update realturf-facebook-webhook \
  --region us-central1 \
  --update-env-vars "\
ROLLBASE_API_BASE_URL=https://www.impeltechnology.com/rest/api,\
ROLLBASE_LOGIN_NAME=realturf.geraldine,\
ROLLBASE_LOGIN_PASSWORD=TU_PASSWORD,\
ROLLBASE_OBJ_NAME=Prospecto3,\
FB_VERIFY_TOKEN=realturf_fb_webhook,\
FB_PAGE_ACCESS_TOKEN=TU_TOKEN_FACEBOOK,\
LEAD_DEFAULT_TEMA=FORMS/FBADS,\
LEAD_FIXED_PAIS=Colombia,\
SYNC_SECRET=tu_secreto_sync"
```

### URL del webhook en Meta

```
https://TU-SERVICIO.run.app/webhook/facebook
```

Verify Token: mismo valor que `FB_VERIFY_TOKEN`.

### Sync manual / Cloud Scheduler

Por ID de lead (recomendado con el token actual):

```
GET https://TU-SERVICIO.run.app/sync/leads?secret=tu_secreto_sync&ids=LEADGEN_ID
```

Por formularios (configura `FB_FORM_IDS` en Cloud Run):

```
GET https://TU-SERVICIO.run.app/sync/leads?secret=tu_secreto_sync
```

## Campos enviados a Rollbase

| Rollbase | Origen |
|----------|--------|
| `firstName` | Nombre completo |
| `email` | Email |
| `mobilePhone` | Teléfono |
| `Provincia` | Provincia |
| `Ciudad` | Ciudad |
| `Pais` | Fijo: Colombia |
| `Tema` | Fijo: FORMS/FBADS |

## Desarrollo local

```bash
cp .env.example .env
npm install
npm start
```
