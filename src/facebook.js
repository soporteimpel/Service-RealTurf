/**
 * Facebook Lead Ads — Graph API y validación webhook...
 */

const crypto = require('crypto');
const axios = require('axios');

const FB_VERIFY_TOKEN = process.env.FB_VERIFY_TOKEN || '';
const FB_APP_SECRET = process.env.FB_APP_SECRET || '';
const FB_PAGE_ACCESS_TOKEN = process.env.FB_PAGE_ACCESS_TOKEN || '';
const FB_GRAPH_API_VERSION = process.env.FB_GRAPH_API_VERSION || 'v21.0';

const FIXED_TEMA = process.env.LEAD_DEFAULT_TEMA || 'FORMS/FBADS';
const FIXED_PAIS = process.env.LEAD_FIXED_PAIS || 'Colombia';

/**
 * Verificación GET del webhook (Facebook suscripción).
 */
function verifyWebhook(req, res) {
  const mode = req.query['hub.mode'];
  const token = req.query['hub.verify_token'];
  const challenge = req.query['hub.challenge'];

  if (mode === 'subscribe' && token === FB_VERIFY_TOKEN) {
    console.log('[Facebook] Webhook verificado');
    return res.status(200).send(challenge);
  }

  return res.status(403).json({ error: 'Verification failed' });
}

/**
 * Validar firma X-Hub-Signature-256.
 */
function validateSignature(rawBody, signatureHeader) {
  if (!FB_APP_SECRET || FB_APP_SECRET.trim() === '') {
    return true;
  }

  if (!signatureHeader) {
    return false;
  }

  const expected = 'sha256=' + crypto.createHmac('sha256', FB_APP_SECRET).update(rawBody).digest('hex');
  return signatureHeader === expected;
}

/**
 * Obtener lead desde Graph API por leadgen_id.
 */
async function getLeadFromGraph(leadgenId) {
  const url = `https://graph.facebook.com/${FB_GRAPH_API_VERSION}/${leadgenId}`;
  const response = await axios.get(url, {
    params: { access_token: FB_PAGE_ACCESS_TOKEN },
    timeout: 30000,
  });
  return response.data;
}

/**
 * Extraer leadgen_id del payload del webhook.
 */
function extractLeadgenIds(payload) {
  const ids = [];

  if (!payload.entry || !Array.isArray(payload.entry)) {
    return ids;
  }

  payload.entry.forEach((entry) => {
    if (!entry.changes) return;
    entry.changes.forEach((change) => {
      if (change.field === 'leadgen' && change.value && change.value.leadgen_id) {
        ids.push(change.value.leadgen_id);
      }
    });
  });

  return [...new Set(ids)];
}

/**
 * Normalizar nombre de campo Facebook (minúsculas, sin acentos extra).
 */
function normalizeFieldName(name) {
  return String(name || '')
    .trim()
    .toLowerCase()
    .normalize('NFD')
    .replace(/[\u0300-\u036f]/g, '');
}

/**
 * Mapeo field_data Facebook → campos Rollbase Prospecto3.
 *
 * Campos solicitados:
 * - Nombre completo → firstName
 * - Email → email
 * - Teléfono → mobilePhone
 * - Provincia → Provincia
 * - Ciudad → Ciudad
 * Fijos: Pais=Colombia, Tema=FORMS/FBADS
 */
function mapLeadToRollbase(fbLead) {
  const raw = {};

  if (fbLead.field_data && Array.isArray(fbLead.field_data)) {
    fbLead.field_data.forEach((field) => {
      if (field.name && field.values && field.values[0]) {
        raw[normalizeFieldName(field.name)] = String(field.values[0]).trim();
      }
    });
  }

  const mapping = {
    full_name: 'firstName',
    nombre_completo: 'firstName',
    nombrecompleto: 'firstName',
    nombres_y_apellidos: 'firstName',
    first_name: 'firstName',
    email: 'email',
    correo: 'email',
    correo_electronico: 'email',
    phone_number: 'mobilePhone',
    telefono: 'mobilePhone',
    celular: 'mobilePhone',
    whatsapp: 'mobilePhone',
    provincia: 'Provincia',
    departamento: 'Provincia',
    state: 'Provincia',
    region: 'Provincia',
    ciudad: 'Ciudad',
    city: 'Ciudad',
    municipio: 'Ciudad',
  };

  const mapped = {};

  Object.entries(raw).forEach(([fbField, value]) => {
    const rbKey = mapping[fbField];
    if (!rbKey || !value) return;

    if (mapped[rbKey]) {
      mapped[rbKey] = `${mapped[rbKey]} ${value}`.trim();
    } else {
      mapped[rbKey] = value;
    }
  });

  if (!mapped.firstName && (raw.first_name || raw.last_name)) {
    mapped.firstName = `${raw.first_name || ''} ${raw.last_name || ''}`.trim();
  }

  const rollbase = {
    Tema: FIXED_TEMA,
    Pais: FIXED_PAIS,
  };

  if (mapped.firstName) rollbase.firstName = mapped.firstName;
  if (mapped.email) rollbase.email = mapped.email;
  if (mapped.mobilePhone) rollbase.mobilePhone = mapped.mobilePhone;
  if (mapped.Provincia) rollbase.Provincia = mapped.Provincia;
  if (mapped.Ciudad) rollbase.Ciudad = mapped.Ciudad;

  return rollbase;
}

module.exports = {
  verifyWebhook,
  validateSignature,
  getLeadFromGraph,
  extractLeadgenIds,
  mapLeadToRollbase,
};
