function toNumber(value) {
  const n = parseFloat(String(value ?? '').replace(',', '.'));
  return Number.isFinite(n) ? n : 0;
}

export function getPricingSuggestionDefaults() {
  return {
    alquilerMensual: 0,
    movilMensual: 0,
    combustibleMensual: 0,
    otrosGastosMensuales: 0,
    unidadesMensualesEstimadas: 1000,
    margenObjetivoPct: 30
  };
}

export function computeSuggestedPrice({
  costoUnitario,
  alquilerMensual,
  movilMensual,
  combustibleMensual,
  otrosGastosMensuales,
  unidadesMensualesEstimadas,
  margenObjetivoPct
}) {
  const costo = Math.max(0, toNumber(costoUnitario));
  const unidades = Math.max(0, toNumber(unidadesMensualesEstimadas));
  const margenRaw = toNumber(margenObjetivoPct);
  const margen = Math.min(95, Math.max(0, margenRaw));
  const gastosMensuales =
    Math.max(0, toNumber(alquilerMensual)) +
    Math.max(0, toNumber(movilMensual)) +
    Math.max(0, toNumber(combustibleMensual)) +
    Math.max(0, toNumber(otrosGastosMensuales));

  const gastoPorUnidad = unidades > 0 ? gastosMensuales / unidades : 0;
  const costoTotalUnitario = costo + gastoPorUnidad;
  const denominator = 1 - margen / 100;
  const suggestedPrice = denominator > 0 ? costoTotalUnitario / denominator : 0;

  return {
    costoUnitario: costo,
    gastosMensuales,
    unidadesMensualesEstimadas: unidades,
    margenObjetivoPct: margen,
    gastoPorUnidad,
    costoTotalUnitario,
    suggestedPrice,
    canSuggest: costo > 0 && unidades > 0 && denominator > 0,
    warnings: {
      margenAjustado: margen !== margenRaw,
      unidadesInvalidas: unidades <= 0
    }
  };
}
