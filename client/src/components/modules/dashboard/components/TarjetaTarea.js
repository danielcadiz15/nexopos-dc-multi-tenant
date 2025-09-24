import React from 'react';
import { FaSeedling, FaLeaf, FaTree, FaTrash, FaCheck, FaEdit, FaEye } from 'react-icons/fa';
import Button from '../../../common/Button';
import {
  obtenerEstadoPlanta,
  obtenerColorPrioridad,
  obtenerBgPrioridad,
  calcularDiasRestantes,
  obtenerTextoDias,
  obtenerColorDias
} from '../utils/jardinUtils';

const TarjetaTarea = ({ tarea, toggleCompletada, abrirEditar, eliminarTarea, abrirDetalle }) => {
  const estadoPlanta = obtenerEstadoPlanta(tarea);
  const diasRestantes = calcularDiasRestantes(tarea.fechaLimite);
  const IconoPlanta = estadoPlanta === 'tree' ? FaTree : 
                       estadoPlanta === 'leaf' ? FaLeaf : FaSeedling;

  return (
    <div
      className={`relative p-4 rounded-lg border-2 transition-all duration-300 hover:scale-105 hover:shadow-lg cursor-pointer ${
        tarea.completada 
          ? 'bg-gradient-to-br from-green-50 to-emerald-100 border-green-300 shadow-md' 
          : `${obtenerBgPrioridad(tarea.prioridad)} shadow-sm hover:shadow-md`
      }`}
      onClick={() => abrirDetalle(tarea)}
    >
      {/* Indicador de prioridad */}
      <div className={`absolute top-2 right-2 w-3 h-3 rounded-full shadow-sm ${
        tarea.prioridad === 'urgente' ? 'bg-red-500 animate-pulse' :
        tarea.prioridad === 'alta' ? 'bg-red-500' :
        tarea.prioridad === 'media' ? 'bg-yellow-500' : 'bg-green-500'
      }`} />

      {/* Planta */}
      <div className="text-center mb-3">
        <div className={`inline-flex items-center justify-center w-12 h-12 rounded-full mb-2 ${
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
      </div>

      {/* Contenido de la tarea */}
      <div className="text-center">
        <h4 className={`font-bold mb-2 text-base ${
          tarea.completada ? 'line-through text-green-700' : 'text-gray-800'
        }`}>
          {tarea.titulo}
        </h4>
        
        {tarea.descripcion && (
          <p className={`text-xs mb-2 text-gray-600 leading-relaxed line-clamp-2 ${
            tarea.completada ? 'text-green-600' : 'text-gray-600'
          }`}>
            {tarea.descripcion}
          </p>
        )}

        {/* Fecha límite */}
        {tarea.fechaLimite && (
          <div className={`text-xs font-medium mb-2 ${
            obtenerColorDias(diasRestantes)
          }`}>
            {obtenerTextoDias(diasRestantes)}
          </div>
        )}

        {/* Categoría y Asignación */}
        <div className="flex flex-col gap-1 mb-3">
          <div className="text-xs text-gray-500">
            📁 {tarea.categoria}
          </div>
          {tarea.asignado && (
            <div className="text-xs text-blue-600 font-medium">
              👤 {tarea.asignado}
            </div>
          )}
        </div>

        {/* Botón de ver detalle */}
        <div className="flex justify-center mt-3">
          <Button
            size="sm"
            color="blue"
            icon={<FaEye />}
            onClick={(e) => {
              e.stopPropagation();
              abrirDetalle(tarea);
            }}
            className="flex-1 min-w-[80px] text-xs"
          >
            Ver Detalle
          </Button>
        </div>
      </div>
    </div>
  );
};

export default TarjetaTarea; 