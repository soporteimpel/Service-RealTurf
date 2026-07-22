require('dotenv').config();

const express = require('express');
const { validateEnv } = require('./src/env');
const { processLeadById } = require('./src/lead-processor');
const { syncLeadsFromFacebook, syncLeadsByIds } = require('./src/leads-sync');
const {
  verifyWebhook,
  validateSignature,
  extractLeadgenIds,
} = require('./src/facebook');

const app = express();
const PORT = process.env.PORT || 8080;
const SYNC_SECRET = process.env.SYNC_SECRET || '';

validateEnv();

function isSyncAuthorized(req) {
  if (!SYNC_SECRET) {
    return false;
  }

  const headerSecret = req.headers['x-sync-secret'] || '';
  const querySecret = req.query.secret || '';
  return headerSecret === SYNC_SECRET || querySecret === SYNC_SECRET;
}

// Raw body para validar firma Facebook
app.use(
  express.json({
    verify: (req, res, buf) => {
      req.rawBody = buf;
    },
  })
);
app.use(express.urlencoded({ extended: true }));

/**
 * GET — Verificación webhook Facebook (Meta envía hub.mode, hub.verify_token, hub.challenge)
 */
function handleFacebookWebhookGet(req, res) {
  if (req.query['hub.mode']) {
    return verifyWebhook(req, res);
  }

  res.status(200).json({
    status: 'ok',
    service: 'facebook-rollbase-webhook',
    webhook: '/webhook/facebook',
  });
}

/**
 * POST — Webhook Facebook Lead Ads → consulta Graph API → Rollbase
 */
async function handleFacebookWebhookPost(req, res) {
  try {
    const rawBody = req.rawBody ? req.rawBody.toString('utf8') : JSON.stringify(req.body);
    const signature = req.headers['x-hub-signature-256'] || '';

    if (!validateSignature(rawBody, signature)) {
      console.error('[Facebook] Firma inválida');
      return res.status(403).json({ error: 'Invalid signature' });
    }

    const leadgenIds = extractLeadgenIds(req.body);

    if (leadgenIds.length === 0) {
      return res.status(200).json({ success: true, processed: 0 });
    }

    const results = [];

    for (const leadgenId of leadgenIds) {
      try {
        console.log('[Facebook] Procesando lead:', leadgenId);
        const result = await processLeadById(leadgenId);
        results.push(result);
      } catch (err) {
        console.error('[Facebook] Error lead', leadgenId, err.message);
        results.push({
          leadgenId,
          success: false,
          error: err.message,
        });
      }
    }

    res.status(200).json({
      success: true,
      processed: results.filter((r) => r.success).length,
      results,
    });
  } catch (error) {
    console.error('[Facebook] Error webhook:', error.message);
    res.status(200).json({
      success: false,
      error: error.message,
    });
  }
}

// Raíz y /webhook/facebook — Meta puede usar cualquiera de las dos URLs
app.get('/', handleFacebookWebhookGet);
app.post('/', handleFacebookWebhookPost);
app.get('/webhook/facebook', handleFacebookWebhookGet);
app.post('/webhook/facebook', handleFacebookWebhookPost);

/**
 * POST/GET — Consultar leads en Facebook y enviar a Rollbase (sync manual o Cloud Scheduler)
 */
async function handleSyncLeads(req, res) {
  if (!isSyncAuthorized(req)) {
    return res.status(401).json({
      error: 'No autorizado. Configura SYNC_SECRET en Cloud Run.',
    });
  }

  try {
    const limitPerForm = Number(req.query.limit || req.body?.limit || 25);
    const idsParam = req.query.ids || req.body?.ids || req.body?.leadgenIds;
    const leadgenIds = idsParam
      ? String(idsParam)
          .split(',')
          .map((id) => id.trim())
          .filter(Boolean)
      : [];

    console.log('[Sync] Consultando leads en Facebook...');

    const result = leadgenIds.length
      ? await syncLeadsByIds(leadgenIds)
      : await syncLeadsFromFacebook({ limitPerForm });

    res.status(200).json({
      success: true,
      ...result,
    });
  } catch (error) {
    console.error('[Sync] Error:', error.message);
    res.status(500).json({
      success: false,
      error: error.message,
    });
  }
}

app.get('/sync/leads', handleSyncLeads);
app.post('/sync/leads', handleSyncLeads);

/**
 * Health check
 */
app.get('/health', (req, res) => {
  res.status(200).json({
    status: 'ok',
    service: 'facebook-rollbase-webhook',
    syncEnabled: Boolean(SYNC_SECRET),
  });
});

app.listen(PORT, () => {
  console.log(`Facebook → Rollbase webhook en puerto ${PORT}`);
  console.log(`Webhook:  http://localhost:${PORT}/webhook/facebook (también /)`);
  console.log(`Sync:     http://localhost:${PORT}/sync/leads`);
  console.log(`Health:   http://localhost:${PORT}/health`);
});
