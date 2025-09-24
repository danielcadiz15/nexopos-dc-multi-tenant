import React from 'react';
import { FaLightbulb, FaPlus } from 'react-icons/fa';
import Button from '../../common/Button';
import { useMuroInnovacion } from './hooks/useMuroInnovacion';
import EstadisticasMuro from './components/EstadisticasMuro';
import TarjetaIdea from './components/TarjetaIdea';
import ModalIdea from './components/ModalIdea';
import ModalDetalleIdea from './components/ModalDetalleIdea';

/**
 * 🚀 Muro de Innovación - Espacio para ideas y propuestas creativas
 */
const MuroInnovacion = () => {
  const {
    ideas,
    modalAbierto,
    editandoIdea,
    nuevaIdea,
    modalDetalleAbierto,
    ideaSeleccionada,
    setModalAbierto,
    setEditandoIdea,
    setNuevaIdea,
    agregarIdea,
    editarIdea,
    eliminarIdea,
    abrirEditar,
    abrirNuevo,
    abrirDetalle,
    cerrarDetalle,
    darLike,
    votarIdea,
    cambiarEstado
  } = useMuroInnovacion();

  // Funciones adaptadoras para el modal
  const handleSaveIdea = (ideaData) => {
    if (editandoIdea) {
      // Actualizar la idea existente con los nuevos datos
      setEditandoIdea(ideaData);
      // Llamar a editarIdea después de actualizar el estado
      setTimeout(() => editarIdea(), 0);
    } else {
      // Crear nueva idea con los datos del formulario
      setNuevaIdea({
        titulo: ideaData.titulo || '',
        descripcion: ideaData.descripcion || '',
        categoria: ideaData.categoria || 'general',
        impacto: ideaData.impacto || 'medio',
        estado: 'nueva'
      });
      // Llamar a agregarIdea después de actualizar el estado
      setTimeout(() => agregarIdea(), 0);
    }
  };

  return (
    <div className="bg-gradient-to-br from-indigo-50 via-purple-50 to-pink-50 rounded-xl p-6 border border-purple-200 shadow-sm">
      {/* Header mejorado */}
      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4 mb-8">
        <div className="space-y-2">
          <h3 className="text-2xl font-bold bg-gradient-to-r from-indigo-600 to-purple-600 bg-clip-text text-transparent flex items-center gap-3">
            <span className="text-3xl">💡</span>
            Muro de Innovación
          </h3>
          <p className="text-purple-600 text-sm max-w-md">
            Comparte y desarrolla ideas brillantes para mejorar el sistema
          </p>
        </div>
        <Button
          color="purple"
          size="md"
          icon={<FaPlus />}
          onClick={abrirNuevo}
          className="shadow-lg hover:shadow-xl transition-all duration-300"
        >
          Nueva Idea
        </Button>
      </div>

      {/* Estadísticas del muro */}
      <EstadisticasMuro ideas={ideas} />

      {/* Muro de ideas */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-4">
        {ideas.length === 0 ? (
          <div className="col-span-full text-center py-16">
            <div className="bg-gradient-to-br from-purple-100 to-pink-100 rounded-full w-24 h-24 mx-auto mb-6 flex items-center justify-center">
              <FaLightbulb className="text-5xl text-purple-400" />
            </div>
            <h4 className="text-xl font-semibold text-purple-700 mb-3">
              El muro está vacío
            </h4>
            <p className="text-purple-600 mb-6 max-w-md mx-auto">
              Sé el primero en compartir una idea brillante para mejorar el sistema
            </p>
            <Button
              color="purple"
              size="md"
              icon={<FaPlus />}
              onClick={abrirNuevo}
              className="shadow-md hover:shadow-lg transition-all duration-300"
            >
              Compartir primera idea
            </Button>
          </div>
        ) : (
          ideas.map(idea => (
            <TarjetaIdea
              key={idea.id}
              idea={idea}
              abrirEditar={abrirEditar}
              eliminarIdea={eliminarIdea}
              darLike={darLike}
              votarIdea={votarIdea}
              cambiarEstado={cambiarEstado}
              abrirDetalle={abrirDetalle}
            />
          ))
        )}
      </div>

      {/* Modal de nueva/editar idea */}
      <ModalIdea
        isOpen={modalAbierto}
        onClose={() => setModalAbierto(false)}
        idea={editandoIdea || nuevaIdea}
        setIdea={editandoIdea ? setEditandoIdea : setNuevaIdea}
        onSave={handleSaveIdea}
        isEditing={!!editandoIdea}
      />

      {/* Modal de detalle de idea */}
      <ModalDetalleIdea
        isOpen={modalDetalleAbierto}
        idea={ideaSeleccionada}
        onClose={cerrarDetalle}
        onEdit={abrirEditar}
        onDelete={eliminarIdea}
        onLike={darLike}
        onVote={votarIdea}
        onChangeEstado={cambiarEstado}
      />
    </div>
  );
};

export default MuroInnovacion; 