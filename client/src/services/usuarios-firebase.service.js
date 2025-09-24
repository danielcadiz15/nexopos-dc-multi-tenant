// src/services/usuarios-firebase.service.js
import { auth } from '../firebase/config';

class UsuariosFirebaseService {
  constructor() {
    // URL específica para usuarios
    this.baseURL = process.env.REACT_APP_FIREBASE_USUARIOS_URL || 
                   'https://api-5q2i5764zq-uc.a.run.app/usuarios';
  }

  async getAuthHeaders() {
    try {
      const token = await auth.currentUser?.getIdToken();
      return {
        'Content-Type': 'application/json',
        'Accept': 'application/json',
        ...(token && { 'Authorization': `Bearer ${token}` })
      };
    } catch (error) {
      console.error('Error obteniendo token:', error);
      return {
        'Content-Type': 'application/json',
        'Accept': 'application/json'
      };
    }
  }

  async obtenerTodos() {
    try {
      const headers = await this.getAuthHeaders();
      const response = await fetch(this.baseURL, {
        method: 'GET',
        headers
      });

      if (!response.ok) {
        throw new Error(`HTTP ${response.status}`);
      }

      const data = await response.json();
      return data.data || [];
    } catch (error) {
      console.error('Error al obtener usuarios:', error);
      throw error;
    }
  }

  async obtenerPorId(id) {
    try {
      const headers = await this.getAuthHeaders();
      const response = await fetch(`${this.baseURL}/${id}`, {
        method: 'GET',
        headers
      });

      if (!response.ok) {
        throw new Error(`HTTP ${response.status}`);
      }

      const data = await response.json();
      return data.data;
    } catch (error) {
      console.error('Error al obtener usuario:', error);
      throw error;
    }
  }

  async crear(usuario) {
    try {
      const headers = await this.getAuthHeaders();
      console.log('🆕 Creando usuario:', usuario);
      
      const response = await fetch(this.baseURL, {
        method: 'POST',
        headers,
        body: JSON.stringify(usuario)
      });

      const responseData = await response.json();
      console.log('📦 Respuesta del servidor:', responseData);

      if (!response.ok) {
        throw new Error(responseData.message || `HTTP ${response.status}`);
      }

      if (!responseData.success) {
        throw new Error(responseData.message || 'Error al crear usuario');
      }

      return responseData;
    } catch (error) {
      console.error('❌ Error al crear usuario:', error);
      throw error;
    }
  }

  async actualizar(id, usuario) {
    try {
      const headers = await this.getAuthHeaders();
      const response = await fetch(`${this.baseURL}/${id}`, {
        method: 'PUT',
        headers,
        body: JSON.stringify(usuario)
      });

      const responseData = await response.json();

      if (!response.ok) {
        throw new Error(responseData.message || `HTTP ${response.status}`);
      }

      return responseData;
    } catch (error) {
      console.error('Error al actualizar usuario:', error);
      throw error;
    }
  }

  async cambiarPassword(id, passwords) {
    try {
      const headers = await this.getAuthHeaders();
      const response = await fetch(`${this.baseURL}/${id}/password`, {
        method: 'PATCH',
        headers,
        body: JSON.stringify(passwords)
      });

      const responseData = await response.json();

      if (!response.ok) {
        throw new Error(responseData.message || `HTTP ${response.status}`);
      }

      return responseData;
    } catch (error) {
      console.error('Error al cambiar password:', error);
      throw error;
    }
  }

  async cambiarEstado(id, activo) {
    try {
      const headers = await this.getAuthHeaders();
      const response = await fetch(`${this.baseURL}/${id}/estado`, {
        method: 'PATCH',
        headers,
        body: JSON.stringify({ activo })
      });

      const responseData = await response.json();

      if (!response.ok) {
        throw new Error(responseData.message || `HTTP ${response.status}`);
      }

      return responseData;
    } catch (error) {
      console.error('Error al cambiar estado:', error);
      throw error;
    }
  }

  async buscar(termino) {
    try {
      const headers = await this.getAuthHeaders();
      const response = await fetch(`${this.baseURL}/buscar?termino=${encodeURIComponent(termino)}`, {
        method: 'GET',
        headers
      });

      if (!response.ok) {
        throw new Error(`HTTP ${response.status}`);
      }

      const data = await response.json();
      return data.data || [];
    } catch (error) {
      console.error('Error al buscar usuarios:', error);
      throw error;
    }
  }

  async obtenerRoles() {
    try {
      const headers = await this.getAuthHeaders();
      const response = await fetch(`${this.baseURL}/roles`, {
        method: 'GET',
        headers
      });

      if (!response.ok) {
        throw new Error(`HTTP ${response.status}`);
      }

      const data = await response.json();
      return data.data || [];
    } catch (error) {
      console.error('Error al obtener roles:', error);
      throw error;
    }
  }
}

export default new UsuariosFirebaseService();