/**
 * Formulario para crear o editar clientes
 * 🆕 ACTUALIZADO: Sin campos estáticos de saldo (se calculan automáticamente)
 * 
 * Permite añadir nuevos clientes o modificar los existentes
 * 
 * @module pages/clientes/ClienteForm
 * @requires react, react-router-dom, ../../services/clientes.service
 * @related_files ./Clientes.js
 */

import React, { useState, useEffect } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import { toast } from 'react-toastify';
import { Link } from 'react-router-dom';
import { FaFileImport } from 'react-icons/fa';

// Servicios
import clientesService from '../../services/clientes.service';

// Componentes
import Card from '../../components/common/Card';
import Button from '../../components/common/Button';
import Spinner from '../../components/common/Spinner';

// Iconos
import { 
  FaUser, FaArrowLeft, FaSave, FaTimes, FaCalculator
} from 'react-icons/fa';

/**
 * Componente de formulario para cliente
 * @returns {JSX.Element} Componente ClienteForm
 */
// Eliminado: listas predeterminadas de zonas/localidades específicas

const ClienteForm = () => {
  const { id } = useParams();
  const navigate = useNavigate();
  const esEdicion = !!id;
  
  // Estado del formulario (SIN campos de saldo estáticos)
  const [formData, setFormData] = useState({
    nombre: '',
    apellido: '',
    dni_cuit: '',
    telefono: '',
    email: '',
    direccion: '',
    categoria: '',
    localidad: '',
    zona: '',
    notas: '',
    activo: true
  });
  
  const [loading, setLoading] = useState(esEdicion);
  const [guardando, setGuardando] = useState(false);
  const [errores, setErrores] = useState({});
  
  // 🆕 NUEVO: Estado para mostrar saldo calculado
  const [saldoCalculado, setSaldoCalculado] = useState(null);
  const [cargandoSaldo, setCargandoSaldo] = useState(false);

  /**
   * 🆕 NUEVO: Calcula y muestra el saldo del cliente
   */
  const cargarSaldoCliente = async () => {
    if (!esEdicion || !id) return;
    
    try {
      setCargandoSaldo(true);
      const saldoInfo = await clientesService.calcularSaldoCliente(id);
      setSaldoCalculado(saldoInfo);
    } catch (error) {
      console.error('Error al cargar saldo del cliente:', error);
    } finally {
      setCargandoSaldo(false);
    }
  };
  
  /**
   * Carga los datos del cliente si es edición
   */
  useEffect(() => {
    if (esEdicion) {
      const cargarCliente = async () => {
        try {
          const cliente = await clientesService.obtenerPorId(id);
          setFormData({
            nombre: cliente.nombre || '',
            apellido: cliente.apellido || '',
            telefono: cliente.telefono || '',
            email: cliente.email || '',
            direccion: cliente.direccion || '',
            dni_cuit: cliente.dni_cuit || '',
            categoria: cliente.categoria || '',
            localidad: cliente.localidad || '',
            zona: cliente.zona || '',
            notas: cliente.notas || '',
            activo: cliente.activo !== false
          });
          
          // Cargar saldo después de cargar datos del cliente
          cargarSaldoCliente();
        } catch (error) {
          console.error('Error al cargar cliente:', error);
          toast.error('Error al cargar los datos del cliente');
          navigate('/clientes');
        } finally {
          setLoading(false);
        }
      };
      
      cargarCliente();
    }
  }, [id, esEdicion, navigate]);
  
  /**
   * Maneja cambios en los campos del formulario
   * @param {Event} e - Evento de cambio
   */
  const handleChange = (e) => {
    const { name, value, type, checked } = e.target;
    
    setFormData(prev => ({
      ...prev,
      [name]: type === 'checkbox' ? checked : value
    }));
  };
  
  /**
   * Valida el formulario antes de enviar
   * @returns {boolean} True si el formulario es válido
   */
  const validarFormulario = () => {
    const nuevosErrores = {};
    
    if (!formData.nombre.trim()) {
      nuevosErrores.nombre = 'El nombre es obligatorio';
    }
    
    if (!formData.categoria) {
      nuevosErrores.categoria = 'La categoría es obligatoria';
    }
    
    if (formData.email && !/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(formData.email)) {
      nuevosErrores.email = 'El formato del email no es válido';
    }
    
    setErrores(nuevosErrores);
    return Object.keys(nuevosErrores).length === 0;
  };
  
  /**
   * Envía el formulario
   * @param {Event} e - Evento de envío
   */
  const handleSubmit = async (e) => {
    e.preventDefault();
    
    if (!validarFormulario()) {
      return;
    }
    
    setGuardando(true);
    
    try {
      if (esEdicion) {
        await clientesService.actualizar(id, formData);
        toast.success('Cliente actualizado correctamente');
        
        // Recargar saldo después de actualizar
        cargarSaldoCliente();
      } else {
        await clientesService.crear(formData);
        toast.success('Cliente creado correctamente');
        navigate('/clientes');
      }
      
    } catch (error) {
      console.error('Error al guardar cliente:', error);
      toast.error(esEdicion ? 'Error al actualizar el cliente' : 'Error al crear el cliente');
    } finally {
      setGuardando(false);
    }
  };

  /**
   * Formatea un valor monetario
   * @param {number} valor - Valor a formatear
   * @returns {string} Valor formateado
   */
  const formatearMoneda = (valor) => {
    return new Intl.NumberFormat('es-AR', {
      style: 'currency',
      currency: 'ARS'
    }).format(valor || 0);
  };
  
  // Si está cargando, mostrar spinner
  if (loading) {
    return (
      <div className="flex justify-center items-center h-64">
        <Spinner size="lg" />
      </div>
    );
  }

  return (
    <div className="space-y-6">
      <div className="flex justify-between items-center">
        <h1 className="text-2xl font-bold text-gray-800">
          {esEdicion ? 'Editar Cliente' : 'Nuevo Cliente'}
        </h1>
        
        <Button
          color="secondary"
          onClick={() => navigate('/clientes')}
          icon={<FaArrowLeft />}
        >
          Volver
        </Button>
      </div>

      {/* 🆕 NUEVO: Tarjeta de saldo calculado (solo en edición) */}
      {esEdicion && (
        <Card>
          <div className="bg-gradient-to-r from-blue-50 to-indigo-50 p-4 rounded-lg">
            <div className="flex items-center justify-between">
              <h3 className="text-lg font-medium text-gray-800 flex items-center">
                <FaCalculator className="mr-2 text-blue-600" />
                Estado de Cuenta
              </h3>
              
              <button
                onClick={cargarSaldoCliente}
                disabled={cargandoSaldo}
                className="text-blue-600 hover:text-blue-800 text-sm"
              >
                {cargandoSaldo ? 'Actualizando...' : 'Actualizar'}
              </button>
            </div>
            
            {cargandoSaldo ? (
              <div className="flex items-center mt-2">
                <Spinner size="sm" />
                <span className="ml-2 text-gray-600">Calculando saldo...</span>
              </div>
            ) : saldoCalculado ? (
              <div className="mt-3 grid grid-cols-2 md:grid-cols-4 gap-4">
                <div className="text-center">
                  <p className="text-sm text-gray-600">Saldo Actual</p>
                  <p className={`text-lg font-bold ${
                    saldoCalculado.saldo_actual > 0 
                      ? 'text-red-600' 
                      : saldoCalculado.saldo_actual < 0 
                        ? 'text-green-600' 
                        : 'text-gray-600'
                  }`}>
                    {saldoCalculado.saldo_actual > 0 && '-'}
                    {formatearMoneda(Math.abs(saldoCalculado.saldo_actual))}
                  </p>
                  <p className="text-xs text-gray-500">
                    {saldoCalculado.saldo_actual > 0 
                      ? 'Adeudado' 
                      : saldoCalculado.saldo_actual < 0 
                        ? 'A favor' 
                        : 'Sin saldo'}
                  </p>
                </div>
                
                <div className="text-center">
                  <p className="text-sm text-gray-600">Total Ventas</p>
                  <p className="text-lg font-medium text-gray-800">
                    {formatearMoneda(saldoCalculado.total_ventas)}
                  </p>
                </div>
                
                <div className="text-center">
                  <p className="text-sm text-gray-600">Total Pagado</p>
                  <p className="text-lg font-medium text-green-600">
                    {formatearMoneda(saldoCalculado.total_pagado)}
                  </p>
                </div>
                
                <div className="text-center">
                  <p className="text-sm text-gray-600">Cantidad Ventas</p>
                  <p className="text-lg font-medium text-blue-600">
                    {saldoCalculado.cantidad_ventas}
                  </p>
                </div>
              </div>
            ) : (
              <p className="mt-2 text-gray-500">No se pudo cargar el estado de cuenta</p>
            )}
          </div>
        </Card>
      )}
      
      <Card>
        <form onSubmit={handleSubmit} className="space-y-6">
          <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
            {/* Nombre */}
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">
                Nombre *
              </label>
              <input
                type="text"
                name="nombre"
                value={formData.nombre}
                onChange={handleChange}
                className={`nexo-field sm:text-sm ${
                  errores.nombre ? 'border-red-500' : ''
                }`}
                placeholder="Nombre del cliente"
              />
              {errores.nombre && (
                <p className="mt-1 text-sm text-red-600">{errores.nombre}</p>
              )}
            </div>
            
            {/* Apellido */}
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">
                Apellido
              </label>
              <input
                type="text"
                name="apellido"
                value={formData.apellido}
                onChange={handleChange}
                className="nexo-field sm:text-sm"
                placeholder="Apellido del cliente"
              />
            </div>

            {/* DNI/CUIT */}
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">
                DNI/CUIT
              </label>
              <input
                type="text"
                name="dni_cuit"
                value={formData.dni_cuit}
                onChange={handleChange}
                className="nexo-field sm:text-sm"
                placeholder="DNI o CUIT del cliente"
              />
            </div>
            
            {/* Teléfono */}
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">
                Teléfono
              </label>
              <input
                type="text"
                name="telefono"
                value={formData.telefono}
                onChange={handleChange}
                className="nexo-field sm:text-sm"
                placeholder="Teléfono de contacto"
              />
            </div>
            
            {/* Email */}
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">
                Email
              </label>
              <input
                type="email"
                name="email"
                value={formData.email}
                onChange={handleChange}
                className={`nexo-field sm:text-sm ${
                  errores.email ? 'border-red-500' : ''
                }`}
                placeholder="Correo electrónico"
              />
              {errores.email && (
                <p className="mt-1 text-sm text-red-600">{errores.email}</p>
              )}
            </div>
            
            {/* Dirección */}
            <div className="md:col-span-2">
              <label className="block text-sm font-medium text-gray-700 mb-1">
                Dirección
              </label>
              <input
                type="text"
                name="direccion"
                value={formData.direccion}
                onChange={handleChange}
                className="nexo-field sm:text-sm"
                placeholder="Dirección del cliente"
              />
            </div>
          </div>
          
          {/* Categoría */}
          <div className="grid grid-cols-1 md:grid-cols-3 gap-6 mt-6">
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">
                Categoría <span className="text-red-500">*</span>
              </label>
              <input
                type="text"
                name="categoria"
                value={formData.categoria}
                onChange={handleChange}
                className={`nexo-field sm:text-sm ${
                  errores.categoria ? 'border-red-500' : ''
                }`}
                placeholder="Ej: Minorista, Mayorista, VIP"
                required
              />
              {errores.categoria && (
                <p className="mt-1 text-sm text-red-600">{errores.categoria}</p>
              )}
            </div>
          </div>

          {/* Notas */}
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">
              Notas
            </label>
            <textarea
              name="notas"
              value={formData.notas}
              onChange={handleChange}
              rows={3}
              className="nexo-field sm:text-sm"
              placeholder="Notas adicionales sobre el cliente"
            />
          </div>

          {/* Estado activo */}
          <div className="flex items-center">
            <input
              type="checkbox"
              name="activo"
              checked={formData.activo}
              onChange={handleChange}
              className="h-4 w-4 text-indigo-600 focus:ring-indigo-500 border-gray-300 rounded"
            />
            <label className="ml-2 block text-sm text-gray-700">
              Cliente activo
            </label>
          </div>
          
          <div className="flex justify-end space-x-2 pt-4">
            <Button
              type="button"
              color="secondary"
              onClick={() => navigate('/clientes')}
              icon={<FaTimes />}
            >
              Cancelar
            </Button>
            
            <Button
              type="submit"
              color="primary"
              loading={guardando}
              icon={<FaSave />}
            >
              {esEdicion ? 'Actualizar Cliente' : 'Guardar Cliente'}
            </Button>
          </div>
        </form>
      </Card>
    </div>
  );
};

export default ClienteForm;