# Facebook Lead Ads → Rollbase (Express)

Webservice en **Node.js + Express**, mismo patrón que el webhook Wompi.

## API Rollbase

| Paso | Método | URL |
|------|--------|-----|
| Login | POST | `/rest/api/login` |
| Crear lead | **GET** | `/rest/api/create2?objName=Prospecto3&...` |

## Instalación

```bash
cd facebook-rollbase-webhook
cp .env.example .env
# Editar .env con credenciales
npm install
npm start
```

## URL del webhook

```
https://tudominio.com/webhook/facebook
```

Configura en Meta for Developers → Webhooks → Page → **leadgen**

- **Callback URL:** la URL de arriba
- **Verify Token:** valor de `FB_VERIFY_TOKEN` en `.env`

## Flujo

```
Facebook Lead Ads
      ↓ POST /webhook/facebook
Graph API (obtener datos del lead)
      ↓
GET /create2 → Prospecto3 en Rollbase
```

## Campos enviados

| Rollbase | Origen |
|----------|--------|
| `firstName` | Nombre completo |
| `email` | Email |
| `mobilePhone` | Teléfono |
| `Provincia` | Provincia |
| `Ciudad` | Ciudad |
| `Pais` | Fijo: Colombia |
| `Tema` | Fijo: FORMS/FBADS |

## Health

```
GET /health
```
