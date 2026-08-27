/**

* Cliente Rollbase
* Login → sessionId → create2
  */

const axios = require('axios');

const ROLLBASE_API_BASE_URL =
process.env.ROLLBASE_API_BASE_URL ||
'https://www.impeltechnology.com/rest/api';

const ROLLBASE_LOGIN_NAME =
process.env.ROLLBASE_LOGIN_NAME || '';

const ROLLBASE_LOGIN_PASSWORD =
process.env.ROLLBASE_LOGIN_PASSWORD || '';

const ROLLBASE_OBJ_NAME =
process.env.ROLLBASE_OBJ_NAME || 'Prospecto3';

let rollbaseToken = '';
let tokenExpiration = 0;

/**

* Obtener sessionId de Rollbase.
* Cache de 30 minutos.
  */
  async function getRollbaseToken() {
  if (
  rollbaseToken &&
  Date.now() < tokenExpiration
  ) {
  console.log('[Rollbase] ✓ Usando sesión almacenada en memoria');

  return rollbaseToken;
  }

const loginUrl =
`${ROLLBASE_API_BASE_URL}/login`;

console.log('[Rollbase] → Iniciando sesión', {
url: loginUrl,
hasLoginName: Boolean(ROLLBASE_LOGIN_NAME),
hasPassword: Boolean(ROLLBASE_LOGIN_PASSWORD),
});

try {
const params = new URLSearchParams({
loginName: ROLLBASE_LOGIN_NAME,
password: ROLLBASE_LOGIN_PASSWORD,
output: 'json',
});

```
const response = await axios.post(
  loginUrl,
  params.toString(),
  {
    headers: {
      'Content-Type':
        'application/x-www-form-urlencoded',
    },
    timeout: 30000,
  }
);

console.log('[Rollbase] Login response:', {
  status: response.data?.status,
  hasSessionId: Boolean(response.data?.sessionId),
});

if (response.data && response.data.sessionId) {
  rollbaseToken = response.data.sessionId;
  tokenExpiration = Date.now() + 30 * 60 * 1000;

  console.log('[Rollbase] ✓ Sesión iniciada correctamente');

  return rollbaseToken;
}

console.error(
  '[Rollbase] ❌ Login no devolvió sessionId:',
  JSON.stringify(response.data)
);

throw new Error('No se pudo obtener sessionId de Rollbase');
```

} catch (error) {
console.error('[Rollbase] ❌ ERROR EN LOGIN');

```
if (error.response) {
  console.error(
    '[Rollbase] HTTP Status:',
    error.response.status
  );

  console.error(
    '[Rollbase] Response:',
    JSON.stringify(error.response.data)
  );
} else {
  console.error('[Rollbase] Error:', error.message);
}

throw error;
```

}
}

/**

* Crear registro en Rollbase mediante create2.
  */
  async function createRollbaseRecord(objName, fields) {
  const token = await getRollbaseToken();

const createUrl =
`${ROLLBASE_API_BASE_URL}/create2`;

console.log('[Rollbase] → Creando registro', {
object: objName,
fields: Object.keys(fields),
});

const params = new URLSearchParams({
objName,
sessionId: token,
output: 'json',
useIds: 'true',
});

Object.entries(fields).forEach(([key, value]) => {
if (
value !== null &&
value !== undefined &&
value !== ''
) {
params.append(key, String(value));
}
});

try {
const response = await axios.get(createUrl, {
params,
timeout: 30000,
});

```
console.log('[Rollbase] ✓ Respuesta create2:', {
  status: response.data?.status,
  hasId: Boolean(
    response.data?.id ||
    response.data?.recordId ||
    response.data?.objectId
  ),
});

return response.data;
```

} catch (error) {
console.error('[Rollbase] ❌ ERROR CREANDO REGISTRO');

```
if (error.response) {
  console.error(
    '[Rollbase] HTTP Status:',
    error.response.status
  );

  console.error(
    '[Rollbase] Response:',
    JSON.stringify(error.response.data)
  );
} else {
  console.error('[Rollbase] Error:', error.message);
}

throw error;
```

}
}

/**

* Enviar lead de Facebook a Prospecto3.
  */
  async function sendLeadToRollbase(fields) {
  return createRollbaseRecord(
  ROLLBASE_OBJ_NAME,
  fields
  );
  }

module.exports = {
getRollbaseToken,
createRollbaseRecord,
sendLeadToRollbase,
};
