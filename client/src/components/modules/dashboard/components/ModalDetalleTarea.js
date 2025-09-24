import React from 'react';
import { FaTimes, FaCheck, FaEdit, FaTrash, FaSeedling, FaLeaf, FaTree } from 'react-icons/fa';
import Button from '../../../common/Button';
import {
  obtenerEstadoPlanta,
  obtenerColorPrioridad,
  calcularDiasRestantes,
  obtenerTextoDias,
  obtenerColorDias
} from '../utils/jardinUtils';

const ModalDetalleTarea = ({ tarea, isOpen, onClose, onEdit, onDelete, onToggleCompletada }) => {
  if (!isOpen || !tarea) return null;

  const estadoPlanta = obtenerEstadoPlanta(tarea);
  const diasRestantes = calcularDiasRestantes(tarea.fechaLimite);
  const IconoPlanta = estadoPlanta === 'tree' ? FaTree : 
                       estadoPlanta === 'leaf' ? FaLeaf : FaSeedling;

  return (
    <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50 p-4">
      <div className="bg-white rounded-xl max-w-2xl w-full max-h-[90vh] overflow-y-auto">
        {/* Header */}
        <div className="flex items-center justify-between p-6 border-b border-gray-200">
          <div className="flex items-center gap-3">
            <div className={`inline-flex items-center justify-center w-12 h-12 rounded-full ${
              tarea.completada 
                ? 'bg-green-100 text-green-600' 
                : 'bg-gray-100 text-gray-600'
            }`}>
              <IconoPlanta 
                className={`text-2xl ${
                  tarea.completada ? 'text-green-600' : obtenerColorPrioridad(tarea.prioridad)
                }`} 
              />
            </div>
            <div>
              <h2 className="text-2xl font-bold text-gray-800">
                {tarea.titulo}
              </h2>
              <p className="text-sm text-gray-600">
                Tarea {tarea.completada ? 'completada' : 'en progreso'}
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
          {tarea.descripcion && (
            <div>
              <h3 className="text-lg font-semibold text-gray-800 mb-2">Descripción</h3>
              <p className="text-gray-600 bg-gray-50 p-4 rounded-lg">
                {tarea.descripcion}
              </p>
            </div>
          )}

          {/* Información de la tarea */}
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            {/* Prioridad */}
            <div className="bg-gray-50 p-4 rounded-lg">
              <h4 className="font-semibold text-gray-800 mb-2">Prioridad</h4>
              <div className="flex items-center gap-2">
                <div className={`w-3 h-3 rounded-full ${
                  tarea.prioridad === 'urgente' ? 'bg-red-500' :
                  tarea.prioridad === 'alta' ? 'bg-red-500' :
                  tarea.prioridad === 'media' ? 'bg-yellow-500' : 'bg-green-500'
                }`} />
                <span className="capitalize text-gray-700">{tarea.prioridad}</span>
              </div>
            </div>

            {/* Categoría */}
            <div className="bg-gray-50 p-4 rounded-lg">
              <h4 className="font-semibold text-gray-800 mb-2">Categoría</h4>
              <p className="text-gray-700">📁 {tarea.categoria}</p>
            </div>

            {/* Fecha límite */}
            {tarea.fechaLimite && (
              <div className="bg-gray-50 p-4 rounded-lg">
                <h4 className="font-semibold text-gray-800 mb-2">Fecha límite</h4>
                <p className={`font-medium ${obtenerColorDias(diasRestantes)}`}>
                  {obtenerTextoDias(diasRestantes)}
                </p>
                <p className="text-sm text-gray-600">
                  {new Date(tarea.fechaLimite).toLocaleDateString()}
                </p>
              </div>
            )}

            {/* Asignado */}
            {tarea.asignado && (
              <div className="bg-gray-50 p-4 rounded-lg">
                <h4 className="font-semibold text-gray-800 mb-2">Asignado a</h4>
                <p className="text-gray-700">👤 {tarea.asignado}</p>
              </div>
            )}
          </div>

          {/* Estado de la planta */}
          <div className="bg-gradient-to-r from-green-50 to-emerald-50 p-4 rounded-lg border border-green-200">
            <h4 className="font-semibold text-green-800 mb-2">Estado de crecimiento</h4>
            <div className="flex items-center gap-3">
              <IconoPlanta className="text-2xl text-green-600" />
              <span className="text-green-700">
                {estadoPlanta === 'tree' ? '🌳 Planta madura (completada)' :
                 estadoPlanta === 'leaf' ? '🍃 Planta en crecimiento' : '🌱 Semilla plantada'}
              </span>
            </div>
          </div>
        </div>

        {/* Acciones */}
        <div className="flex flex-wrap gap-3 p-6 border-t border-gray-200 bg-gray-50">
          <Button
            color={tarea.completada ? "gray" : "green"}
            icon={<FaCheck />}
            onClick={() => onToggleCompletada(tarea.id)}
            className="flex-1 min-w-[120px]"
          >
            {tarea.completada ? 'Marcar como pendiente' : 'Marcar como completada'}
          </Button>
          
          <Button
            color="blue"
            icon={<FaEdit />}
            onClick={() => {
              onEdit(tarea);
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
              if (window.confirm('¿Estás seguro de que quieres eliminar esta tarea?')) {
                onDelete(tarea.id);
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

export default ModalDetalleTarea; 