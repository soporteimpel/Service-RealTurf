# Instrucciones — Webhook Facebook → Rollbase

## Instalación

1. Sube la carpeta **facebook-rollbase-webhook** al servidor.
2. Copia `.env.example` → **`.env`** y completa las credenciales.
3. En la carpeta del proyecto ejecuta:
   ```
   npm install
   npm start
   ```

## Tokens de Facebook (obligatorios en `.env`)

Necesitas **3 valores** de Facebook:

| Variable | Qué es | Dónde conseguirlo |
|----------|--------|-------------------|
| `FB_VERIFY_TOKEN` | Una contraseña **que tú inventas** (ej. `mi_token_secreto_2025`) | Lo defines tú; debe coincidir con lo que pongas al suscribir el webhook |
| `FB_APP_SECRET` | Secreto de la App | [developers.facebook.com](https://developers.facebook.com) → tu App → **Configuración** → **Básica** → **Secreto de la app** |
| `FB_PAGE_ACCESS_TOKEN` | Token de la **Página** de Facebook | Meta for Developers → tu App → **Herramientas** → **Explorador de la API Graph** → genera token con permisos `leads_retrieval` y `pages_manage_metadata` (o usa token de página de larga duración) |

### Cómo obtener el Page Access Token

1. Entra a [developers.facebook.com](https://developers.facebook.com) y abre tu App.
2. Asegúrate de que la App tenga el producto **Webhooks** y permisos para **Lead Ads**.
3. Ve a **Herramientas** → **Explorador de la API Graph**.
4. Selecciona tu App y la **Página** de Facebook donde corren los anuncios.
5. Genera un token con estos permisos mínimos:
   - `leads_retrieval`
   - `pages_read_engagement`
   - `pages_manage_metadata`
6. Copia el token y pégalo en `.env` como `FB_PAGE_ACCESS_TOKEN`.

> **Importante:** El token de página puede expirar. Para producción conviene un **token de larga duración** (60 días) o uno permanente vinculado a la página. Si deja de funcionar, genera uno nuevo.

### Ejemplo de `.env`

```
FB_VERIFY_TOKEN=real_turf_webhook_2025
FB_APP_SECRET=abc123...
FB_PAGE_ACCESS_TOKEN=EAAxxxxx...
```

**No compartas estos valores por chat.** Solo colócalos en tu archivo `.env` en el servidor.

## URL del webhook

```
https://tudominio.com/webhook/facebook
```

## Configurar en Facebook

1. Meta for Developers → tu App → **Webhooks**.
2. Suscríbete a **Page** → campo **leadgen**.
3. **Callback URL:** la URL de arriba.
4. **Verify Token:** el mismo valor que `FB_VERIFY_TOKEN` en tu `.env`.
5. Guarda y verifica que Facebook responda OK.

## Campos que se envían a Rollbase (Prospecto3)

| Formulario Facebook | Campo Rollbase | Notas |
|---------------------|----------------|-------|
| Nombre completo | `firstName` | |
| Email | `email` | |
| Teléfono | `mobilePhone` | |
| Provincia | `Provincia` | |
| Ciudad | `Ciudad` | |
| — | `Pais` | Fijo: **Colombia** |
| — | `Tema` | Fijo: **FORMS/FBADS** |

## Despliegue en la nube (Render, Railway, etc.)

El repositorio **no incluye** `.env` (secretos). En el panel de tu servicio cloud, agrega estas **variables de entorno**:

| Variable | Valor |
|----------|-------|
| `PORT` | (lo asigna el cloud, o `8080`) |
| `ROLLBASE_API_BASE_URL` | `https://www.impeltechnology.com/rest/api` |
| `ROLLBASE_LOGIN_NAME` | `realturf.geraldine` |
| `ROLLBASE_LOGIN_PASSWORD` | tu contraseña Rollbase |
| `ROLLBASE_OBJ_NAME` | `Prospecto3` |
| `FB_VERIFY_TOKEN` | `realturf_fb_webhook` |
| `FB_PAGE_ACCESS_TOKEN` | tu token de página Facebook |
| `FB_APP_SECRET` | (opcional) |
| `LEAD_DEFAULT_TEMA` | `FORMS/FBADS` |
| `LEAD_FIXED_PAIS` | `Colombia` |

**Comandos del servicio:**
- Build: `npm install`
- Start: `npm start`

**URL pública del webhook:**
```
https://TU-DOMINIO-CLOUD/webhook/facebook
```

Usa esa URL en Meta for Developers al suscribir **leadgen**.

