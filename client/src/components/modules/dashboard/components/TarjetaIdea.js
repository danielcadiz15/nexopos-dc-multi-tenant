// client/src/components/modules/dashboard/components/TarjetaIdea.js
import React from "react";
import { FaTrash, FaEdit, FaHeart, FaComment, FaArrowUp, FaArrowDown, FaEye } from "react-icons/fa";
import Button from "../../../common/Button";
import { obtenerColorImpacto, obtenerColorEstado, obtenerIconoCategoria } from "../utils/muroUtils";
import { ESTADOS } from "../utils/constants";

/**
 * Props:
 * - idea
 * - abrirEditar(id | idea)
 * - eliminarIdea(id)
 * - darLike(id)
 * - votarIdea(id, +1 | -1)
 * - cambiarEstado(id, estado)
 * - abrirDetalle(idea)
 */
const TarjetaIdea = ({
  idea = {},
  abrirEditar,
  eliminarIdea,
  darLike,
  votarIdea,
  cambiarEstado,
  abrirDetalle,
}) => {
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
    cambiarEstado?.(id, nuevo);
  };

  return (
    <div 
      className="group relative rounded-lg border border-gray-200 bg-white p-4 shadow-sm transition-all duration-300 hover:shadow-lg hover:scale-105 cursor-pointer"
      onClick={() => abrirDetalle(idea)}
    >
      {/* Header */}
      <div className="mb-3 flex items-center justify-between">
        <div className="flex items-center gap-2">
          <div className="bg-gradient-to-br from-purple-100 to-pink-100 rounded-full w-10 h-10 flex items-center justify-center">
            <span className="text-lg" title={categoria}>{iconoCat}</span>
          </div>
          <div className="flex flex-col gap-1">
            <span className={`inline-flex items-center rounded-full px-2 py-1 text-xs font-medium ${impactoColor}`}>
              🎯 {impacto}
            </span>
            <span className={`inline-flex items-center rounded-full px-2 py-1 text-xs font-medium ${estadoColor}`}>
              📊 {estado.replace("_", " ")}
            </span>
          </div>
        </div>

        <div className="flex items-center gap-1 opacity-0 transition group-hover:opacity-100">
          <Button
            onClick={(e) => {
              e.stopPropagation();
              abrirEditar?.(idea);
            }}
            className="!bg-blue-600 hover:!bg-blue-700 !text-white !px-2 !py-1 !rounded-lg !text-xs"
            title="Editar"
          >
            <FaEdit />
          </Button>
          <Button
            onClick={(e) => {
              e.stopPropagation();
              eliminarIdea?.(id);
            }}
            className="!bg-red-600 hover:!bg-red-700 !text-white !px-2 !py-1 !rounded-lg !text-xs"
            title="Eliminar"
          >
            <FaTrash />
          </Button>
        </div>
      </div>

      {/* Título & descripción */}
      <h3 className="mb-2 text-lg font-bold text-gray-900 leading-tight line-clamp-2">{titulo}</h3>
      <p className="mb-3 text-xs text-gray-600 leading-relaxed line-clamp-3">{descripcion}</p>

      {/* Meta */}
      <div className="mb-3 flex items-center justify-between text-xs text-gray-500 bg-gray-50 rounded-lg p-2">
        <span className="flex items-center gap-1">
          👤 <strong className="text-gray-700">{autor}</strong>
        </span>
        <span className="flex items-center gap-1">
          📅 {fechaFmt}
        </span>
      </div>

      {/* Engagement */}
      <div className="flex items-center justify-between mb-3">
        <div className="flex items-center gap-3">
          <button
            onClick={(e) => {
              e.stopPropagation();
              darLike?.(id);
            }}
            className="flex items-center gap-1 text-xs text-gray-600 hover:text-red-500 transition-colors"
          >
            <FaHeart className={likes > 0 ? "text-red-500" : ""} />
            <span>{likes}</span>
          </button>
          <div className="flex items-center gap-1">
            <button
              onClick={(e) => {
                e.stopPropagation();
                votarIdea?.(id, 1);
              }}
              className="text-xs text-gray-600 hover:text-green-500 transition-colors"
            >
              <FaArrowUp />
            </button>
            <span className="text-xs font-medium text-gray-700 mx-1">{votos}</span>
            <button
              onClick={(e) => {
                e.stopPropagation();
                votarIdea?.(id, -1);
              }}
              className="text-xs text-gray-600 hover:text-red-500 transition-colors"
            >
              <FaArrowDown />
            </button>
          </div>
        </div>
      </div>

      {/* Botón de ver detalle */}
      <div className="flex justify-center">
        <Button
          size="sm"
          color="purple"
          icon={<FaEye />}
          onClick={(e) => {
            e.stopPropagation();
            abrirDetalle(idea);
          }}
          className="flex-1 min-w-[80px] text-xs"
        >
          Ver Detalle
        </Button>
      </div>
    </div>
  );
};

export default TarjetaIdea;
