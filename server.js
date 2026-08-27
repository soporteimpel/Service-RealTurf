require('dotenv').config();

const express = require('express');

const { validateEnv } = require('./src/env');

const { processLeadById } = require('./src/lead-processor');

const {
  syncLeadsFromFacebook,
  syncLeadsByIds,
} = require('./src/leads-sync');

const facebook = require('./src/facebook');

const {
  verifyWebhook,
  validateSignature,
  extractLeadgenIds,
} = facebook;

const app = express();

const PORT = process.env.PORT || 8080;

const SYNC_SECRET = process.env.SYNC_SECRET || '';

/* =========================================================
   VALIDACIÓN DE VARIABLES
========================================================= */

validateEnv();

/* =========================================================
   DIAGNÓSTICO DE FUNCIONES IMPORTADAS
========================================================= */

console.log('');
console.log('==============================================');
console.log('🔍 DIAGNÓSTICO DE MÓDULOS');
console.log('==============================================');

console.log('[Module] ./src/facebook cargado:', Boolean(facebook));

console.log(
  '[Module] verifyWebhook:',
  typeof verifyWebhook
);

console.log(
  '[Module] validateSignature:',
  typeof validateSignature
);

console.log(
  '[Module] extractLeadgenIds:',
  typeof extractLeadgenIds
);

console.log(
  '[Module] processLeadById:',
  typeof processLeadById
);

console.log(
  '[Module] syncLeadsFromFacebook:',
  typeof syncLeadsFromFacebook
);

console.log(
  '[Module] syncLeadsByIds:',
  typeof syncLeadsByIds
);

console.log('==============================================');
console.log('');

/* =========================================================
   AUTORIZACIÓN SYNC
========================================================= */

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

/* =========================================================
   RAW BODY PARA FACEBOOK
========================================================= */

app.use(
  express.json({
    verify: (req, res, buf) => {
      req.rawBody = buf;
    },
  })
);

app.use(
  express.urlencoded({
    extended: true,
  })
);

/* =========================================================
   GET — VERIFICACIÓN FACEBOOK
========================================================= */

function handleFacebookWebhookGet(req, res) {
  const requestId =
    `${Date.now()}-${Math.random()
      .toString(36)
      .substring(2, 8)}`;

  console.log(
    `[Webhook GET ${requestId}] Solicitud recibida`
  );

  console.log(
    `[Webhook GET ${requestId}] Query:`,
    {
      mode: req.query['hub.mode'] || '',
      hasToken: Boolean(
        req.query['hub.verify_token']
      ),
      hasChallenge: Boolean(
        req.query['hub.challenge']
      ),
    }
  );

  if (req.query['hub.mode']) {
    console.log(
      `[Webhook GET ${requestId}] → Ejecutando verifyWebhook`
    );

    try {
      const result = verifyWebhook(req, res);

      console.log(
        `[Webhook GET ${requestId}] ✓ verifyWebhook ejecutado`
      );

      return result;
    } catch (error) {
      console.error(
        `[Webhook GET ${requestId}] ❌ Error verifyWebhook:`,
        error.message
      );

      console.error(
        `[Webhook GET ${requestId}] STACK:`,
        error.stack
      );

      return res.status(500).json({
        success: false,
        error: error.message,
      });
    }
  }

  return res.status(200).json({
    status: 'ok',
    service: 'facebook-rollbase-webhook',
    webhook: '/webhook/facebook',
  });
}

/* =========================================================
   POST — FACEBOOK LEAD ADS
========================================================= */

async function handleFacebookWebhookPost(req, res) {
  const requestId =
    `${Date.now()}-${Math.random()
      .toString(36)
      .substring(2, 8)}`;

  console.log('');
  console.log(
    `[Webhook ${requestId}] ================================================`
  );
  console.log(
    `[Webhook ${requestId}] ===== EVENTO FACEBOOK RECIBIDO =====`
  );
  console.log(
    `[Webhook ${requestId}] ================================================`
  );

  try {
    /* -----------------------------------------------------
       1. INFORMACIÓN BÁSICA
    ----------------------------------------------------- */

    console.log(
      `[Webhook ${requestId}] [1] Analizando request`
    );

    const rawBody = req.rawBody
      ? req.rawBody.toString('utf8')
      : JSON.stringify(req.body);

    const signature =
      req.headers['x-hub-signature-256'] || '';

    console.log(
      `[Webhook ${requestId}] Información:`,
      {
        hasRawBody: Boolean(req.rawBody),
        rawBodyLength: rawBody?.length || 0,
        hasSignature: Boolean(signature),
        object: req.body?.object,
        entries: Array.isArray(req.body?.entry)
          ? req.body.entry.length
          : 0,
        bodyType: typeof req.body,
      }
    );

    /* -----------------------------------------------------
       2. VALIDAR FIRMA
    ----------------------------------------------------- */

    console.log(
      `[Webhook ${requestId}] [2] → Validando firma`
    );

    console.log(
      `[Webhook ${requestId}] validateSignature type:`,
      typeof validateSignature
    );

    if (typeof validateSignature !== 'function') {
      throw new Error(
        `validateSignature no es una función. Tipo recibido: ${typeof validateSignature}`
      );
    }

    const signatureValid =
      validateSignature(
        rawBody,
        signature
      );

    console.log(
      `[Webhook ${requestId}] Resultado validación firma:`,
      signatureValid
    );

    if (!signatureValid) {
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

    /* -----------------------------------------------------
       3. EXTRAER LEADGEN IDS
    ----------------------------------------------------- */

    console.log(
      `[Webhook ${requestId}] [3] → Preparando extracción de leadgen_id`
    );

    console.log(
      `[Webhook ${requestId}] extractLeadgenIds type:`,
      typeof extractLeadgenIds
    );

    if (typeof extractLeadgenIds !== 'function') {
      throw new Error(
        `extractLeadgenIds no es una función. Tipo recibido: ${typeof extractLeadgenIds}`
      );
    }

    console.log(
      `[Webhook ${requestId}] Payload Facebook:`,
      JSON.stringify(
        req.body,
        null,
        2
      )
    );

    console.log(
      `[Webhook ${requestId}] [3.1] → Ejecutando extractLeadgenIds()`
    );

    const leadgenIds =
      extractLeadgenIds(req.body);

    console.log(
      `[Webhook ${requestId}] [3.2] ✓ extractLeadgenIds terminó`
    );

    console.log(
      `[Webhook ${requestId}] Leadgen IDs encontrados:`,
      leadgenIds
    );

    /* -----------------------------------------------------
       4. VALIDAR RESULTADO
    ----------------------------------------------------- */

    if (!Array.isArray(leadgenIds)) {
      throw new Error(
        `extractLeadgenIds no devolvió un array. Tipo: ${typeof leadgenIds}`
      );
    }

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

    /* -----------------------------------------------------
       5. PROCESAR LEADS
    ----------------------------------------------------- */

    const results = [];

    for (const leadgenId of leadgenIds) {
      try {
        console.log('');
        console.log(
          `[Webhook ${requestId}] =================================`
        );

        console.log(
          `[Webhook ${requestId}] [5] Procesando lead: ${leadgenId}`
        );

        console.log(
          `[Webhook ${requestId}] processLeadById type:`,
          typeof processLeadById
        );

        if (typeof processLeadById !== 'function') {
          throw new Error(
            `processLeadById no es una función. Tipo recibido: ${typeof processLeadById}`
          );
        }

        console.log(
          `[Webhook ${requestId}] [5.1] → Llamando processLeadById()`
        );

        const result =
          await processLeadById(
            leadgenId
          );

        console.log(
          `[Webhook ${requestId}] [5.2] ✓ processLeadById terminó`
        );

        console.log(
          `[Webhook ${requestId}] Resultado lead:`,
          JSON.stringify(
            result,
            null,
            2
          )
        );

        results.push(result);

      } catch (error) {
        const fbError =
          error.response?.data?.error?.message;

        console.error(
          `[Webhook ${requestId}] ❌ Error procesando ${leadgenId}:`,
          fbError || error.message
        );

        console.error(
          `[Webhook ${requestId}] STACK del error:`,
          error.stack
        );

        if (error.response) {
          console.error(
            `[Webhook ${requestId}] HTTP Status:`,
            error.response.status
          );

          console.error(
            `[Webhook ${requestId}] Facebook/Rollbase response:`,
            JSON.stringify(
              error.response.data
            )
          );
        }

        results.push({
          leadgenId,
          success: false,
          error:
            fbError ||
            error.message,
        });
      }
    }

    /* -----------------------------------------------------
       6. RESULTADO FINAL
    ----------------------------------------------------- */

    const processed =
      results.filter(
        (r) => r.success
      ).length;

    const failed =
      results.filter(
        (r) => r.success === false
      ).length;

    console.log('');
    console.log(
      `[Webhook ${requestId}] ================================================`
    );

    console.log(
      `[Webhook ${requestId}] ===== FINALIZADO =====`
    );

    console.log(
      `[Webhook ${requestId}] OK: ${processed}`
    );

    console.log(
      `[Webhook ${requestId}] ERROR: ${failed}`
    );

    console.log(
      `[Webhook ${requestId}] ================================================`
    );

    return res.status(200).json({
      success: true,
      processed,
      failed,
      results,
    });

  } catch (error) {

    /* -----------------------------------------------------
       ERROR GENERAL
    ----------------------------------------------------- */

    console.error('');
    console.error(
      `[Webhook ${requestId}] ❌❌❌ ERROR GENERAL ❌❌❌`
    );

    console.error(
      `[Webhook ${requestId}] Message:`,
      error.message
    );

    console.error(
      `[Webhook ${requestId}] Error name:`,
      error.name
    );

    console.error(
      `[Webhook ${requestId}] Error stack:`
    );

    console.error(
      error.stack
    );

    console.error(
      `[Webhook ${requestId}] Error type:`,
      typeof error
    );

    if (error.response) {
      console.error(
        `[Webhook ${requestId}] HTTP Status:`,
        error.response.status
      );

      console.error(
        `[Webhook ${requestId}] Response:`,
        JSON.stringify(
          error.response.data
        )
      );
    }

    console.error(
      `[Webhook ${requestId}] ================================================`
    );

    return res.status(200).json({
      success: false,
      error: error.message,
    });
  }
}

/* =========================================================
   RUTAS WEBHOOK
========================================================= */

app.get(
  '/',
  handleFacebookWebhookGet
);

app.post(
  '/',
  handleFacebookWebhookPost
);

app.get(
  '/webhook/facebook',
  handleFacebookWebhookGet
);

app.post(
  '/webhook/facebook',
  handleFacebookWebhookPost
);

/* =========================================================
   SYNC MANUAL
========================================================= */

async function handleSyncLeads(req, res) {

  if (!isSyncAuthorized(req)) {
    console.warn(
      '[Sync] ❌ Intento no autorizado'
    );

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

    const leadgenIds =
      idsParam
        ? String(idsParam)
            .split(',')
            .map(
              (id) => id.trim()
            )
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
        idsCount:
          leadgenIds.length,
      }
    );

    const result =
      leadgenIds.length > 0
        ? await syncLeadsByIds(
            leadgenIds
          )
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

    console.error(
      '[Sync] STACK:',
      error.stack
    );

    if (error.response) {
      console.error(
        '[Sync] HTTP Status:',
        error.response.status
      );

      console.error(
        '[Sync] Response:',
        JSON.stringify(
          error.response.data
        )
      );
    }

    return res.status(500).json({
      success: false,
      error: error.message,
    });
  }
}

app.get(
  '/sync/leads',
  handleSyncLeads
);

app.post(
  '/sync/leads',
  handleSyncLeads
);

/* =========================================================
   HEALTH CHECK
========================================================= */

app.get(
  '/health',
  (req, res) => {

    return res.status(200).json({
      status: 'ok',
      service:
        'facebook-rollbase-webhook',
      syncEnabled:
        Boolean(SYNC_SECRET),
      timestamp:
        new Date().toISOString(),
    });

  }
);

/* =========================================================
   START SERVER
========================================================= */

app.listen(
  PORT,
  () => {

    console.log('');

    console.log(
      '=============================================='
    );

    console.log(
      '🚀 FACEBOOK → ROLLBASE WEBHOOK INICIADO'
    );

    console.log(
      '=============================================='
    );

    console.log(
      `Puerto: ${PORT}`
    );

    console.log(
      'Webhook: /webhook/facebook'
    );

    console.log(
      'Sync:    /sync/leads'
    );

    console.log(
      'Health:  /health'
    );

    console.log(
      '=============================================='
    );

    console.log('');

  }
);