// functions/utils/cors.js
function configurarCORS(res) {
  res.set('Access-Control-Allow-Origin', '*');
  res.set('Access-Control-Allow-Methods', 'GET, POST, PUT, DELETE, OPTIONS, PATCH');
  res.set('Access-Control-Allow-Headers', 'Content-Type, Authorization, Accept');
  res.set('Access-Control-Max-Age', '3600');
}

function manejarPreflight(req, res) {
  if (req.method === 'OPTIONS') {
    configurarCORS(res);
    res.status(200).send('');
    return true;
  }
  return false;
}

module.exports = { configurarCORS, manejarPreflight }; 