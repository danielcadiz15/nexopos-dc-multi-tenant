import React from 'react';

const EstadisticasJardin = ({ tareas, calcularDiasRestantes }) => {
  const pendientes = tareas.filter(t => !t.completada).length;
  const completadas = tareas.filter(t => t.completada).length;
  const urgentes = tareas.filter(t => {
    const dias = calcularDiasRestantes(t.fechaLimite);
    return dias !== null && dias <= 1;
  }).length;

  return (
    <div className="grid grid-cols-1 sm:grid-cols-3 gap-4 mb-8">
      <div className="text-center bg-white rounded-xl p-4 border border-green-200 shadow-sm hover:shadow-md transition-all duration-300">
        <div className="text-3xl font-bold text-green-600 mb-1">
          {pendientes}
        </div>
        <div className="text-sm text-green-700 font-medium">🌱 Pendientes</div>
      </div>
      
      <div className="text-center bg-white rounded-xl p-4 border border-blue-200 shadow-sm hover:shadow-md transition-all duration-300">
        <div className="text-3xl font-bold text-blue-600 mb-1">
          {completadas}
        </div>
        <div className="text-sm text-blue-700 font-medium">✅ Completadas</div>
      </div>
      
      <div className="text-center bg-white rounded-xl p-4 border border-orange-200 shadow-sm hover:shadow-md transition-all duration-300">
        <div className="text-3xl font-bold text-orange-600 mb-1">
          {urgentes}
        </div>
        <div className="text-sm text-orange-700 font-medium">🚨 Urgentes</div>
      </div>
    </div>
  );
};

export default EstadisticasJardin; 