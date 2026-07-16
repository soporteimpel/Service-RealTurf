/**
 * Cliente Rollbase — mismo patrón que webhook Wompi.
 * login (POST) → sessionId → create2 (GET)
 */

const axios = require('axios');

const ROLLBASE_API_BASE_URL = process.env.ROLLBASE_API_BASE_URL || 'https://www.impeltechnology.com/rest/api';
const ROLLBASE_LOGIN_NAME = process.env.ROLLBASE_LOGIN_NAME || '';
const ROLLBASE_LOGIN_PASSWORD = process.env.ROLLBASE_LOGIN_PASSWORD || '';
const ROLLBASE_OBJ_NAME = process.env.ROLLBASE_OBJ_NAME || 'Prospecto3';

let rollbaseToken = '';
let tokenExpiration = 0;

/**
 * Obtener sessionId de Rollbase (cache 30 min).
 */
async function getRollbaseToken() {
  if (rollbaseToken && Date.now() < tokenExpiration) {
    return rollbaseToken;
  }

  const loginUrl = `${ROLLBASE_API_BASE_URL}/login`;
  const params = new URLSearchParams({
    loginName: ROLLBASE_LOGIN_NAME,
    password: ROLLBASE_LOGIN_PASSWORD,
    output: 'json',
  });

  const response = await axios.post(loginUrl, params.toString(), {
    headers: { 'Content-Type': 'application/x-www-form-urlencoded' },
    timeout: 30000,
  });

  if (response.data && response.data.sessionId && response.data.status === 'ok') {
    rollbaseToken = response.data.sessionId;
    tokenExpiration = Date.now() + 30 * 60 * 1000;
    return rollbaseToken;
  }

  if (response.data && response.data.sessionId) {
    rollbaseToken = response.data.sessionId;
    tokenExpiration = Date.now() + 30 * 60 * 1000;
    return rollbaseToken;
  }

  throw new Error('No se pudo obtener sessionId de Rollbase');
}

/**
 * Crear registro en Rollbase vía create2 (GET con query params).
 * Igual que createRollbaseRecord() del webhook Wompi.
 */
async function createRollbaseRecord(objName, fields) {
  const token = await getRollbaseToken();
  const createUrl = `${ROLLBASE_API_BASE_URL}/create2`;

  const params = new URLSearchParams({
    objName: objName,
    sessionId: token,
    output: 'json',
    useIds: 'true',
  });

  Object.entries(fields).forEach(([key, value]) => {
    if (value !== null && value !== undefined && value !== '') {
      params.append(key, String(value));
    }
  });

  const response = await axios.get(`${createUrl}?${params.toString()}`, {
    timeout: 30000,
  });

  return response.data;
}

/**
 * Enviar lead de Facebook a Prospecto3.
 */
async function sendLeadToRollbase(fields) {
  return createRollbaseRecord(ROLLBASE_OBJ_NAME, fields);
}

module.exports = {
  getRollbaseToken,
  createRollbaseRecord,
  sendLeadToRollbase,
};
