import { useState, useEffect } from 'react';

export const useJardinTareas = () => {
  const [tareas, setTareas] = useState([]);
  const [modalAbierto, setModalAbierto] = useState(false);
  const [editandoTarea, setEditandoTarea] = useState(null);
  const [modalDetalleAbierto, setModalDetalleAbierto] = useState(false);
  const [tareaSeleccionada, setTareaSeleccionada] = useState(null);
  const [nuevaTarea, setNuevaTarea] = useState({
    titulo: '',
    descripcion: '',
    prioridad: 'media',
    fechaLimite: '',
    categoria: 'general'
  });

  // Cargar tareas desde localStorage
  useEffect(() => {
    const tareasGuardadas = localStorage.getItem('jardinTareas');
    if (tareasGuardadas) {
      setTareas(JSON.parse(tareasGuardadas));
    }
  }, []);

  // Guardar tareas en localStorage
  useEffect(() => {
    localStorage.setItem('jardinTareas', JSON.stringify(tareas));
  }, [tareas]);

  // Funciones de gestión
  const agregarTarea = () => {
    console.log('🔍 agregarTarea llamado con:', nuevaTarea);
    if (!nuevaTarea.titulo.trim()) {
      console.log('❌ Título vacío, no se puede agregar');
      return;
    }

    const tarea = {
      id: Date.now(),
      ...nuevaTarea,
      fechaCreacion: new Date().toISOString(),
      completada: false,
      fechaCompletado: null
    };

    console.log('🔍 Nueva tarea creada:', tarea);
    setTareas([...tareas, tarea]);
    setNuevaTarea({
      titulo: '',
      descripcion: '',
      prioridad: 'media',
      fechaLimite: '',
      categoria: 'general',
      asignado: ''
    });
    setModalAbierto(false);
    console.log('🔍 Modal cerrado, tarea agregada');
  };

  // Función para abrir modal de nueva tarea
  const abrirNuevo = () => {
    console.log('🔍 abrirNuevo llamado');
    setEditandoTarea(null);
    setNuevaTarea({
      titulo: '',
      descripcion: '',
      prioridad: 'media',
      fechaLimite: '',
      categoria: 'general',
      asignado: ''
    });
    setModalAbierto(true);
    console.log('🔍 modalAbierto establecido en true');
  };

  const editarTarea = () => {
    if (!editandoTarea.titulo.trim()) return;

    setTareas(tareas.map(t => 
      t.id === editandoTarea.id ? editandoTarea : t
    ));
    setEditandoTarea(null);
    setModalAbierto(false);
  };

  const toggleCompletada = (id) => {
    setTareas(tareas.map(t => {
      if (t.id === id) {
        return {
          ...t,
          completada: !t.completada,
          fechaCompletado: !t.completada ? new Date().toISOString() : null
        };
      }
      return t;
    }));
  };

  const eliminarTarea = (id) => {
    setTareas(tareas.filter(t => t.id !== id));
  };

  const abrirEditar = (tarea) => {
    setEditandoTarea({ ...tarea });
    setModalAbierto(true);
  };

  const resetearNuevaTarea = () => {
    setNuevaTarea({
      titulo: '',
      descripcion: '',
      prioridad: 'media',
      fechaLimite: '',
      categoria: 'general',
      asignado: ''
    });
  };

  // Función para abrir modal de detalle
  const abrirDetalle = (tarea) => {
    setTareaSeleccionada(tarea);
    setModalDetalleAbierto(true);
  };

  // Función para cerrar modal de detalle
  const cerrarDetalle = () => {
    setModalDetalleAbierto(false);
    setTareaSeleccionada(null);
  };

  return {
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
  };
}; 