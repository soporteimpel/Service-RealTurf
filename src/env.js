/**
 * Validación de variables de entorno al iniciar.
 */
function validateEnv() {
  const required = [
    'ROLLBASE_LOGIN_NAME',
    'ROLLBASE_LOGIN_PASSWORD',
    'FB_PAGE_ACCESS_TOKEN',
    'FB_VERIFY_TOKEN',
  ];

  const missing = required.filter((key) => !process.env[key] || String(process.env[key]).trim() === '');

  if (missing.length > 0) {
    console.error('');
    console.error('❌ Faltan variables de entorno obligatorias:');
    missing.forEach((key) => console.error('   -', key));
    console.error('');
    console.error('En local: revisa el archivo .env en la raíz del proyecto.');
    console.error('En la nube: configúralas en el panel (Environment Variables).');
    console.error('El archivo .env NO se sube a GitHub por seguridad.');
    console.error('');
    process.exit(1);
  }
}

module.exports = { validateEnv };
