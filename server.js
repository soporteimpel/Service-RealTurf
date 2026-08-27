require('dotenv').config();

const express = require('express');

const { validateEnv } = require('./src/env');
const { processLeadById } = require('./src/lead-processor');
const {
syncLeadsFromFacebook,
syncLeadsByIds,
} = require('./src/leads-sync');

const {
verifyWebhook,
validateSignature,
extractLeadgenIds,
} = require('./src/facebook');

const app = express();

const PORT = process.env.PORT || 8080;
const SYNC_SECRET = process.env.SYNC_SECRET || '';

validateEnv();

/**

* Validar autorización para sincronización manual.
  */
  function isSyncAuthorized(req) {
  if (!SYNC_SECRET) {
  return false;
  }

const headerSecret =
req.headers['x-sync-secret'] || '';

const querySecret =
req.query.secret || '';

return (
headerSecret === SYNC_SECRET ||
querySecret === SYNC_SECRET
);
}

/**

* Guardar Raw Body para validar la firma de Facebook.
  */
  app.use(
  express.json({
  verify: (req, res, buf) => {
  req.rawBody = buf;
  },
  })
  );

app.use(express.urlencoded({ extended: true }));

/**

* GET — Verificación del webhook de Facebook.
  */
  function handleFacebookWebhookGet(req, res) {
  if (req.query['hub.mode']) {
  return verifyWebhook(req, res);
  }

return res.status(200).json({
status: 'ok',
service: 'facebook-rollbase-webhook',
webhook: '/webhook/facebook',
});
}

/**

* POST — Facebook Lead Ads → Facebook Graph API → Rollbase.
  */
  async function handleFacebookWebhookPost(req, res) {
  const requestId =
  `${Date.now()}-${Math.random()
     .toString(36)
     .substring(2, 8)}`;

console.log('');
console.log(
`[Webhook ${requestId}] ===== EVENTO FACEBOOK RECIBIDO =====`
);

try {
const rawBody = req.rawBody
? req.rawBody.toString('utf8')
: JSON.stringify(req.body);


const signature =
  req.headers['x-hub-signature-256'] || '';

console.log(`[Webhook ${requestId}] Información:`, {
  hasSignature: Boolean(signature),
  object: req.body?.object,
  entries: req.body?.entry?.length || 0,
});

// Validar firma
if (!validateSignature(rawBody, signature)) {
  console.error(
    `[Webhook ${requestId}] ❌ Firma inválida`
  );

  return res.status(403).json({
    error: 'Invalid signature',
  });
}

console.log(
  `[Webhook ${requestId}] ✓ Firma validada correctamente`
);

// Extraer IDs
const leadgenIds =
  extractLeadgenIds(req.body);

if (leadgenIds.length === 0) {
  console.log(
    `[Webhook ${requestId}] ⚠ Evento sin leadgen_id`
  );

  return res.status(200).json({
    success: true,
    processed: 0,
  });
}

console.log(
  `[Webhook ${requestId}] Leads a procesar: ${leadgenIds.length}`
);

const results = [];

for (const leadgenId of leadgenIds) {
  try {
    console.log(
      `[Webhook ${requestId}] → Procesando lead ${leadgenId}`
    );

    const result =
      await processLeadById(leadgenId);

    results.push(result);

  } catch (error) {
    const fbError =
      error.response?.data?.error?.message;

    console.error(
      `[Webhook ${requestId}] ❌ Error procesando ${leadgenId}:`,
      fbError || error.message
    );

    results.push({
      leadgenId,
      success: false,
      error: fbError || error.message,
    });
  }
}

const processed =
  results.filter((r) => r.success).length;

const failed =
  results.filter((r) => r.success === false).length;

console.log(
  `[Webhook ${requestId}] ===== FINALIZADO | OK: ${processed} | ERROR: ${failed} =====`
);

return res.status(200).json({
  success: true,
  processed,
  failed,
  results,
});


} catch (error) {
console.error(
`[Webhook ${requestId}] ❌ ERROR GENERAL:`,
error.message
);


if (error.response) {
  console.error(
    `[Webhook ${requestId}] HTTP Status:`,
    error.response.status
  );

  console.error(
    `[Webhook ${requestId}] Response:`,
    JSON.stringify(error.response.data)
  );
}

return res.status(200).json({
  success: false,
  error: error.message,
});


}
}

/**

* Rutas principales del webhook.
  */
  app.get('/', handleFacebookWebhookGet);
  app.post('/', handleFacebookWebhookPost);

app.get(
'/webhook/facebook',
handleFacebookWebhookGet
);

app.post(
'/webhook/facebook',
handleFacebookWebhookPost
);

/**

* GET/POST — Sincronización manual o Cloud Scheduler.
  */
  async function handleSyncLeads(req, res) {
  if (!isSyncAuthorized(req)) {
  console.warn('[Sync] ❌ Intento no autorizado');

  return res.status(401).json({
  error:
  'No autorizado. Configura SYNC_SECRET correctamente.',
  });
  }

try {
const limitPerForm =
Number(
req.query.limit ||
req.body?.limit ||
25
);


const idsParam =
  req.query.ids ||
  req.body?.ids ||
  req.body?.leadgenIds;

const leadgenIds = idsParam
  ? String(idsParam)
      .split(',')
      .map((id) => id.trim())
      .filter(Boolean)
  : [];

console.log(
  '[Sync] Solicitud recibida:',
  {
    mode:
      leadgenIds.length > 0
        ? 'por IDs'
        : 'por formularios',
    limitPerForm,
    idsCount: leadgenIds.length,
  }
);

const result =
  leadgenIds.length > 0
    ? await syncLeadsByIds(leadgenIds)
    : await syncLeadsFromFacebook({
        limitPerForm,
      });

return res.status(200).json({
  success: true,
  ...result,
});


} catch (error) {
console.error(
'[Sync] ❌ ERROR:',
error.message
);


if (error.response) {
  console.error(
    '[Sync] HTTP Status:',
    error.response.status
  );

  console.error(
    '[Sync] Response:',
    JSON.stringify(error.response.data)
  );
}

return res.status(500).json({
  success: false,
  error: error.message,
});


}
}

app.get('/sync/leads', handleSyncLeads);
app.post('/sync/leads', handleSyncLeads);

/**

* Health check.
  */
  app.get('/health', (req, res) => {
  return res.status(200).json({
  status: 'ok',
  service: 'facebook-rollbase-webhook',
  syncEnabled: Boolean(SYNC_SECRET),
  timestamp: new Date().toISOString(),
  });
  });

app.listen(PORT, () => {
console.log('');
console.log('==============================================');
console.log('🚀 FACEBOOK → ROLLBASE WEBHOOK INICIADO');
console.log('==============================================');
console.log(`Puerto: ${PORT}`);
console.log(`Webhook: /webhook/facebook`);
console.log(`Sync:    /sync/leads`);
console.log(`Health:  /health`);
console.log('==============================================');
console.log('');
});
