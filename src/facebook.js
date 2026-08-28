/**

* Facebook Lead Ads — Graph API y validación webhook
  */

const crypto = require('crypto');
const axios = require('axios');

const FB_VERIFY_TOKEN = process.env.FB_VERIFY_TOKEN || '';
const FB_APP_SECRET = process.env.FB_APP_SECRET || '';
const FB_PAGE_ACCESS_TOKEN = process.env.FB_PAGE_ACCESS_TOKEN || '';
const FB_GRAPH_API_VERSION =
process.env.FB_GRAPH_API_VERSION || 'v26.0';

const FIXED_TEMA =
process.env.LEAD_DEFAULT_TEMA || 'FORMS/FBADS';

const FIXED_PAIS =
process.env.LEAD_FIXED_PAIS || 'Colombia';

/**

* Verificación GET del webhook.
  */
  function verifyWebhook(req, res) {
  const mode = req.query['hub.mode'];
  const token = req.query['hub.verify_token'];
  const challenge = req.query['hub.challenge'];

console.log('[Facebook] Solicitud de verificación recibida', {
mode,
hasToken: Boolean(token),
hasChallenge: Boolean(challenge),
});

if (mode === 'subscribe' && token === FB_VERIFY_TOKEN) {
console.log('[Facebook] ✓ Webhook verificado correctamente');

```
return res.status(200).send(challenge);
```

}

console.error('[Facebook] ❌ Falló la verificación del webhook');

return res.status(403).json({
error: 'Verification failed',
});
}

/**

* Validar firma X-Hub-Signature-256.
  */
  function validateSignature(rawBody, signatureHeader) {
  if (!FB_APP_SECRET || FB_APP_SECRET.trim() === '') {
  console.warn(
  '[Facebook] ⚠ FB_APP_SECRET no configurado. No se puede validar la firma.'
  );
  return false;
  }

if (!signatureHeader) {
console.error('[Facebook] ❌ No llegó X-Hub-Signature-256');
return false;
}

if (!rawBody) {
console.error('[Facebook] ❌ No existe raw body para validar firma');
return false;
}

const expected =
'sha256=' +
crypto
.createHmac('sha256', FB_APP_SECRET)
.update(rawBody)
.digest('hex');

const signatureBuffer = Buffer.from(signatureHeader);
const expectedBuffer = Buffer.from(expected);

if (signatureBuffer.length !== expectedBuffer.length) {
console.error('[Facebook] ❌ Firma con longitud inválida');
return false;
}

const valid = crypto.timingSafeEqual(
signatureBuffer,
expectedBuffer
);

if (!valid) {
console.error('[Facebook] ❌ Firma inválida');
}

return valid;
}

/**

* Obtener lead desde Graph API por leadgen_id.
  */
  async function getLeadFromGraph(leadgenId) {
  if (!FB_PAGE_ACCESS_TOKEN) {
  throw new Error('FB_PAGE_ACCESS_TOKEN no está configurado');
  }

const url =
`https://graph.facebook.com/${FB_GRAPH_API_VERSION}/${leadgenId}`;

console.log('[Facebook Graph] → Consultando lead', {
leadgenId,
apiVersion: FB_GRAPH_API_VERSION,
hasAccessToken: Boolean(FB_PAGE_ACCESS_TOKEN),
});

try {
const response = await axios.get(url, {
params: {
access_token: FB_PAGE_ACCESS_TOKEN,
fields: 'id,created_time,field_data,form_id,page_id',
},
timeout: 30000,
});


console.log('[Facebook Graph] ✓ Lead obtenido correctamente', {
  leadgenId: response.data?.id,
  formId: response.data?.form_id,
  pageId: response.data?.page_id,
  fieldsCount: response.data?.field_data?.length || 0,
});

return response.data;


} catch (error) {
console.error('[Facebook Graph] ❌ ERROR AL CONSULTAR LEAD');


console.error('[Facebook Graph] Detalle:', {
  leadgenId,
  status: error.response?.status,
  message:
    error.response?.data?.error?.message ||
    error.response?.data?.message ||
    error.message,
  type: error.response?.data?.error?.type,
  code: error.response?.data?.error?.code,
  subcode: error.response?.data?.error?.error_subcode,
});

throw error;


}
}

/**

* Extraer leadgen_id del payload del webhook.
  */
  function extractLeadgenIds(payload) {
  const ids = [];

if (!payload || !payload.entry || !Array.isArray(payload.entry)) {
console.warn('[Facebook] Payload sin entries');
return ids;
}

payload.entry.forEach((entry) => {
if (!entry.changes || !Array.isArray(entry.changes)) {
return;
}


entry.changes.forEach((change) => {
  if (
    change.field === 'leadgen' &&
    change.value &&
    change.value.leadgen_id
  ) {
    ids.push(change.value.leadgen_id);
  }
});


});

const uniqueIds = [...new Set(ids)];

console.log('[Facebook] Lead IDs encontrados:', uniqueIds.length);

return uniqueIds;
}

/**

* Normalizar nombre de campo Facebook.
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
  */
  function mapLeadToRollbase(fbLead) {
  const raw = {};

if (fbLead.field_data && Array.isArray(fbLead.field_data)) {
fbLead.field_data.forEach((field) => {
if (
field.name &&
field.values &&
Array.isArray(field.values) &&
field.values[0]
) {
raw[normalizeFieldName(field.name)] =
String(field.values[0]).trim();
}
});
}

console.log('[Facebook Mapping] Campos recibidos:', Object.keys(raw));

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


if (!rbKey || !value) {
  return;
}

if (mapped[rbKey]) {
  mapped[rbKey] =
    `${mapped[rbKey]} ${value}`.trim();
} else {
  mapped[rbKey] = value;
}


});

// Si Facebook envía nombre y apellido por separado.
if (
!mapped.firstName &&
(raw.first_name || raw.last_name)
) {
mapped.firstName =
`${raw.first_name || ''} ${raw.last_name || ''}`.trim();
}

const rollbase = {
Tema: FIXED_TEMA,
Pais: FIXED_PAIS,
};

if (mapped.firstName) rollbase.firstName = mapped.firstName;
if (mapped.email) rollbase.email = mapped.email;
if (mapped.mobilePhone) {
rollbase.mobilePhone = mapped.mobilePhone;
}
if (mapped.Provincia) {
rollbase.Provincia = mapped.Provincia;
}
if (mapped.Ciudad) {
rollbase.Ciudad = mapped.Ciudad;
}

console.log('[Facebook Mapping] Campos preparados para Rollbase:', {
fields: Object.keys(rollbase),
hasName: Boolean(rollbase.firstName),
hasEmail: Boolean(rollbase.email),
hasPhone: Boolean(rollbase.mobilePhone),
});

return rollbase;
}

module.exports = {
verifyWebhook,
validateSignature,
getLeadFromGraph,
extractLeadgenIds,
mapLeadToRollbase,
};
