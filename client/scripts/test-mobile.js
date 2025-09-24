const { exec } = require('child_process');
const path = require('path');

console.log('🚀 Iniciando servidor de desarrollo para probar la app móvil...');
console.log('📱 La app móvil se mostrará automáticamente en dispositivos móviles');
console.log('💡 Para simular un dispositivo móvil:');
console.log('   1. Abre las herramientas de desarrollador (F12)');
console.log('   2. Haz clic en el icono de dispositivo móvil');
console.log('   3. Selecciona un dispositivo móvil (iPhone, Android, etc.)');
console.log('');

// Iniciar el servidor de desarrollo
const child = exec('npm start', {
  cwd: path.join(__dirname, '..')
});

child.stdout.on('data', (data) => {
  console.log(data.toString());
});

child.stderr.on('data', (data) => {
  console.error(data.toString());
});

child.on('close', (code) => {
  console.log(`Servidor cerrado con código ${code}`);
});

// Manejar la terminación del proceso
process.on('SIGINT', () => {
  console.log('\n🛑 Deteniendo servidor...');
  child.kill('SIGINT');
  process.exit();
}); 