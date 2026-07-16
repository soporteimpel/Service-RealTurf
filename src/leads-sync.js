const axios = require('axios');
const { processLeadById, processLeadData } = require('./lead-processor');

const FB_PAGE_ACCESS_TOKEN = process.env.FB_PAGE_ACCESS_TOKEN || '';
const FB_GRAPH_API_VERSION = process.env.FB_GRAPH_API_VERSION || 'v21.0';
const FB_PAGE_ID = process.env.FB_PAGE_ID || '';
const FB_FORM_IDS = (process.env.FB_FORM_IDS || '')
  .split(',')
  .map((id) => id.trim())
  .filter(Boolean);

async function graphGet(path, params = {}) {
  const url = `https://graph.facebook.com/${FB_GRAPH_API_VERSION}/${path}`;
  const response = await axios.get(url, {
    params: {
      access_token: FB_PAGE_ACCESS_TOKEN,
      ...params,
    },
    timeout: 30000,
  });
  return response.data;
}

/**
 * Obtener ID de la página desde el token (si no está en FB_PAGE_ID).
 */
async function resolvePageId() {
  if (FB_PAGE_ID) {
    return FB_PAGE_ID;
  }

  const me = await graphGet('me', { fields: 'id,name' });
  if (!me.id) {
    throw new Error('No se pudo obtener el ID de la página desde Facebook');
  }

  return me.id;
}

/**
 * Listar formularios Lead Ads (requiere permiso leads_retrieval en el token).
 */
async function getLeadgenForms(pageId) {
  const data = await graphGet(`${pageId}/leadgen_forms`, {
    fields: 'id,name,status,leads_count',
    limit: 100,
  });

  return data.data || [];
}

/**
 * Consultar leads de un formulario en Facebook.
 */
async function getFormLeads(formId, limit = 50) {
  const data = await graphGet(`${formId}/leads`, {
    fields: 'id,created_time,field_data',
    limit,
  });

  return data.data || [];
}

async function processLeadRecord(lead, formMeta = {}) {
  try {
    let processed;

    if (lead.field_data && lead.field_data.length > 0) {
      processed = await processLeadData(lead);
    } else if (lead.id) {
      processed = await processLeadById(lead.id);
    } else {
      throw new Error('Lead sin id ni field_data');
    }

    return {
      ...formMeta,
      ...processed,
    };
  } catch (error) {
    return {
      ...formMeta,
      leadgenId: lead.id,
      success: false,
      error: error.response?.data?.error?.message || error.message,
    };
  }
}

/**
 * Sincronizar leads por IDs concretos (leadgen_id).
 */
async function syncLeadsByIds(leadgenIds = []) {
  const results = [];

  for (const leadgenId of leadgenIds) {
    try {
      const processed = await processLeadById(leadgenId);
      results.push(processed);
    } catch (error) {
      results.push({
        leadgenId,
        success: false,
        error: error.response?.data?.error?.message || error.message,
      });
    }
  }

  return {
    mode: 'by_ids',
    leadsProcessed: results.filter((r) => r.success).length,
    leadsFailed: results.filter((r) => r.success === false).length,
    results,
  };
}

/**
 * Sincronizar leads desde formularios configurados o detectados en Facebook.
 */
async function syncLeadsFromFacebook(options = {}) {
  const limitPerForm = options.limitPerForm || 25;
  const formIds = options.formIds?.length ? options.formIds : FB_FORM_IDS;
  const results = [];
  let forms = [];

  if (formIds.length > 0) {
    forms = formIds.map((id) => ({ id, name: `form-${id}` }));
  } else {
    const pageId = await resolvePageId();

    try {
      forms = await getLeadgenForms(pageId);
    } catch (error) {
      const message = error.response?.data?.error?.message || error.message;
      throw new Error(
        `No se pudieron listar formularios de Facebook (${message}). ` +
          'Configura FB_FORM_IDS en Cloud Run con los IDs de tus formularios Lead Ads, ' +
          'o usa /sync/leads?ids=LEAD_ID1,LEAD_ID2 para sincronizar leads específicos.'
      );
    }
  }

  for (const form of forms) {
    let leads = [];

    try {
      leads = await getFormLeads(form.id, limitPerForm);
    } catch (error) {
      results.push({
        formId: form.id,
        formName: form.name,
        success: false,
        error: error.response?.data?.error?.message || error.message,
      });
      continue;
    }

    for (const lead of leads) {
      const processed = await processLeadRecord(lead, {
        formId: form.id,
        formName: form.name,
      });
      results.push(processed);
    }
  }

  return {
    mode: 'by_forms',
    formsProcessed: forms.length,
    leadsProcessed: results.filter((r) => r.success).length,
    leadsFailed: results.filter((r) => r.success === false).length,
    results,
  };
}

module.exports = {
  resolvePageId,
  getLeadgenForms,
  getFormLeads,
  syncLeadsByIds,
  syncLeadsFromFacebook,
};
