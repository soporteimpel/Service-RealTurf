# Instrucciones — Facebook → Rollbase (Cloud Run)

## 1. Desplegar en Google Cloud Run

```bash
cd facebook-rollbase-webhook
gcloud config set project TU_PROJECT_ID
gcloud run deploy realturf-facebook-webhook --source . --region us-central1 --allow-unauthenticated
```

## 2. Variables de entorno en Cloud Run

Consola GCP → **Cloud Run** → `realturf-facebook-webhook` → **Editar** → **Variables y secretos**

Pega las mismas variables de tu `.env` local:

```
ROLLBASE_API_BASE_URL=https://www.impeltechnology.com/rest/api
ROLLBASE_LOGIN_NAME=realturf.geraldine
ROLLBASE_LOGIN_PASSWORD=********
ROLLBASE_OBJ_NAME=Prospecto3
FB_VERIFY_TOKEN=realturf_fb_webhook
FB_PAGE_ACCESS_TOKEN=********
LEAD_DEFAULT_TEMA="FORMS/FBADS"
LEAD_FIXED_PAIS=Colombia
SYNC_SECRET=tu_secreto_sync
```

> El `.env` **no va en GitHub**. Se configura solo en Cloud Run.

## 3. Configurar webhook en Meta

- **Callback URL:** `https://TU-SERVICIO.run.app/webhook/facebook`
- **Verify Token:** `realturf_fb_webhook`
- Campo: **leadgen**

## 4. Sync de leads (consulta activa en Facebook)

**Opción A — por ID de lead** (funciona con el token actual):

```
GET https://TU-SERVICIO.run.app/sync/leads?secret=tu_secreto_sync&ids=LEADGEN_ID
```

**Opción B — por formularios** (agrega `FB_FORM_IDS` en Cloud Run):

```
GET https://TU-SERVICIO.run.app/sync/leads?secret=tu_secreto_sync
```

El flujo principal sigue siendo el **webhook**: Facebook avisa → el servicio consulta Graph API → envía a Rollbase.

## 5. Verificar

```
GET https://TU-SERVICIO.run.app/health
```

Respuesta esperada: `{"status":"ok",...}`

## Campos en Rollbase (Prospecto3)

| Facebook | Rollbase |
|----------|----------|
| Nombre completo | firstName |
| Email | email |
| Teléfono | mobilePhone |
| Provincia | Provincia |
| Ciudad | Ciudad |
| (fijo) | Pais = Colombia |
| (fijo) | Tema = FORMS/FBADS |
