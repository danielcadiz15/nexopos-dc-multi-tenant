/**
 * Utilidades para almacenamiento local
 * 
 * Funciones para manejar almacenamiento local con soporte para
 * serialización/deserialización de JSON.
 * 
 * @module utils/storage
 */

/**
 * Guarda un valor en el almacenamiento local
 * @param {string} key - Clave para el valor
 * @param {*} value - Valor a guardar (se serializará si es objeto)
 */
export const setItem = (key, value) => {
  try {
    const serializedValue = typeof value === 'object' ? 
      JSON.stringify(value) : value;
    
    localStorage.setItem(key, serializedValue);
  } catch (error) {
    console.error('Error al guardar en localStorage:', error);
  }
};

/**
 * Obtiene un valor del almacenamiento local
 * @param {string} key - Clave del valor a obtener
 * @param {*} defaultValue - Valor por defecto si no existe
 * @returns {*} Valor recuperado o valor por defecto
 */
export const getItem = (key, defaultValue = null) => {
  try {
    const value = localStorage.getItem(key);
    
    if (value === null) {
      return defaultValue;
    }
    
    // Intentar deserializar como JSON
    try {
      return JSON.parse(value);
    } catch (e) {
      // Si no es JSON, devolver tal cual
      return value;
    }
  } catch (error) {
    console.error('Error al leer de localStorage:', error);
    return defaultValue;
  }
};

/**
 * Elimina un valor del almacenamiento local
 * @param {string} key - Clave del valor a eliminar
 */
export const removeItem = (key) => {
  try {
    localStorage.removeItem(key);
  } catch (error) {
    console.error('Error al eliminar de localStorage:', error);
  }
};

/**
 * Limpia todo el almacenamiento local
 */
export const clearStorage = () => {
  try {
    localStorage.clear();
  } catch (error) {
    console.error('Error al limpiar localStorage:', error);
  }
};

export default {
  setItem,
  getItem,
  removeItem,
  clearStorage
};