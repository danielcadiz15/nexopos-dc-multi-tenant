import React from 'react';
import { FaSeedling, FaPlus } from 'react-icons/fa';
import Button from '../../common/Button';
import { useJardinTareas } from './hooks/useJardinTareas';
import { calcularDiasRestantes } from './utils/jardinUtils';
import EstadisticasJardin from './components/EstadisticasJardin';
import TarjetaTarea from './components/TarjetaTarea';
import ModalTarea from './components/ModalTarea';
import ModalDetalleTarea from './components/ModalDetalleTarea';

/**
 * 🌱 Jardín de Tareas - Visualización de tareas como plantas en crecimiento
 */
const JardinTareas = () => {
  const {
    tareas,
    modalAbierto,
    editandoTarea,
    nuevaTarea,
    modalDetalleAbierto,
    tareaSeleccionada,
    setModalAbierto,
    setEditandoTarea,
    setNuevaTarea,
    agregarTarea,
    editarTarea,
    toggleCompletada,
    eliminarTarea,
    abrirEditar,
    abrirNuevo,
    abrirDetalle,
    cerrarDetalle
  } = useJardinTareas();

  return (
    <div className="bg-gradient-to-br from-green-50 via-emerald-50 to-blue-50 rounded-xl p-6 border border-green-200 shadow-sm">
      {/* Header mejorado */}
      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4 mb-8">
        <div className="space-y-2">
          <h3 className="text-2xl font-bold bg-gradient-to-r from-green-600 to-emerald-600 bg-clip-text text-transparent flex items-center gap-3">
            <span className="text-3xl">🌱</span>
            Jardín de Tareas
          </h3>
          <p className="text-green-600 text-sm max-w-md">
            Cultiva tus tareas y hazlas crecer hasta completarlas
          </p>
        </div>
        <Button
          color="green"
          size="md"
          icon={<FaPlus />}
          onClick={() => {
            console.log('🔍 Botón Nueva Tarea clickeado');
            abrirNuevo();
          }}
          className="shadow-lg hover:shadow-xl transition-all duration-300"
        >
          Nueva Tarea
        </Button>
      </div>

      {/* Estadísticas */}
      <EstadisticasJardin 
        tareas={tareas} 
        calcularDiasRestantes={calcularDiasRestantes} 
      />

      {/* Jardín de tareas */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-4">
        {tareas.length === 0 ? (
          <div className="col-span-full text-center py-16">
            <div className="bg-gradient-to-br from-green-100 to-emerald-100 rounded-full w-24 h-24 mx-auto mb-6 flex items-center justify-center">
              <FaSeedling className="text-5xl text-green-400" />
            </div>
            <h4 className="text-xl font-semibold text-green-700 mb-3">
              Tu jardín está vacío
            </h4>
            <p className="text-green-600 mb-6 max-w-md mx-auto">
              Agrega tu primera tarea para comenzar a cultivar y hacer crecer tu productividad
            </p>
            <Button
              color="green"
              size="md"
              icon={<FaPlus />}
              onClick={() => {
                console.log('🔍 Botón Nueva Tarea clickeado');
                abrirNuevo();
              }}
              className="shadow-md hover:shadow-lg transition-all duration-300"
            >
              Plantar primera tarea
            </Button>
          </div>
        ) : (
          tareas.map(tarea => (
            <TarjetaTarea
              key={tarea.id}
              tarea={tarea}
              toggleCompletada={toggleCompletada}
              abrirEditar={abrirEditar}
              eliminarTarea={eliminarTarea}
              abrirDetalle={abrirDetalle}
            />
          ))
        )}
      </div>

      {/* Modal de nueva/editar tarea */}
      <ModalTarea
        isOpen={modalAbierto}
        onClose={() => setModalAbierto(false)}
        tarea={editandoTarea || nuevaTarea}
        setTarea={editandoTarea ? setEditandoTarea : setNuevaTarea}
        onSave={editandoTarea ? editarTarea : agregarTarea}
        isEditing={!!editandoTarea}
      />

      {/* Modal de detalle de tarea */}
      <ModalDetalleTarea
        isOpen={modalDetalleAbierto}
        tarea={tareaSeleccionada}
        onClose={cerrarDetalle}
        onEdit={abrirEditar}
        onDelete={eliminarTarea}
        onToggleCompletada={toggleCompletada}
      />
    </div>
  );
};

export default JardinTareas;
