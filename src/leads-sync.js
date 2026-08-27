const axios = require('axios');

const {
processLeadById,
processLeadData,
} = require('./lead-processor');

const FB_PAGE_ACCESS_TOKEN =
process.env.FB_PAGE_ACCESS_TOKEN || '';

const FB_GRAPH_API_VERSION =
process.env.FB_GRAPH_API_VERSION || 'v26.0';

const FB_PAGE_ID =
process.env.FB_PAGE_ID || '';

const FB_FORM_IDS = (
process.env.FB_FORM_IDS || ''
)
.split(',')
.map((id) => id.trim())
.filter(Boolean);

/**

* Realizar petición GET a Facebook Graph API.
  */
  async function graphGet(path, params = {}) {
  const url =
  `https://graph.facebook.com/${FB_GRAPH_API_VERSION}/${path}`;

console.log('[Facebook Sync] → Graph API request', {
path,
apiVersion: FB_GRAPH_API_VERSION,
});

try {
const response = await axios.get(url, {
params: {
access_token: FB_PAGE_ACCESS_TOKEN,
...params,
},
timeout: 30000,
});

```
return response.data;
```

} catch (error) {
console.error('[Facebook Sync] ❌ Graph API error', {
path,
status: error.response?.status,
message:
error.response?.data?.error?.message ||
error.message,
code: error.response?.data?.error?.code,
});

```
throw error;
```

}
}

/**

* Obtener ID de página desde el token.
  */
  async function resolvePageId() {
  if (FB_PAGE_ID) {
  console.log(
  '[Facebook Sync] ✓ Usando FB_PAGE_ID configurado'
  );

  return FB_PAGE_ID;
  }

console.log(
'[Facebook Sync] → Obteniendo ID de página desde token'
);

const me = await graphGet('me', {
fields: 'id,name',
});

if (!me.id) {
throw new Error(
'No se pudo obtener el ID de la página desde Facebook'
);
}

console.log(
'[Facebook Sync] ✓ Página encontrada:',
me.id
);

return me.id;
}

/**

* Listar formularios Lead Ads.
  */
  async function getLeadgenForms(pageId) {
  console.log(
  '[Facebook Sync] → Consultando formularios de la página'
  );

const data = await graphGet(
`${pageId}/leadgen_forms`,
{
fields: 'id,name,status,leads_count',
limit: 100,
}
);

const forms = data.data || [];

console.log(
`[Facebook Sync] ✓ Formularios encontrados: ${forms.length}`
);

return forms;
}

/**

* Consultar leads de un formulario.
  */
  async function getFormLeads(formId, limit = 50) {
  console.log(
  `[Facebook Sync] → Consultando leads del formulario ${formId}`
  );

const data = await graphGet(
`${formId}/leads`,
{
fields: 'id,created_time,field_data',
limit,
}
);

const leads = data.data || [];

console.log(
`[Facebook Sync] ✓ Leads encontrados: ${leads.length}`
);

return leads;
}

/**

* Procesar un lead ya obtenido.
  */
  async function processLeadRecord(
  lead,
  formMeta = {}
  ) {
  try {
  let processed;

  if (
  lead.field_data &&
  Array.isArray(lead.field_data) &&
  lead.field_data.length > 0
  ) {
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
console.error(
'[Facebook Sync] ❌ Error procesando lead:',
lead.id,
error.message
);

```
return {
  ...formMeta,
  leadgenId: lead.id,
  success: false,
  error:
    error.response?.data?.error?.message ||
    error.message,
};
```

}
}

/**

* Sincronizar leads por IDs concretos.
  */
  async function syncLeadsByIds(
  leadgenIds = []
  ) {
  console.log(
  `[Sync] ===== SINCRONIZANDO ${leadgenIds.length} LEADS POR ID =====`
  );

const results = [];

for (const leadgenId of leadgenIds) {
try {
const processed =
await processLeadById(leadgenId);


  results.push(processed);

} catch (error) {
  results.push({
    leadgenId,
    success: false,
    error:
      error.response?.data?.error?.message ||
      error.message,
  });
}


}

return {
mode: 'by_ids',
leadsProcessed:
results.filter((r) => r.success).length,
leadsFailed:
results.filter((r) => r.success === false).length,
results,
};
}

/**

* Sincronizar leads desde formularios.
  */
  async function syncLeadsFromFacebook(
  options = {}
  ) {
  const limitPerForm =
  Number(options.limitPerForm) || 25;

const formIds =
options.formIds?.length
? options.formIds
: FB_FORM_IDS;

const results = [];
let forms = [];

console.log(
'[Sync] ===== INICIANDO SINCRONIZACIÓN DESDE FACEBOOK ====='
);

if (formIds.length > 0) {
forms = formIds.map((id) => ({
id,
name: `form-${id}`,
}));


console.log(
  `[Sync] Usando ${forms.length} formularios configurados`
);


} else {
const pageId = await resolvePageId();


try {
  forms = await getLeadgenForms(pageId);

} catch (error) {
  const message =
    error.response?.data?.error?.message ||
    error.message;

  throw new Error(
    `No se pudieron listar formularios de Facebook (${message}). ` +
    'Configura FB_FORM_IDS con los IDs de tus formularios Lead Ads.'
  );
}


}

for (const form of forms) {
let leads = [];


try {
  leads = await getFormLeads(
    form.id,
    limitPerForm
  );

} catch (error) {
  results.push({
    formId: form.id,
    formName: form.name,
    success: false,
    error:
      error.response?.data?.error?.message ||
      error.message,
  });

  continue;
}

for (const lead of leads) {
  const processed = await processLeadRecord(
    lead,
    {
      formId: form.id,
      formName: form.name,
    }
  );

  results.push(processed);
}


}

console.log(
'[Sync] ===== SINCRONIZACIÓN FINALIZADA ====='
);

return {
mode: 'by_forms',
formsProcessed: forms.length,
leadsProcessed:
results.filter((r) => r.success).length,
leadsFailed:
results.filter((r) => r.success === false).length,
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
