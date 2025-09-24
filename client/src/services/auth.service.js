/**
 * Servicio de autenticación
 * 
 * Maneja operaciones relacionadas con autenticación, registro
 * y gestión de sesiones.
 * 
 * @module services/auth.service
 * @requires axios, ./api.service
 * @related_files ../contexts/AuthContext.js, ../pages/auth/*
 */

import axios from 'axios';
import ApiService from './api.service';

/**
 * Instancia de axios para autenticación
 */
const API_URL = process.env.REACT_APP_API_URL || 'http://localhost:5000';
const api = axios.create({
  baseURL: `${API_URL}/api/auth`,
  // ...
});

/**
 * Servicio para operaciones de autenticación
 */
class AuthService {
  /**
   * Inicia sesión con correo y contraseña
   * @param {string} email - Correo electrónico
   * @param {string} password - Contraseña
   * @returns {Promise<Object>} Datos de autenticación (token y usuario)
   */
  async login(email, password) {
    return api.post('/login', { email, password });
  }
  
  /**
   * Cierra la sesión actual (solo en cliente)
   */
  async logout() {
    localStorage.removeItem('token');
    localStorage.removeItem('user');
  }
  
  async login(email, password) {
	  console.log(`Intentando iniciar sesión con email: ${email}`);
	  console.log(`URL base: ${api.defaults.baseURL}`);
	  try {
		const response = await api.post('/login', { email, password });
		console.log('Respuesta login:', response);
		return response;
	  } catch (error) {
		console.error('Error en login:', error.response || error.message);
		throw error;
	  }
	}
  /**
   * Registra un nuevo usuario (requiere ser administrador)
   * @param {Object} userData - Datos del nuevo usuario
   * @returns {Promise<Object>} Respuesta del servidor
   */
  async registrar(userData) {
    return api.post('/registro', userData);
  }
  
  /**
   * Obtiene información del perfil del usuario actual
   * @returns {Promise<Object>} Datos del perfil
   */
  async obtenerPerfil() {
    return api.get('/perfil');
  }
  
  /**
   * Actualiza el perfil del usuario
   * @param {number} id - ID del usuario
   * @param {Object} userData - Nuevos datos del usuario
   * @returns {Promise<Object>} Respuesta del servidor
   */
  async actualizarPerfil(id, userData) {
    return api.put(`/perfil/${id}`, userData);
  }
  
  /**
   * Cambia la contraseña del usuario
   * @param {number} id - ID del usuario
   * @param {string} oldPassword - Contraseña actual
   * @param {string} newPassword - Nueva contraseña
   * @returns {Promise<Object>} Respuesta del servidor
   */
  async cambiarPassword(id, oldPassword, newPassword) {
    return api.patch(`/password/${id}`, { oldPassword, newPassword });
  }
  
  /**
   * Establece el token de autenticación para peticiones
   * @param {string} token - Token JWT
   */
  setAuthToken(token) {
    api.defaults.headers.common['Authorization'] = `Bearer ${token}`;
    ApiService.setAuthToken(token);
  }
  
  /**
   * Limpia el token de autenticación
   */
  clearAuthToken() {
    delete api.defaults.headers.common['Authorization'];
    ApiService.clearAuthToken();
  }
}

export default new AuthService();