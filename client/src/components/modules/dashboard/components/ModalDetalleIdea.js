import React from 'react';
import { FaTimes, FaEdit, FaTrash, FaHeart, FaComment, FaArrowUp, FaArrowDown } from 'react-icons/fa';
import Button from '../../../common/Button';
import { obtenerColorImpacto, obtenerColorEstado, obtenerIconoCategoria } from '../utils/muroUtils';
import { ESTADOS } from '../utils/constants';

const ModalDetalleIdea = ({ idea, isOpen, onClose, onEdit, onDelete, onLike, onVote, onChangeEstado }) => {
  if (!isOpen || !idea) return null;

  const {
    id,
    titulo = "Idea sin título",
    descripcion = "Sin descripción",
    categoria = "general",
    impacto = "medio",
    estado = "nueva",
    likes = 0,
    votos = 0,
    autor = "Anónimo",
    fecha,
  } = idea;

  const estadoColor = obtenerColorEstado?.(estado) || "bg-gray-100 text-gray-700";
  const impactoColor = obtenerColorImpacto?.(impacto) || "bg-gray-100 text-gray-700";
  const iconoCat = obtenerIconoCategoria?.(categoria) || "💡";

  const fechaFmt = fecha
    ? new Date(fecha).toLocaleDateString()
    : new Date().toLocaleDateString();

  const onEstadoChange = (e) => {
    const nuevo = e.target.value;
    onChangeEstado?.(id, nuevo);
  };

  return (
    <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50 p-4">
      <div className="bg-white rounded-xl max-w-2xl w-full max-h-[90vh] overflow-y-auto">
        {/* Header */}
        <div className="flex items-center justify-between p-6 border-b border-gray-200">
          <div className="flex items-center gap-3">
            <div className="bg-gradient-to-br from-purple-100 to-pink-100 rounded-full w-12 h-12 flex items-center justify-center">
              <span className="text-2xl" title={categoria}>{iconoCat}</span>
            </div>
            <div>
              <h2 className="text-2xl font-bold text-gray-800">
                {titulo}
              </h2>
              <p className="text-sm text-gray-600">
                Idea de {autor} • {fechaFmt}
              </p>
            </div>
          </div>
          <button
            onClick={onClose}
            className="text-gray-400 hover:text-gray-600 transition-colors"
          >
            <FaTimes className="text-xl" />
          </button>
        </div>

        {/* Contenido */}
        <div className="p-6 space-y-6">
          {/* Descripción */}
          {descripcion && (
            <div>
              <h3 className="text-lg font-semibold text-gray-800 mb-2">Descripción</h3>
              <p className="text-gray-600 bg-gray-50 p-4 rounded-lg">
                {descripcion}
              </p>
            </div>
          )}

          {/* Información de la idea */}
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            {/* Categoría */}
            <div className="bg-gray-50 p-4 rounded-lg">
              <h4 className="font-semibold text-gray-800 mb-2">Categoría</h4>
              <p className="text-gray-700">{iconoCat} {categoria}</p>
            </div>

            {/* Impacto */}
            <div className="bg-gray-50 p-4 rounded-lg">
              <h4 className="font-semibold text-gray-800 mb-2">Impacto</h4>
              <span className={`inline-flex items-center rounded-full px-3 py-1 text-sm font-medium ${impactoColor}`}>
                🎯 {impacto}
              </span>
            </div>

            {/* Estado */}
            <div className="bg-gray-50 p-4 rounded-lg">
              <h4 className="font-semibold text-gray-800 mb-2">Estado</h4>
              <span className={`inline-flex items-center rounded-full px-3 py-1 text-sm font-medium ${estadoColor}`}>
                📊 {estado.replace("_", " ")}
              </span>
            </div>

            {/* Autor */}
            <div className="bg-gray-50 p-4 rounded-lg">
              <h4 className="font-semibold text-gray-800 mb-2">Autor</h4>
              <p className="text-gray-700">👤 {autor}</p>
            </div>
          </div>

          {/* Engagement */}
          <div className="bg-gradient-to-r from-purple-50 to-pink-50 p-4 rounded-lg border border-purple-200">
            <h4 className="font-semibold text-purple-800 mb-3">Engagement</h4>
            <div className="flex items-center justify-between">
              <div className="flex items-center gap-6">
                <button
                  onClick={() => onLike?.(id)}
                  className="flex items-center gap-2 text-gray-600 hover:text-red-500 transition-colors"
                >
                  <FaHeart className={`text-xl ${likes > 0 ? "text-red-500" : ""}`} />
                  <span className="font-semibold">{likes} likes</span>
                </button>
                <div className="flex items-center gap-2">
                  <button
                    onClick={() => onVote?.(id, 1)}
                    className="text-gray-600 hover:text-green-500 transition-colors"
                  >
                    <FaArrowUp className="text-xl" />
                  </button>
                  <span className="font-semibold text-gray-700 mx-2">{votos} votos</span>
                  <button
                    onClick={() => onVote?.(id, -1)}
                    className="text-gray-600 hover:text-red-500 transition-colors"
                  >
                    <FaArrowDown className="text-xl" />
                  </button>
                </div>
              </div>
            </div>
          </div>

          {/* Cambiar estado */}
          <div className="bg-gray-50 p-4 rounded-lg">
            <h4 className="font-semibold text-gray-800 mb-2">Cambiar Estado</h4>
            <select
              value={estado}
              onChange={onEstadoChange}
              className={`w-full p-3 rounded-lg border text-sm ${estadoColor}`}
            >
              {ESTADOS.map((est) => (
                <option key={est} value={est}>
                  {est.replace("_", " ")}
                </option>
              ))}
            </select>
          </div>
        </div>

        {/* Acciones */}
        <div className="flex flex-wrap gap-3 p-6 border-t border-gray-200 bg-gray-50">
          <Button
            color="purple"
            icon={<FaComment />}
            className="flex-1 min-w-[120px]"
          >
            Comentarios
          </Button>
          
          <Button
            color="blue"
            icon={<FaEdit />}
            onClick={() => {
              onEdit(idea);
              onClose();
            }}
            className="flex-1 min-w-[120px]"
          >
            Editar
          </Button>
          
          <Button
            color="red"
            icon={<FaTrash />}
            onClick={() => {
              if (window.confirm('¿Estás seguro de que quieres eliminar esta idea?')) {
                onDelete(id);
                onClose();
              }
            }}
            className="flex-1 min-w-[120px]"
          >
            Eliminar
          </Button>
        </div>
      </div>
    </div>
  );
};

export default ModalDetalleIdea; 