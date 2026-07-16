const { sendLeadToRollbase } = require('./rollbase');
const { getLeadFromGraph, mapLeadToRollbase } = require('./facebook');

/**
 * Consultar lead en Facebook Graph API y enviarlo a Rollbase.
 */
async function processLeadById(leadgenId) {
  const fbLead = await getLeadFromGraph(leadgenId);
  const rollbaseFields = mapLeadToRollbase(fbLead);
  const rollbaseResult = await sendLeadToRollbase(rollbaseFields);

  return {
    leadgenId,
    success: true,
    rollbaseFields,
    rollbase: rollbaseResult,
  };
}

/**
 * Procesar lead ya obtenido desde Graph API (sync por formulario).
 */
async function processLeadData(fbLead) {
  const leadgenId = fbLead.id;
  const rollbaseFields = mapLeadToRollbase(fbLead);
  const rollbaseResult = await sendLeadToRollbase(rollbaseFields);

  return {
    leadgenId,
    success: true,
    rollbaseFields,
    rollbase: rollbaseResult,
  };
}

module.exports = {
  processLeadById,
  processLeadData,
};
