import { useState, useEffect } from 'react';

export const useMuroInnovacion = () => {
  const [ideas, setIdeas] = useState([]);
  const [modalAbierto, setModalAbierto] = useState(false);
  const [editandoIdea, setEditandoIdea] = useState(null);
  const [modalDetalleAbierto, setModalDetalleAbierto] = useState(false);
  const [ideaSeleccionada, setIdeaSeleccionada] = useState(null);
  const [nuevaIdea, setNuevaIdea] = useState({
    titulo: '',
    descripcion: '',
    categoria: 'general',
    impacto: 'medio',
    estado: 'nueva'
  });

  // Cargar ideas desde localStorage
  useEffect(() => {
    const ideasGuardadas = localStorage.getItem('muroInnovacion');
    if (ideasGuardadas) {
      setIdeas(JSON.parse(ideasGuardadas));
    }
  }, []);

  // Guardar ideas en localStorage
  useEffect(() => {
    localStorage.setItem('muroInnovacion', JSON.stringify(ideas));
  }, [ideas]);

  // Agregar nueva idea
  const agregarIdea = () => {
    if (!nuevaIdea.titulo.trim()) return;

    const idea = {
      id: Date.now(),
      ...nuevaIdea,
      fechaCreacion: new Date().toISOString(),
      likes: 0,
      comentarios: [],
      autor: 'Usuario Actual',
      votos: 0
    };

    setIdeas([...ideas, idea]);
    setNuevaIdea({
      titulo: '',
      descripcion: '',
      categoria: 'general',
      impacto: 'medio',
      estado: 'nueva'
    });
    setModalAbierto(false);
  };

  // Editar idea
  const editarIdea = () => {
    if (!editandoIdea.titulo.trim()) return;

    setIdeas(ideas.map(i => 
      i.id === editandoIdea.id ? editandoIdea : i
    ));
    setEditandoIdea(null);
    setModalAbierto(false);
  };

  // Eliminar idea
  const eliminarIdea = (id) => {
    setIdeas(ideas.filter(i => i.id !== id));
  };

  // Abrir modal para editar
  const abrirEditar = (idea) => {
    setEditandoIdea({ ...idea });
    setModalAbierto(true);
  };

  // Abrir modal para nueva idea
  const abrirNuevo = () => {
    setEditandoIdea(null);
    setModalAbierto(true);
  };

  // Dar like a una idea
  const darLike = (id) => {
    setIdeas(ideas.map(i => 
      i.id === id ? { ...i, likes: i.likes + 1 } : i
    ));
  };

  // Votar por una idea
  const votarIdea = (id, voto) => {
    setIdeas(ideas.map(i => 
      i.id === id ? { ...i, votos: i.votos + voto } : i
    ));
  };

  // Cambiar estado de una idea
  const cambiarEstado = (id, nuevoEstado) => {
    setIdeas(ideas.map(i => 
      i.id === id ? { ...i, estado: nuevoEstado } : i
    ));
  };

  // Función para abrir modal de detalle
  const abrirDetalle = (idea) => {
    setIdeaSeleccionada(idea);
    setModalDetalleAbierto(true);
  };

  // Función para cerrar modal de detalle
  const cerrarDetalle = () => {
    setModalDetalleAbierto(false);
    setIdeaSeleccionada(null);
  };

  return {
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
  };
}; 