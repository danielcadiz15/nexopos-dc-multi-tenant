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
  const costo = toNumber(costoUnitario);
  const unidades = toNumber(unidadesMensualesEstimadas);
  const margen = toNumber(margenObjetivoPct);
  const gastosMensuales =
    toNumber(alquilerMensual) +
    toNumber(movilMensual) +
    toNumber(combustibleMensual) +
    toNumber(otrosGastosMensuales);

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
    canSuggest: costo > 0 && unidades > 0 && denominator > 0
  };
}
