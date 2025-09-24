import React from 'react';

const EstadisticasMuro = ({ ideas }) => {
  const totalIdeas = ideas.length;
  const implementadas = ideas.filter(i => i.estado === 'implementada').length;
  const enProceso = ideas.filter(i => i.estado === 'en_proceso').length;
  const totalLikes = ideas.reduce((total, idea) => total + (idea.likes || 0), 0);

  return (
    <div className="grid grid-cols-2 lg:grid-cols-4 gap-4 mb-8">
      <div className="text-center bg-white rounded-xl p-4 border border-purple-200 shadow-sm hover:shadow-md transition-all duration-300">
        <div className="text-3xl font-bold text-purple-600 mb-1">
          {totalIdeas}
        </div>
        <div className="text-sm text-purple-700 font-medium">💡 Total Ideas</div>
      </div>
      
      <div className="text-center bg-white rounded-xl p-4 border border-green-200 shadow-sm hover:shadow-md transition-all duration-300">
        <div className="text-3xl font-bold text-green-600 mb-1">
          {implementadas}
        </div>
        <div className="text-sm text-green-700 font-medium">✅ Implementadas</div>
      </div>
      
      <div className="text-center bg-white rounded-xl p-4 border border-blue-200 shadow-sm hover:shadow-md transition-all duration-300">
        <div className="text-3xl font-bold text-blue-600 mb-1">
          {enProceso}
        </div>
        <div className="text-sm text-blue-700 font-medium">🚧 En Proceso</div>
      </div>
      
      <div className="text-center bg-white rounded-xl p-4 border border-yellow-200 shadow-sm hover:shadow-md transition-all duration-300">
        <div className="text-3xl font-bold text-yellow-600 mb-1">
          {totalLikes}
        </div>
        <div className="text-sm text-yellow-700 font-medium">❤️ Total Likes</div>
      </div>
    </div>
  );
};

export default EstadisticasMuro; 