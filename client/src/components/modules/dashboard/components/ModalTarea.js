import React from 'react';
import Button from '../../../common/Button';
import Modal from '../../../common/Modal';

const ModalTarea = ({
  isOpen,
  onClose,
  tarea,
  setTarea,
  onSave,
  isEditing
}) => {
  if (!isOpen) {
    return null;
  }

  const handleSubmit = (e) => {
    e.preventDefault();
    onSave();
  };
   
  return (
    <Modal
      isOpen={isOpen}
      onClose={onClose}
      title={isEditing ? "Editar Tarea" : "Nueva Tarea"}
    >
      <form onSubmit={handleSubmit} className="space-y-6">
        {/* Título y Asignación */}
        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-2">
              Título *
            </label>
            <input
              type="text"
              value={tarea?.titulo || ''}
              onChange={(e) => setTarea({ ...tarea, titulo: e.target.value })}
              className="w-full border border-gray-300 rounded-lg px-4 py-3 focus:outline-none focus:ring-2 focus:ring-green-500 focus:border-transparent transition-all"
              placeholder="¿Qué necesitas hacer?"
              required
            />
          </div>
          
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-2">
              Asignar a
            </label>
            <input
              type="text"
              value={tarea?.asignado || ''}
              onChange={(e) => setTarea({ ...tarea, asignado: e.target.value })}
              className="w-full border border-gray-300 rounded-lg px-4 py-3 focus:outline-none focus:ring-2 focus:ring-green-500 focus:border-transparent transition-all"
              placeholder="Nombre del responsable"
            />
          </div>
        </div>

        {/* Descripción */}
        <div>
          <label className="block text-sm font-medium text-gray-700 mb-2">
            Descripción
          </label>
          <textarea
            value={tarea?.descripcion || ''}
            onChange={(e) => setTarea({ ...tarea, descripcion: e.target.value })}
            rows={4}
            className="w-full border border-gray-300 rounded-lg px-4 py-3 focus:outline-none focus:ring-2 focus:ring-green-500 focus:border-transparent transition-all resize-none"
            placeholder="Detalles adicionales, pasos a seguir, contexto..."
          />
        </div>

        {/* Categoría y Prioridad */}
        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-2">
              Categoría
            </label>
            <select
              value={tarea?.categoria || 'general'}
              onChange={(e) => setTarea({ ...tarea, categoria: e.target.value })}
              className="w-full border border-gray-300 rounded-lg px-4 py-3 focus:outline-none focus:ring-2 focus:ring-green-500 focus:border-transparent transition-all"
            >
              <option value="general">General</option>
              <option value="trabajo">Trabajo</option>
              <option value="personal">Personal</option>
              <option value="proyecto">Proyecto</option>
              <option value="mantenimiento">Mantenimiento</option>
            </select>
          </div>
          
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-2">
              Prioridad
            </label>
            <select
              value={tarea?.prioridad || 'media'}
              onChange={(e) => setTarea({ ...tarea, prioridad: e.target.value })}
              className="w-full border border-gray-300 rounded-lg px-4 py-3 focus:outline-none focus:ring-2 focus:ring-green-500 focus:border-transparent transition-all"
            >
              <option value="baja">Baja</option>
              <option value="media">Media</option>
              <option value="alta">Alta</option>
              <option value="urgente">Urgente</option>
            </select>
          </div>
        </div>

        {/* Fecha límite */}
        <div>
          <label className="block text-sm font-medium text-gray-700 mb-2">
            Fecha límite
          </label>
          <input
            type="datetime-local"
            value={tarea?.fechaLimite || ''}
            onChange={(e) => setTarea({ ...tarea, fechaLimite: e.target.value })}
            className="w-full border border-gray-300 rounded-lg px-4 py-3 focus:outline-none focus:ring-2 focus:ring-green-500 focus:border-transparent transition-all"
          />
        </div>

        {/* Botones de acción */}
        <div className="flex gap-3 pt-4">
          <Button
            type="button"
            color="gray"
            onClick={onClose}
            className="flex-1"
          >
            Cancelar
          </Button>
          <Button
            type="submit"
            color="green"
            className="flex-1"
          >
            {isEditing ? 'Actualizar' : 'Crear'}
          </Button>
        </div>
      </form>
    </Modal>
  );
};

export default ModalTarea; 