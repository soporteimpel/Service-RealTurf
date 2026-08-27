const { sendLeadToRollbase } = require('./rollbase');
const {
getLeadFromGraph,
mapLeadToRollbase,
} = require('./facebook');

/**

* Consultar lead en Facebook Graph API y enviarlo a Rollbase.
  */
  async function processLeadById(leadgenId) {
  console.log('');
  console.log(
  `[Lead ${leadgenId}] ===== INICIANDO PROCESAMIENTO =====`
  );

try {
// PASO 1
console.log(
`[Lead ${leadgenId}] PASO 1/3 → Consultando Facebook Graph API`
);


const fbLead = await getLeadFromGraph(leadgenId);

console.log(
  `[Lead ${leadgenId}] ✓ Facebook respondió correctamente`
);

// PASO 2
console.log(
  `[Lead ${leadgenId}] PASO 2/3 → Mapeando campos para Rollbase`
);

const rollbaseFields = mapLeadToRollbase(fbLead);

console.log(`[Lead ${leadgenId}] ✓ Mapeo completado`, {
  fields: Object.keys(rollbaseFields),
});

// PASO 3
console.log(
  `[Lead ${leadgenId}] PASO 3/3 → Enviando lead a Rollbase`
);

const rollbaseResult =
  await sendLeadToRollbase(rollbaseFields);

console.log(
  `[Lead ${leadgenId}] ✓ Rollbase respondió correctamente`,
  {
    status: rollbaseResult?.status,
    id:
      rollbaseResult?.id ||
      rollbaseResult?.recordId ||
      rollbaseResult?.objectId,
  }
);

console.log(
  `[Lead ${leadgenId}] ===== PROCESAMIENTO EXITOSO =====`
);

return {
  leadgenId,
  success: true,
  rollbaseFields,
  rollbase: rollbaseResult,
};


} catch (error) {
console.error('');
console.error(
`[Lead ${leadgenId}] ❌ ===== ERROR EN PROCESAMIENTO =====`
);


console.error(
  `[Lead ${leadgenId}] Mensaje: ${error.message}`
);

if (error.response) {
  console.error(
    `[Lead ${leadgenId}] HTTP Status: ${error.response.status}`
  );

  console.error(
    `[Lead ${leadgenId}] Response Data:`,
    JSON.stringify(error.response.data)
  );
}

console.error(
  `[Lead ${leadgenId}] ===================================`
);

throw error;


}
}

/**

* Procesar lead ya obtenido desde Graph API.
  */
  async function processLeadData(fbLead) {
  const leadgenId = fbLead.id || 'sin-id';

console.log(
`[Lead ${leadgenId}] Procesando lead desde sincronización`
);

try {
const rollbaseFields = mapLeadToRollbase(fbLead);


console.log(
  `[Lead ${leadgenId}] Campos preparados:`,
  Object.keys(rollbaseFields)
);

const rollbaseResult =
  await sendLeadToRollbase(rollbaseFields);

console.log(
  `[Lead ${leadgenId}] ✓ Sincronización enviada a Rollbase`
);

return {
  leadgenId,
  success: true,
  rollbaseFields,
  rollbase: rollbaseResult,
};


} catch (error) {
console.error(
`[Lead ${leadgenId}] ❌ Error sincronizando lead:`,
error.message
);


if (error.response) {
  console.error(
    `[Lead ${leadgenId}] HTTP Status:`,
    error.response.status
  );

  console.error(
    `[Lead ${leadgenId}] Response:`,
    JSON.stringify(error.response.data)
  );
}

throw error;


}
}

module.exports = {
processLeadById,
processLeadData,
};
