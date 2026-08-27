/**

* Validación de variables de entorno al iniciar.
* Nunca mostramos secretos completos en los logs.
  */

function validateEnv() {
  const required = [
  'ROLLBASE_LOGIN_NAME',
  'ROLLBASE_LOGIN_PASSWORD',
  'FB_PAGE_ACCESS_TOKEN',
  'FB_VERIFY_TOKEN',
  ];
  
  const recommended = [
  'FB_APP_SECRET',
  'ROLLBASE_API_BASE_URL',
  'ROLLBASE_OBJ_NAME',
  'FB_GRAPH_API_VERSION',
  'SYNC_SECRET',
  ];
  
  const missing = required.filter(
  (key) => !process.env[key] || String(process.env[key]).trim() === ''
  );
  
  console.log('');
  console.log('================================================');
  console.log('       FACEBOOK → ROLLBASE | CONFIGURACIÓN');
  console.log('================================================');
  
  console.log('[ENV] Variables obligatorias:');
  required.forEach((key) => {
  const configured =
  process.env[key] && String(process.env[key]).trim() !== '';
  
  
  console.log(`  ${configured ? '✓' : '✗'} ${key}`);
  
  
  });
  
  console.log('');
  console.log('[ENV] Variables recomendadas:');
  recommended.forEach((key) => {
  const configured =
  process.env[key] && String(process.env[key]).trim() !== '';
  
  
  console.log(`  ${configured ? '✓' : '○'} ${key}`);
  
  
  });
  
  console.log('');
  console.log(
  `[ENV] Graph API Version: ${
        process.env.FB_GRAPH_API_VERSION || 'v26.0 (por defecto)'
      }`
  );
  console.log(
  `[ENV] Rollbase Object: ${
        process.env.ROLLBASE_OBJ_NAME || 'Prospecto3 (por defecto)'
      }`
  );
  console.log('================================================');
  console.log('');
  
  if (missing.length > 0) {
  console.error('❌ Faltan variables de entorno obligatorias:');
  
  
  missing.forEach((key) => {
    console.error(`   - ${key}`);
  });
  
  console.error('');
  console.error('En local: revisa el archivo .env en la raíz del proyecto.');
  console.error('En Cloud Run: revisa Environment Variables.');
  console.error('El archivo .env NO se debe subir a GitHub.');
  
  process.exit(1);
  
  
  }
  
  console.log('✅ Variables de entorno obligatorias verificadas correctamente');
  console.log('');
  }
  
  module.exports = {
  validateEnv,
  };
  