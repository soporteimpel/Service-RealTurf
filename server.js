const express = require('express');
require('dotenv').config();

const { sendLeadToRollbase } = require('./src/rollbase');
const {
  verifyWebhook,
  validateSignature,
  getLeadFromGraph,
  extractLeadgenIds,
  mapLeadToRollbase,
} = require('./src/facebook');

const app = express();
const PORT = process.env.PORT || 8080;

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
 * GET — Verificación webhook Facebook
 */
app.get('/webhook/facebook', (req, res) => {
  verifyWebhook(req, res);
});

/**
 * POST — Recibir lead de Facebook Lead Ads → enviar a Rollbase
 */
app.post('/webhook/facebook', async (req, res) => {
  try {
    const rawBody = req.rawBody ? req.rawBody.toString('utf8') : JSON.stringify(req.body);
    const signature = req.headers['x-hub-signature-256'] || '';

    if (!validateSignature(rawBody, signature)) {
      console.error('[Facebook] Firma inválida');
      return res.status(403).json({ error: 'Invalid signature' });
    }

    const payload = req.body;
    const leadgenIds = extractLeadgenIds(payload);

    if (leadgenIds.length === 0) {
      return res.status(200).json({ success: true, processed: 0 });
    }

    const results = [];

    for (const leadgenId of leadgenIds) {
      try {
        console.log('[Facebook] Procesando lead:', leadgenId);

        const fbLead = await getLeadFromGraph(leadgenId);
        const rollbaseFields = mapLeadToRollbase(fbLead);
        const rollbaseResult = await sendLeadToRollbase(rollbaseFields);

        results.push({
          leadgenId,
          success: true,
          rollbase: rollbaseResult,
        });
      } catch (err) {
        console.error('[Facebook] Error lead', leadgenId, err.message);
        results.push({
          leadgenId,
          success: false,
          error: err.message,
        });
      }
    }

    // Facebook espera 200 rápido
    res.status(200).json({
      success: true,
      processed: results.filter((r) => r.success).length,
      results,
    });
  } catch (error) {
    console.error('[Facebook] Error webhook:', error.message);
    // 200 para evitar reintentos infinitos (igual que Wompi)
    res.status(200).json({
      success: false,
      error: error.message,
    });
  }
});

/**
 * Health check
 */
app.get('/health', (req, res) => {
  res.status(200).json({ status: 'ok', service: 'facebook-rollbase-webhook' });
});

app.listen(PORT, () => {
  console.log(`Facebook → Rollbase webhook en puerto ${PORT}`);
  console.log(`Webhook URL: http://localhost:${PORT}/webhook/facebook`);
});
