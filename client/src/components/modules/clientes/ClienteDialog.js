import React, { useState, useEffect } from 'react';
import { toast } from 'react-toastify';

// Servicios
import clientesService from '../../../services/clientes.service';

// Componentes
import Button from '../../common/Button';
import Spinner from '../../common/Spinner';

// Iconos
import { 
  FaSearch, FaUserPlus, FaUser, FaSave, 
  FaTimes, FaPhone, FaEnvelope, FaMapMarkerAlt 
} from 'react-icons/fa';

/**
 * Componente de diálogo para buscar y seleccionar clientes
 * @param {Object} props - Propiedades del componente
 * @returns {JSX.Element} Componente ClienteDialog
 */
const ClienteDialog = ({ isOpen, onClose, onSelectCliente, onCreateCliente }) => {
  // Estado
  const [tab, setTab] = useState('buscar'); // 'buscar' o 'nuevo'
  const [searchTerm, setSearchTerm] = useState('');
  const [searchResults, setSearchResults] = useState([]);
  const [loading, setLoading] = useState(false);
  
  // Estado del formulario de nuevo cliente
  const [nuevoCliente, setNuevoCliente] = useState({
    nombre: '',
    apellido: '',
    telefono: '',
    email: '',
    direccion: ''
  });
  
  // Cerrar diálogo si isOpen cambia a false
  useEffect(() => {
    if (!isOpen) {
      // Limpiar estado
      setSearchTerm('');
      setSearchResults([]);
      setTab('buscar');
      setNuevoCliente({
        nombre: '',
        apellido: '',
        telefono: '',
        email: '',
        direccion: ''
      });
    }
  }, [isOpen]);
  
  // Si no está abierto, no renderizar
  if (!isOpen) return null;
  
  /**
   * Busca clientes por término con fallback si falla
   */
  const buscarClientes = async () => {
    if (!searchTerm.trim()) return;
    
    try {
      setLoading(true);
      console.log('Buscando clientes con término:', searchTerm);
      
      try {
        // Intentar búsqueda normal
        const clientes = await clientesService.buscar(searchTerm);
        console.log('Clientes encontrados:', clientes.length);
        setSearchResults(clientes);
      } catch (searchError) {
        console.error('Error en búsqueda, intentando cargar todos los clientes:', searchError);
        
        // FALLBACK: Si la búsqueda falla, cargar todos y filtrar localmente
        toast.warning('Búsqueda en servidor no disponible, buscando localmente...');
        
        // Cargar todos los clientes
        const todosLosClientes = await clientesService.obtenerTodos();
        
        // Filtrar localmente
        const terminoLower = searchTerm.toLowerCase();
        const clientesFiltrados = todosLosClientes.filter(cliente => {
          const nombre = String(cliente.nombre || '').toLowerCase();
          const apellido = String(cliente.apellido || '').toLowerCase();
          const telefono = String(cliente.telefono || '').toLowerCase();
          const email = String(cliente.email || '').toLowerCase();
          const dni_cuit = String(cliente.dni_cuit || '').toLowerCase();
          
          return nombre.includes(terminoLower) ||
                 apellido.includes(terminoLower) ||
                 telefono.includes(terminoLower) ||
                 email.includes(terminoLower) ||
                 dni_cuit.includes(terminoLower) ||
                 `${nombre} ${apellido}`.includes(terminoLower);
        });
        
        console.log('Clientes filtrados localmente:', clientesFiltrados.length);
        setSearchResults(clientesFiltrados);
      }
    } catch (error) {
      console.error('Error al buscar clientes:', error);
      toast.error('Error al buscar clientes');
      setSearchResults([]);
    } finally {
      setLoading(false);
    }
  };
  
  /**
   * Maneja el cambio en el campo de búsqueda
   * @param {Event} e - Evento de cambio
   */
  const handleSearchChange = (e) => {
    setSearchTerm(e.target.value);
  };
  
  /**
   * Maneja la tecla Enter en el campo de búsqueda
   * @param {Event} e - Evento de teclado
   */
  const handleSearchKeyDown = (e) => {
    if (e.key === 'Enter') {
      e.preventDefault();
      buscarClientes();
    }
  };
  
  /**
   * Selecciona un cliente
   * @param {Object} cliente - Cliente seleccionado
   */
  const selectCliente = (cliente) => {
    onSelectCliente(cliente);
    onClose();
  };
  
  /**
   * Maneja el cambio en los campos del formulario de nuevo cliente
   * @param {Event} e - Evento de cambio
   */
  const handleInputChange = (e) => {
    const { name, value } = e.target;
    setNuevoCliente(prev => ({
      ...prev,
      [name]: value
    }));
  };
  
  /**
   * Crea un nuevo cliente
   */
  const handleCreateCliente = async () => {
    // Validación básica
    if (!nuevoCliente.nombre.trim()) {
      toast.error('El nombre del cliente es obligatorio');
      return;
    }
    
    try {
      setLoading(true);
      console.log('Creando cliente:', nuevoCliente);
      
      const response = await clientesService.crear(nuevoCliente);
      console.log('Cliente creado:', response);
      
      if (response && (response.id || response.nombre)) {
        onCreateCliente(response);
        toast.success('Cliente creado correctamente');
      } else {
        console.error('Respuesta inesperada:', response);
        toast.error('Error al crear cliente: respuesta inválida');
      }
    } catch (error) {
      console.error('Error al crear cliente:', error);
      toast.error('Error al crear cliente');
    } finally {
      setLoading(false);
    }
  };
  
  return (
    <div className="fixed inset-0 z-50 overflow-y-auto">
      {/* Overlay de fondo oscuro */}
      <div 
        className="fixed inset-0 bg-black bg-opacity-50"
        onClick={onClose}
      ></div>
      
      {/* Modal */}
      <div className="flex items-center justify-center min-h-screen p-4">
        <div className="bg-white rounded-lg shadow-xl w-full max-w-2xl relative z-10">
          {/* Cabecera */}
          <div className="flex justify-between items-center p-4 border-b">
            <h2 className="text-xl font-semibold text-gray-800">
              {tab === 'buscar' ? 'Seleccionar Cliente' : 'Nuevo Cliente'}
            </h2>
            <button
              onClick={onClose}
              className="text-gray-500 hover:text-gray-700"
            >
              <FaTimes />
            </button>
          </div>
          
          {/* Tabs */}
          <div className="flex border-b">
            <button
              className={`flex-1 py-3 text-center font-medium ${
                tab === 'buscar' 
                  ? 'text-indigo-600 border-b-2 border-indigo-600' 
                  : 'text-gray-600 hover:text-gray-800'
              }`}
              onClick={() => setTab('buscar')}
            >
              <FaSearch className="inline mr-2" />
              Buscar Cliente
            </button>
            <button
              className={`flex-1 py-3 text-center font-medium ${
                tab === 'nuevo' 
                  ? 'text-indigo-600 border-b-2 border-indigo-600' 
                  : 'text-gray-600 hover:text-gray-800'
              }`}
              onClick={() => setTab('nuevo')}
            >
              <FaUserPlus className="inline mr-2" />
              Nuevo Cliente
            </button>
          </div>
          
          {/* Contenido del tab */}
          <div className="p-4">
            {tab === 'buscar' ? (
              // Tab de búsqueda
              <div>
                {/* Campo de búsqueda */}
                <div className="mb-4 flex">
                  <input
                    type="text"
                    value={searchTerm}
                    onChange={handleSearchChange}
                    onKeyDown={handleSearchKeyDown}
                    placeholder="Buscar por nombre, teléfono o email..."
                    className="flex-grow border rounded-l-md px-3 py-2 focus:outline-none focus:ring-2 focus:ring-indigo-500"
                  />
                  <button
                    onClick={buscarClientes}
                    disabled={loading || !searchTerm.trim()}
                    className="bg-indigo-600 text-white px-4 py-2 rounded-r-md hover:bg-indigo-700 focus:outline-none focus:ring-2 focus:ring-indigo-500 disabled:bg-gray-400"
                  >
                    {loading ? <Spinner size="sm" /> : <FaSearch />}
                  </button>
                </div>
                
                {/* Resultados de búsqueda */}
                {searchResults.length > 0 ? (
                  <div className="max-h-64 overflow-y-auto border rounded-md">
                    {searchResults.map(cliente => (
                      <div 
                        key={cliente.id}
                        className="p-3 border-b last:border-b-0 hover:bg-gray-50 cursor-pointer"
                        onClick={() => selectCliente(cliente)}
                      >
                        <div className="font-medium">
                          {cliente.nombre} {cliente.apellido}
                        </div>
                        <div className="text-sm text-gray-600 flex flex-wrap gap-4 mt-1">
                          {cliente.telefono && (
                            <span className="flex items-center">
                              <FaPhone className="mr-1" size={12} />
                              {cliente.telefono}
                            </span>
                          )}
                          {cliente.email && (
                            <span className="flex items-center">
                              <FaEnvelope className="mr-1" size={12} />
                              {cliente.email}
                            </span>
                          )}
                          {cliente.direccion && (
                            <span className="flex items-center">
                              <FaMapMarkerAlt className="mr-1" size={12} />
                              {cliente.direccion}
                            </span>
                          )}
                        </div>
                      </div>
                    ))}
                  </div>
                ) : (
                  searchTerm.trim() && !loading && (
                    <div className="text-center p-4 bg-gray-50 rounded-md">
                      <p className="text-gray-500">
                        No se encontraron clientes
                      </p>
                      <Button
                        color="secondary"
                        size="sm"
                        className="mt-2"
                        onClick={() => setTab('nuevo')}
                      >
                        <FaUserPlus className="mr-1" />
                        Crear Nuevo Cliente
                      </Button>
                    </div>
                  )
                )}
                
                {/* Mensaje para clientes sin búsqueda */}
                {!searchTerm.trim() && (
                  <div className="text-center p-4 bg-gray-50 rounded-md">
                    <FaSearch className="mx-auto text-gray-400 text-2xl mb-2" />
                    <p className="text-gray-600">
                      Busca clientes por nombre, teléfono o email
                    </p>
                  </div>
                )}
              </div>
            ) : (
              // Tab de nuevo cliente
              <div>
                <div className="space-y-4">
                  <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                    <div>
                      <label className="block text-sm font-medium text-gray-700 mb-1">
                        Nombre*
                      </label>
                      <input
                        type="text"
                        name="nombre"
                        value={nuevoCliente.nombre}
                        onChange={handleInputChange}
                        className="w-full border rounded-md px-3 py-2 focus:outline-none focus:ring-2 focus:ring-indigo-500"
                        required
                      />
                    </div>
                    <div>
                      <label className="block text-sm font-medium text-gray-700 mb-1">
                        Apellido
                      </label>
                      <input
                        type="text"
                        name="apellido"
                        value={nuevoCliente.apellido}
                        onChange={handleInputChange}
                        className="w-full border rounded-md px-3 py-2 focus:outline-none focus:ring-2 focus:ring-indigo-500"
                      />
                    </div>
                  </div>
                  
                  <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                    <div>
                      <label className="block text-sm font-medium text-gray-700 mb-1">
                        Teléfono
                      </label>
                      <input
                        type="tel"
                        name="telefono"
                        value={nuevoCliente.telefono}
                        onChange={handleInputChange}
                        className="w-full border rounded-md px-3 py-2 focus:outline-none focus:ring-2 focus:ring-indigo-500"
                      />
                    </div>
                    <div>
                      <label className="block text-sm font-medium text-gray-700 mb-1">
                        Email
                      </label>
                      <input
                        type="email"
                        name="email"
                        value={nuevoCliente.email}
                        onChange={handleInputChange}
                        className="w-full border rounded-md px-3 py-2 focus:outline-none focus:ring-2 focus:ring-indigo-500"
                      />
                    </div>
                  </div>
                  
                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-1">
                      Dirección
                    </label>
                    <input
                      type="text"
                      name="direccion"
                      value={nuevoCliente.direccion}
                      onChange={handleInputChange}
                      className="w-full border rounded-md px-3 py-2 focus:outline-none focus:ring-2 focus:ring-indigo-500"
                    />
                  </div>
                </div>
                
                <div className="flex justify-end mt-6">
                  <Button
                    color="secondary"
                    className="mr-2"
                    onClick={() => setTab('buscar')}
                  >
                    <FaTimes className="mr-1" />
                    Cancelar
                  </Button>
                  <Button
                    color="primary"
                    onClick={handleCreateCliente}
                    loading={loading}
                  >
                    <FaSave className="mr-1" />
                    Guardar Cliente
                  </Button>
                </div>
              </div>
            )}
          </div>
        </div>
      </div>
    </div>
  );
};

export default ClienteDialog;