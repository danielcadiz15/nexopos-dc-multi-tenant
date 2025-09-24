import { 
  collection, 
  addDoc, 
  updateDoc, 
  deleteDoc, 
  doc, 
  getDocs, 
  query, 
  orderBy, 
  where,
  serverTimestamp,
  increment
} from 'firebase/firestore';
import { db } from '../firebase/config';

const IDEAS_COLLECTION = 'ideas';
const HISTORIAL_IDEAS_COLLECTION = 'historial_ideas';

export class IdeasService {
  // Obtener todas las ideas
  static async obtenerIdeas() {
    try {
      const q = query(
        collection(db, IDEAS_COLLECTION),
        orderBy('fechaCreacion', 'desc')
      );
      const querySnapshot = await getDocs(q);
      
      return querySnapshot.docs.map(doc => ({
        id: doc.id,
        ...doc.data(),
        fechaCreacion: doc.data().fechaCreacion?.toDate?.() || doc.data().fechaCreacion,
        fechaModificacion: doc.data().fechaModificacion?.toDate?.() || doc.data().fechaModificacion
      }));
    } catch (error) {
      console.error('Error al obtener ideas:', error);
      throw error;
    }
  }

  // Obtener ideas por estado
  static async obtenerIdeasPorEstado(estado) {
    try {
      const q = query(
        collection(db, IDEAS_COLLECTION),
        where('estado', '==', estado),
        orderBy('fechaCreacion', 'desc')
      );
      const querySnapshot = await getDocs(q);
      
      return querySnapshot.docs.map(doc => ({
        id: doc.id,
        ...doc.data(),
        fechaCreacion: doc.data().fechaCreacion?.toDate?.() || doc.data().fechaCreacion,
        fechaModificacion: doc.data().fechaModificacion?.toDate?.() || doc.data().fechaModificacion
      }));
    } catch (error) {
      console.error('Error al obtener ideas por estado:', error);
      throw error;
    }
  }

  // Crear nueva idea
  static async crearIdea(ideaData) {
    try {
      const idea = {
        ...ideaData,
        fechaCreacion: serverTimestamp(),
        fechaModificacion: serverTimestamp(),
        likes: 0,
        votos: 0,
        comentarios: [],
        historial: [{
          accion: 'creada',
          fecha: serverTimestamp(),
          usuario: ideaData.usuario || 'Usuario Actual'
        }]
      };

      const docRef = await addDoc(collection(db, IDEAS_COLLECTION), idea);
      
      // Agregar al historial
      await this.agregarAlHistorial(docRef.id, 'creada', ideaData.usuario || 'Usuario Actual');
      
      return { id: docRef.id, ...idea };
    } catch (error) {
      console.error('Error al crear idea:', error);
      throw error;
    }
  }

  // Actualizar idea
  static async actualizarIdea(id, ideaData) {
    try {
      const ideaRef = doc(db, IDEAS_COLLECTION, id);
      
      const ideaActualizada = {
        ...ideaData,
        fechaModificacion: serverTimestamp()
      };

      await updateDoc(ideaRef, ideaActualizada);
      
      // Agregar al historial
      await this.agregarAlHistorial(id, 'modificada', ideaData.usuario || 'Usuario Actual');
      
      return { id, ...ideaActualizada };
    } catch (error) {
      console.error('Error al actualizar idea:', error);
      throw error;
    }
  }

  // Dar like a una idea
  static async darLike(id, usuario) {
    try {
      const ideaRef = doc(db, IDEAS_COLLECTION, id);
      
      await updateDoc(ideaRef, {
        likes: increment(1),
        fechaModificacion: serverTimestamp()
      });
      
      // Agregar al historial
      await this.agregarAlHistorial(id, 'like', usuario || 'Usuario Actual');
      
      return { id, likes: increment(1) };
    } catch (error) {
      console.error('Error al dar like:', error);
      throw error;
    }
  }

  // Votar por una idea
  static async votarIdea(id, voto, usuario) {
    try {
      const ideaRef = doc(db, IDEAS_COLLECTION, id);
      
      await updateDoc(ideaRef, {
        votos: increment(voto),
        fechaModificacion: serverTimestamp()
      });
      
      // Agregar al historial
      const accion = voto > 0 ? 'voto positivo' : 'voto negativo';
      await this.agregarAlHistorial(id, accion, usuario || 'Usuario Actual');
      
      return { id, votos: increment(voto) };
    } catch (error) {
      console.error('Error al votar idea:', error);
      throw error;
    }
  }

  // Cambiar estado de una idea
  static async cambiarEstado(id, nuevoEstado, usuario) {
    try {
      const ideaRef = doc(db, IDEAS_COLLECTION, id);
      
      await updateDoc(ideaRef, {
        estado: nuevoEstado,
        fechaModificacion: serverTimestamp()
      });
      
      // Agregar al historial
      await this.agregarAlHistorial(id, `estado cambiado a ${nuevoEstado}`, usuario || 'Usuario Actual');
      
      return { id, estado: nuevoEstado };
    } catch (error) {
      console.error('Error al cambiar estado:', error);
      throw error;
    }
  }

  // Eliminar idea
  static async eliminarIdea(id, usuario) {
    try {
      // Agregar al historial antes de eliminar
      await this.agregarAlHistorial(id, 'eliminada', usuario || 'Usuario Actual');
      
      // Eliminar la idea
      await deleteDoc(doc(db, IDEAS_COLLECTION, id));
      
      return { id };
    } catch (error) {
      console.error('Error al eliminar idea:', error);
      throw error;
    }
  }

  // Obtener historial de una idea
  static async obtenerHistorialIdea(id) {
    try {
      const q = query(
        collection(db, HISTORIAL_IDEAS_COLLECTION),
        where('ideaId', '==', id),
        orderBy('fecha', 'desc')
      );
      const querySnapshot = await getDocs(q);
      
      return querySnapshot.docs.map(doc => ({
        id: doc.id,
        ...doc.data(),
        fecha: doc.data().fecha?.toDate?.() || doc.data().fecha
      }));
    } catch (error) {
      console.error('Error al obtener historial de idea:', error);
      throw error;
    }
  }

  // Obtener historial general de ideas
  static async obtenerHistorialGeneral(limit = 50) {
    try {
      const q = query(
        collection(db, HISTORIAL_IDEAS_COLLECTION),
        orderBy('fecha', 'desc'),
        limit
      );
      const querySnapshot = await getDocs(q);
      
      return querySnapshot.docs.map(doc => ({
        id: doc.id,
        ...doc.data(),
        fecha: doc.data().fecha?.toDate?.() || doc.data().fecha
      }));
    } catch (error) {
      console.error('Error al obtener historial general:', error);
      throw error;
    }
  }

  // Agregar entrada al historial
  static async agregarAlHistorial(ideaId, accion, usuario, detalles = null) {
    try {
      const entradaHistorial = {
        ideaId,
        accion,
        usuario,
        fecha: serverTimestamp(),
        detalles
      };

      await addDoc(collection(db, HISTORIAL_IDEAS_COLLECTION), entradaHistorial);
    } catch (error) {
      console.error('Error al agregar al historial:', error);
      // No lanzamos error aquí para no interrumpir la operación principal
    }
  }

  // Obtener idea por ID
  static async obtenerIdeaPorId(id) {
    try {
      const docRef = doc(db, IDEAS_COLLECTION, id);
      const docSnap = await getDocs(docRef);
      
      if (docSnap.exists()) {
        const data = docSnap.data();
        return {
          id: docSnap.id,
          ...data,
          fechaCreacion: data.fechaCreacion?.toDate?.() || data.fechaCreacion,
          fechaModificacion: data.fechaModificacion?.toDate?.() || data.fechaModificacion
        };
      } else {
        throw new Error('Idea no encontrada');
      }
    } catch (error) {
      console.error('Error al obtener idea por ID:', error);
      throw error;
    }
  }

  // Obtener estadísticas de ideas
  static async obtenerEstadisticas() {
    try {
      const ideas = await this.obtenerIdeas();
      
      const estadisticas = {
        total: ideas.length,
        porEstado: {},
        porCategoria: {},
        porImpacto: {},
        totalLikes: 0,
        totalVotos: 0
      };

      ideas.forEach(idea => {
        // Contar por estado
        estadisticas.porEstado[idea.estado] = (estadisticas.porEstado[idea.estado] || 0) + 1;
        
        // Contar por categoría
        estadisticas.porCategoria[idea.categoria] = (estadisticas.porCategoria[idea.categoria] || 0) + 1;
        
        // Contar por impacto
        estadisticas.porImpacto[idea.impacto] = (estadisticas.porImpacto[idea.impacto] || 0) + 1;
        
        // Sumar likes y votos
        estadisticas.totalLikes += idea.likes || 0;
        estadisticas.totalVotos += idea.votos || 0;
      });

      return estadisticas;
    } catch (error) {
      console.error('Error al obtener estadísticas:', error);
      throw error;
    }
  }
}

export default IdeasService;






