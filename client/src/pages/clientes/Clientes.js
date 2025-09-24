import React, { useState, useEffect } from 'react';
import { Link, useNavigate } from 'react-router-dom';
import { toast } from 'react-toastify';
import { 
  FaUserPlus, FaTags, FaFileImport, FaEdit, FaTrash, 
  FaSearch, FaWhatsapp, FaChevronLeft, FaChevronRight,
  FaCalculator, FaSpinner, FaExclamationTriangle 
} from 'react-icons/fa';

// Servicios
import clientesService from '../../services/clientes.service';
import preventaService from '../../services/preventa.service';
import { useAuth } from '../../contexts/AuthContext';
	  
// Componentes
import Card from '../../components/common/Card';
import Button from '../../components/common/Button';
import Spinner from '../../components/common/Spinner';
import * as XLSX from 'xlsx';

const CATEGORIAS_CLIENTE = {
  TODOS: 'Todos',
  CONDINEA: '',
  LA_FABRICA: 'LA FABRICA',
  DESPENSA: 'DESPENSA'
};

const LOCALIDADES_CONDINEA = [
  'Posadas',
  'Garupá',
  'Candelaria',
  'Capioví',
  'San Ignacio',
  'Jardín América',
  'Apóstoles',
  'Oberá',
  'Eldorado',
  'Puerto Rico',
  'Montecarlo',
  'Puerto Iguazú',
  'Ituzaingó',
  'Itatí',
  'Paso de la Patria',
  'San Luis del Palmar',
  'Caá Catí',
  'Loreto',
  'San Miguel',
  'Santa Rosa',
  'Tabay',
  'Tatacuá',
  'Saladas',
  'Mburucuyá',
  'Otros Corrientes',
  'Otros Misiones'
];

const ZONAS_CONDINEA = [
  'RUTA 118',
  'RUTA 12 CTES',
  'RUTA 12 MISIONES',
  'RUTA COSTERA-VIRASORO',
  'Itaembé Miní',
  'Itaembé Guazú',
  'POSADAS',
  'GARUPÁ',
  'Centro',
  'Villa Sarita',
  'Villa Lanús',
  'Miguel Lanús',
  'San Lorenzo',
  'Zona Norte',
  'Zona Sur',
  'Zona Este',
  'Zona Oeste'
];

/**
 * 🆕 COMPONENTE: Importación de Excel con saldos
 */
const ImportacionExcel = ({ isOpen, onClose, onImportar }) => {
  const [archivo, setArchivo] = useState(null);
  const [procesando, setProcesando] = useState(false);
  const { currentUser } = useAuth();

  const procesarImportacion = async () => {
    if (!archivo || !currentUser?.id) {
      toast.error('Selecciona un archivo y asegúrate de estar logueado');
      return;
    }

    try {
      setProcesando(true);
      
      // Leer archivo Excel
      const data = await archivo.arrayBuffer();
      const workbook = XLSX.read(data, { type: 'array' });
      const sheetName = workbook.SheetNames[0];
      const worksheet = workbook.Sheets[sheetName];
      const jsonData = XLSX.utils.sheet_to_json(worksheet, { header: 1 });

      // Mapear datos del Excel
      const clientesFormateados = jsonData.slice(1).map((row) => ({
        nombre: row[0] || '',
        apellido: '',
        dni_cuit: row[1] || '',
        telefono: row[2] || '',
        direccion: row[3] || '',
        email: row[4] || '',
        saldo: parseFloat(row[5]) || 0,
        categoria: ''
      }));

      const resultado = await clientesService.importarMasivoConSaldos(
        clientesFormateados,
        currentUser.id
      );

      toast.success(
        `Importación completada: ${resultado.exitosos} clientes, ${resultado.saldosCreados} saldos iniciales`
      );
      
      onImportar();
      onClose();
      
    } catch (error) {
      console.error('Error en importación:', error);
      toast.error('Error al importar clientes: ' + error.message);
    } finally {
      setProcesando(false);
    }
  };

  if (!isOpen) return null;

  return (
    <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50">
      <div className="bg-white rounded-lg p-6 w-full max-w-2xl mx-4">
        <h3 className="text-lg font-medium mb-4">Importar Clientes con Saldos</h3>
        
        <div className="space-y-4">
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-2">
              Archivo Excel (.xlsx)
            </label>
            <input
              type="file"
              accept=".xlsx,.xls"
              onChange={(e) => setArchivo(e.target.files[0])}
              className="block w-full text-sm text-gray-500 file:mr-4 file:py-2 file:px-4 file:rounded-full file:border-0 file:text-sm file:font-semibold file:bg-blue-50 file:text-blue-700 hover:file:bg-blue-100"
            />
          </div>
        </div>

        <div className="flex justify-end space-x-2 mt-6">
          <Button
            color="secondary"
            onClick={onClose}
            disabled={procesando}
          >
            Cancelar
          </Button>
          
          <Button
            color="primary"
            onClick={procesarImportacion}
            disabled={!archivo || procesando}
            loading={procesando}
            icon={<FaFileImport />}
          >
            {procesando ? 'Importando...' : 'Importar'}
          </Button>
        </div>
      </div>
    </div>
  );
};

const Clientes = () => {
  const navigate = useNavigate();
  
  // Estados
  const [clientes, setClientes] = useState([]);
  const [loading, setLoading] = useState(true);
  const [searchTerm, setSearchTerm] = useState('');
  const [tipoContacto, setTipoContacto] = useState('Activos');
  const [categoriaCliente, setCategoriaCliente] = useState('Todos');
  const [localidadSeleccionada, setLocalidadSeleccionada] = useState('Todas');
  const [zonaSeleccionada, setZonaSeleccionada] = useState('Todas');
  const [paginaActual, setPaginaActual] = useState(1);
  const [clientesPorPagina, setClientesPorPagina] = useState(25);
  const [showImportDialog, setShowImportDialog] = useState(false);
  // Selección masiva
  const [selectedIds, setSelectedIds] = useState(new Set());
  // Zonas dinámicas para asignación masiva
  const [zonas, setZonas] = useState([]);
  const [zonaMasiva, setZonaMasiva] = useState('');
  const [asignandoZona, setAsignandoZona] = useState(false);
  
  // 🆕 NUEVO: Estados para saldos
  const [cargandoSaldos, setCargandoSaldos] = useState(false);
  const [totales, setTotales] = useState({
    cantidad: 0,
    deuda: 0
  });
  	
  // Cargar clientes
  useEffect(() => {
    cargarClientes();
  }, [tipoContacto, categoriaCliente, localidadSeleccionada, zonaSeleccionada]); 
  
  // Auto-cargar saldos solo si hay pocos clientes
  useEffect(() => {
    if (clientes.length > 0 && clientes.length <= 50) {
      cargarClientesConSaldos();
    }
  }, [clientes.length]);

  // Cargar zonas dinámicas (para asignación masiva)
  useEffect(() => {
    const cargarZonas = async () => {
      try {
        const lista = await preventaService.obtenerZonas();
        // Normalizar a array de nombres
        const nombres = Array.isArray(lista)
          ? lista.map(z => (typeof z === 'string' ? z : (z?.nombre || ''))).filter(Boolean)
          : [];
        // Merge con fallback local si fuera necesario
        const fallback = [];
        const setNombres = new Set([...nombres, ...fallback]);
        setZonas(Array.from(setNombres));
      } catch (_) {
        setZonas([]);
      }
    };
    cargarZonas();
  }, []);
  
  const cargarClientes = async () => {
	  try {
		setLoading(true);
		const data = await clientesService.obtenerTodos();
		
		// Filtrar por tipo y categoría
		let clientesFiltrados = data;
		
		// Filtrar por tipo (Activos/Inactivos)
		if (tipoContacto !== 'Todos') {
		  clientesFiltrados = clientesFiltrados.filter(c => 
			tipoContacto === 'Activos' ? c.activo : !c.activo
		  );
		}
		
		// AGREGAR: Filtrar por categoría
		if (categoriaCliente !== 'Todos') {
		  clientesFiltrados = clientesFiltrados.filter(c => 
			c.categoria === categoriaCliente
		  );
		}
		
		// Filtrar por localidad (deshabilitado)
		if (false) {
		  clientesFiltrados = clientesFiltrados.filter(c => 
			c.localidad === localidadSeleccionada
		  );
		}
		
		// Filtrar por zona (deshabilitado)
		if (false) {
		  clientesFiltrados = clientesFiltrados.filter(c => 
			c.zona === zonaSeleccionada
		  );
		}
		
		setClientes(clientesFiltrados);
		
		// Calcular totales básicos
		setTotales({
		  cantidad: clientesFiltrados.length,
		  deuda: 0 // Se calculará dinámicamente por cliente
		});
		
	  } catch (error) {
		console.error('Error al cargar clientes:', error);
		toast.error('Error al cargar los clientes');
	  } finally {
		setLoading(false);
	  }
	};

  /**
   * 🆕 NUEVO: Cargar clientes con saldos calculados
   */
  const cargarClientesConSaldos = async () => {
	  try {
		setCargandoSaldos(true);
		const clientesConSaldos = await clientesService.obtenerTodosConSaldos();
		
		// Filtrar por tipo y categoría
		let clientesFiltrados = clientesConSaldos;
		
		// Filtrar por tipo (Activos/Inactivos)
		if (tipoContacto !== 'Todos') {
		  clientesFiltrados = clientesFiltrados.filter(c => 
			tipoContacto === 'Activos' ? c.activo : !c.activo
		  );
		}
		
		// AGREGAR: Filtrar por categoría
		if (categoriaCliente !== 'Todos') {
		  clientesFiltrados = clientesFiltrados.filter(c => 
			c.categoria === categoriaCliente
		  );
		}
		
		// AGREGAR: Filtrar por localidad (solo si es CONDINEA)
		if (categoriaCliente === 'CONDINEA' && localidadSeleccionada !== 'Todas') {
		  clientesFiltrados = clientesFiltrados.filter(c => 
			c.localidad === localidadSeleccionada
		  );
		}
		
		// AGREGAR: Filtrar por zona (solo si es CONDINEA)
		if (categoriaCliente === 'CONDINEA' && zonaSeleccionada !== 'Todas') {
		  clientesFiltrados = clientesFiltrados.filter(c => 
			c.zona === zonaSeleccionada
		  );
		}
		
		setClientes(clientesFiltrados);
		
		// Calcular total de deuda
		const totalDeuda = clientesFiltrados.reduce((sum, c) => {
		  const saldo = c.saldo_calculado || 0;
		  return sum + (saldo > 0 ? saldo : 0); // Solo saldos adeudados
		}, 0);
		
		setTotales({
		  cantidad: clientesFiltrados.length,
		  deuda: totalDeuda
		});
		
	  } catch (error) {
		console.error('Error al cargar clientes con saldos:', error);
		toast.error('Error al cargar los saldos de clientes');
	  } finally {
		setCargandoSaldos(false);
	  }
	};

  /**
   * Calcular saldo individual de un cliente
   */
  const calcularSaldoIndividual = async (clienteId) => {
    try {
      const saldoInfo = await clientesService.calcularSaldoCliente(clienteId);
      // Actualizar solo este cliente
      setClientes(prevClientes => 
        prevClientes.map(c => 
          c.id === clienteId 
            ? { ...c, saldo_calculado: saldoInfo.saldo_actual }
            : c
        )
      );
      
      // Actualizar total de deuda
      const nuevaDeuda = clientes.reduce((sum, c) => {
        const saldo = c.id === clienteId ? saldoInfo.saldo_actual : (c.saldo_calculado || 0);
        return sum + (saldo > 0 ? saldo : 0);
      }, 0);
      
      setTotales(prev => ({ ...prev, deuda: nuevaDeuda }));
    } catch (error) {
      console.error('Error calculando saldo:', error);
      toast.error('Error al calcular saldo del cliente');
    }
  };
  
  // Búsqueda
	const clientesFiltrados = clientes.filter(cliente => {
	  // Primero aplicar búsqueda
	  const termino = searchTerm.toLowerCase();
	  const coincideBusqueda = (
		cliente.nombre?.toLowerCase().includes(termino) ||
		cliente.apellido?.toLowerCase().includes(termino) ||
		String(cliente.telefono || '').includes(termino) ||
		cliente.email?.toLowerCase().includes(termino) ||
		String(cliente.dni_cuit || '').includes(termino)
	  );
	  
	  // Luego aplicar filtro de categoría
	  const coincideCategoria = categoriaCliente === 'Todos' || cliente.categoria === categoriaCliente;
	  
	  // Filtro de localidad deshabilitado
	  const coincideLocalidad = true || 
							   localidadSeleccionada === 'Todas' || 
							   cliente.localidad === localidadSeleccionada;
	  
	  // Filtro de zona deshabilitado
	  const coincideZona = true || 
						  zonaSeleccionada === 'Todas' || 
						  cliente.zona === zonaSeleccionada;
	  
	  return coincideBusqueda && coincideCategoria && coincideLocalidad && coincideZona;
	});
  
  // Paginación
  const indexOfLastCliente = paginaActual * clientesPorPagina;
  const indexOfFirstCliente = indexOfLastCliente - clientesPorPagina;
  const clientesActuales = clientesFiltrados.slice(indexOfFirstCliente, indexOfLastCliente);
  const totalPaginas = Math.ceil(clientesFiltrados.length / clientesPorPagina);

  // Helpers de selección
  const allOnPageChecked = clientesActuales.length > 0 && clientesActuales.every(c => selectedIds.has(c.id));
  const toggleSelectOne = (id) => {
    setSelectedIds(prev => {
      const next = new Set(prev);
      if (next.has(id)) next.delete(id); else next.add(id);
      return next;
    });
  };
  const toggleSelectAllOnPage = () => {
    setSelectedIds(prev => {
      const next = new Set(prev);
      if (allOnPageChecked) {
        // deseleccionar todos en la página
        for (const c of clientesActuales) next.delete(c.id);
      } else {
        // seleccionar todos en la página
        for (const c of clientesActuales) if (c.id) next.add(c.id);
      }
      return next;
    });
  };

  const limpiarSeleccion = () => setSelectedIds(new Set());

  const asignarZonaMasiva = async () => {
    if (!zonaMasiva) {
      toast.error('Selecciona una zona para asignar');
      return;
    }
    const ids = Array.from(selectedIds);
    if (ids.length === 0) {
      toast.info('No hay clientes seleccionados');
      return;
    }
    try {
      setAsignandoZona(true);
      const resultados = await Promise.allSettled(
        ids.map(id => clientesService.actualizar(id, { zona: zonaMasiva }))
      );
      const exitos = resultados.filter(r => r.status === 'fulfilled').length;
      const fallos = resultados.length - exitos;
      if (exitos > 0) toast.success(`Zona asignada a ${exitos} clientes`);
      if (fallos > 0) toast.warn(`${fallos} actualizaciones fallaron`);
      // Actualizar estado local
      setClientes(prev => prev.map(c => (selectedIds.has(c.id) ? { ...c, zona: zonaMasiva } : c)));
      limpiarSeleccion();
      setZonaMasiva('');
    } catch (error) {
      console.error('Error en asignación masiva de zona:', error);
      toast.error('Error al asignar zona masivamente');
    } finally {
      setAsignandoZona(false);
    }
  };
  
  const eliminarCliente = async (id) => {
    if (window.confirm('¿Estás seguro de eliminar este cliente?')) {
      try {
        await clientesService.eliminar(id);
        toast.success('Cliente eliminado correctamente');
        cargarClientes();
      } catch (error) {
        toast.error('Error al eliminar el cliente');
      }
    }
  };
  
  const formatearTelefono = (telefono) => {
    if (!telefono) return '-';
    
    // Convertir a string para evitar el error
    const telefonoStr = String(telefono);
    
    return (
      <a 
        href={`https://wa.me/${telefonoStr.replace(/\D/g, '')}`}
        target="_blank"
        rel="noopener noreferrer"
        className="text-green-600 hover:text-green-700 flex items-center gap-1"
      >
        <FaWhatsapp /> {telefonoStr}
      </a>
    );
  };
  
  const formatearMoneda = (valor) => {
    return new Intl.NumberFormat('es-AR', {
      style: 'currency',
      currency: 'ARS'
    }).format(valor || 0);
  };

  return (
    <div className="p-6 bg-gray-50 min-h-screen">
      {/* Header */}
      <div className="mb-6">
        <h1 className="text-2xl font-bold text-gray-800 mb-4">Clientes</h1>
        
        {/* Botones de acción */}
        <div className="flex gap-3 mb-6">
          <Button
            color="primary"
            icon={<FaUserPlus />}
            onClick={() => navigate('/clientes/nuevo')}
          >
            Nuevo contacto
          </Button>
          
          <Button
            color="secondary"
            icon={<FaTags />}
            onClick={() => navigate('/clientes/categorias')}
          >
            Categorías de clientes
          </Button>
          
          <Button
            color="success"
            icon={<FaFileImport />}
            onClick={() => setShowImportDialog(true)}
          >
            Importar con Saldos
          </Button>

          <Button
            color="info"
            icon={<FaCalculator />}
            onClick={cargarClientesConSaldos}
            loading={cargandoSaldos}
          >
            {cargandoSaldos ? 'Calculando...' : 'Calcular Saldos'}
          </Button>
        </div>
        
        {/* Tarjetas de resumen */}
        <div className="grid grid-cols-2 gap-4 mb-6">
          <Card className="bg-white">
            <div className="text-center">
              <p className="text-sm text-gray-600">Cantidad</p>
              <p className="text-2xl font-bold text-gray-800">{totales.cantidad}</p>
            </div>
          </Card>
          
          <Card className="bg-white">
            <div className="text-center">
              <p className="text-sm text-gray-600">Deuda Total</p>
              <p className="text-2xl font-bold text-red-600">
                {formatearMoneda(totales.deuda)}
              </p>
              {cargandoSaldos && (
                <p className="text-xs text-gray-500 mt-1">Calculando...</p>
              )}
            </div>
          </Card>
        </div>

        {/* Mensaje informativo cuando hay muchos clientes */}
        {clientes.length > 50 && (
          <div className="mb-4 p-3 bg-yellow-50 border border-yellow-200 rounded-md">
            <p className="text-sm text-yellow-800">
              <FaExclamationTriangle className="inline mr-2" />
              Hay {clientes.length} clientes. Usa el botón "Calcular Saldos" para ver los saldos actualizados.
            </p>
          </div>
        )}
        
        {/* Filtros */}
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4 mb-4">
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">
              Tipo de contacto
            </label>
            <select
              value={tipoContacto}
              onChange={(e) => setTipoContacto(e.target.value)}
              className="w-full border border-gray-300 rounded-md px-3 py-2"
            >
              <option value="Activos">Activos</option>
              <option value="Inactivos">Inactivos</option>
              <option value="Todos">Todos</option>
            </select>
          </div>
          
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">
              Categoría de cliente:
            </label>
            <select
              value={categoriaCliente}
              onChange={(e) => {
                setCategoriaCliente(e.target.value);
                // Resetear localidad y zona cuando cambia la categoría
                setLocalidadSeleccionada('Todas');
                setZonaSeleccionada('Todas');
              }}
              className="w-full border border-gray-300 rounded-md px-3 py-2"
            >
              <option value="Todos">Todos</option>
              
              <option value="LA FABRICA">LA FABRICA</option>
              <option value="DESPENSA">DESPENSA</option>
            </select>
          </div>
          
          {/* Filtros de localidad deshabilitados */}
          {false && (
            <>
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">
                  Localidad:
                </label>
                <select
                  value={localidadSeleccionada}
                  onChange={(e) => setLocalidadSeleccionada(e.target.value)}
                  className="w-full border border-gray-300 rounded-md px-3 py-2"
                >
                  <option value="Todas">Todas las localidades</option>
                  {[].map(localidad => (
                    <option key={localidad} value={localidad}>{localidad}</option>
                  ))}
                </select>
              </div>
              
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">
                  Zona:
                </label>
                <select
                  value={zonaSeleccionada}
                  onChange={(e) => setZonaSeleccionada(e.target.value)}
                  className="w-full border border-gray-300 rounded-md px-3 py-2"
                >
                  <option value="Todas">Todas las zonas</option>
                  {[].map(zona => (
                    <option key={zona} value={zona}>{zona}</option>
                  ))}
                </select>
              </div>
            </>
          )}
        </div>
      </div>
      
      {/* Tabla */}
      <Card className="bg-white">
        {/* Barra de búsqueda y paginación */}
        <div className="flex justify-between items-center mb-4">
          <div className="flex items-center gap-2">
            <span className="text-sm text-gray-600">Mostrar</span>
            <select
              className="border border-gray-300 rounded px-2 py-1 text-sm"
              value={clientesPorPagina}
              onChange={(e) => {
                setClientesPorPagina(Number(e.target.value));
                setPaginaActual(1); // Resetear a primera página
              }}
            >
              <option value="25">25</option>
              <option value="50">50</option>
              <option value="100">100</option>
              <option value="200">200</option>
              <option value="500">500</option>
              <option value="1000">1000</option>
            </select>
            <span className="text-sm text-gray-600">registros</span>
          </div>
          
          <div className="relative">
            <input
              type="text"
              placeholder="Buscar..."
              value={searchTerm}
              onChange={(e) => setSearchTerm(e.target.value)}
              className="border border-gray-300 rounded-md px-8 py-2 text-sm"
            />
            <FaSearch className="absolute left-2 top-3 text-gray-400" />
          </div>
        </div>

        {/* Acciones masivas */}
        <div className="flex flex-col md:flex-row md:items-center md:justify-between gap-3 mb-3">
          <div className="text-sm text-gray-700">
            {selectedIds.size > 0 ? `${selectedIds.size} seleccionados` : 'Sin selección'}
          </div>
          <div className="flex items-center gap-2">
            <select
              value={zonaMasiva}
              onChange={(e) => setZonaMasiva(e.target.value)}
              className="border border-gray-300 rounded-md px-3 py-2 text-sm"
            >
              <option value="">Seleccionar zona…</option>
              {zonas.map(z => (
                <option key={z} value={z}>{z}</option>
              ))}
            </select>
            <Button
              color="primary"
              onClick={asignarZonaMasiva}
              disabled={selectedIds.size === 0 || !zonaMasiva || asignandoZona}
              loading={asignandoZona}
            >
              Asignar zona a seleccionados
            </Button>
            {selectedIds.size > 0 && (
              <Button color="secondary" onClick={limpiarSeleccion}>Limpiar selección</Button>
            )}
          </div>
        </div>
        
        {loading ? (
          <div className="flex justify-center py-10">
            <Spinner size="lg" />
          </div>
        ) : (
          <>
            <div className="overflow-x-auto">
              <table className="min-w-full">
                <thead className="bg-gray-50">
                  <tr>
                    <th className="px-4 py-3 text-left text-xs font-medium text-gray-500 uppercase">
                      <input
                        type="checkbox"
                        checked={allOnPageChecked}
                        onChange={toggleSelectAllOnPage}
                      />
                    </th>
                    <th className="px-4 py-3 text-left text-xs font-medium text-gray-500 uppercase">
                      Acción
                    </th>
                    <th className="px-4 py-3 text-left text-xs font-medium text-gray-500 uppercase">
                      Nombre
                    </th>
                    <th className="px-4 py-3 text-left text-xs font-medium text-gray-500 uppercase">
                      ID (DNI/CUIT)
                    </th>
                    <th className="px-4 py-3 text-left text-xs font-medium text-gray-500 uppercase">
                      Teléfonos
                    </th>
                    <th className="px-4 py-3 text-left text-xs font-medium text-gray-500 uppercase">
                      Dirección
                    </th>
                    <th className="px-4 py-3 text-left text-xs font-medium text-gray-500 uppercase">
                      Correo Electrónico
                    </th>
                    <th className="px-4 py-3 text-left text-xs font-medium text-gray-500 uppercase">
                      Saldo
                    </th>
                  </tr>
                </thead>
                <tbody className="bg-white divide-y divide-gray-200">
                  {clientesActuales.map((cliente) => (
                    <tr key={cliente.id} className="hover:bg-gray-50">
                      <td className="px-4 py-3 whitespace-nowrap">
                        <input
                          type="checkbox"
                          checked={selectedIds.has(cliente.id)}
                          onChange={() => toggleSelectOne(cliente.id)}
                        />
                      </td>
                      <td className="px-4 py-3 whitespace-nowrap">
                        <div className="flex gap-2">
                          <button
                            onClick={() => navigate(`/clientes/editar/${cliente.id}`)}
                            className="text-blue-600 hover:text-blue-800"
                            title="Editar"
                          >
                            <FaEdit />
                          </button>
                          <button
                            onClick={() => eliminarCliente(cliente.id)}
                            className="text-red-600 hover:text-red-800"
                            title="Eliminar"
                          >
                            <FaTrash />
                          </button>
                          {cliente.saldo_calculado === undefined && (
                            <button
                              onClick={() => calcularSaldoIndividual(cliente.id)}
                              className="text-green-600 hover:text-green-800"
                              title="Calcular saldo"
                            >
                              <FaCalculator size={14} />
                            </button>
                          )}
                        </div>
                      </td>
                      <td className="px-4 py-3 whitespace-nowrap">
                        <div className="text-sm font-medium text-gray-900">
                          {cliente.nombre} {cliente.apellido}
                        </div>
                      </td>
                      <td className="px-4 py-3 whitespace-nowrap text-sm text-gray-900">
                        {cliente.dni_cuit || '-'}
                      </td>
                      <td className="px-4 py-3 whitespace-nowrap text-sm">
                        {formatearTelefono(cliente.telefono)}
                      </td>
                      <td className="px-4 py-3 text-sm text-gray-900">
                        {cliente.direccion || '-'}
                      </td>
                      <td className="px-4 py-3 whitespace-nowrap text-sm text-gray-900">
                        {cliente.email || '-'}
                      </td>
                      <td className="px-4 py-3 whitespace-nowrap text-sm font-medium">
                        {cliente.saldo_calculado !== undefined ? (
                          <span className={`${
                            cliente.saldo_calculado > 0 
                              ? 'text-red-600' 
                              : cliente.saldo_calculado < 0 
                                ? 'text-green-600' 
                                : 'text-gray-600'
                          }`}>
                            {cliente.saldo_calculado > 0 && '-'}
                            {formatearMoneda(Math.abs(cliente.saldo_calculado))}
                          </span>
                        ) : (
                          <span className="text-gray-400 text-xs italic">
                            Click "Calcular Saldos"
                          </span>
                        )}
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
            
            {/* Paginación */}
            <div className="flex justify-between items-center mt-4">
              <div className="text-sm text-gray-700">
                Mostrando {indexOfFirstCliente + 1} a {Math.min(indexOfLastCliente, clientesFiltrados.length)} de {clientesFiltrados.length} registros
              </div>
              
              <div className="flex gap-2">
                <button
                  onClick={() => setPaginaActual(prev => Math.max(prev - 1, 1))}
                  disabled={paginaActual === 1}
                  className="px-3 py-1 border rounded text-sm disabled:opacity-50"
                >
                  <FaChevronLeft />
                </button>
                
                {[...Array(Math.min(totalPaginas, 5))].map((_, index) => {
                  const pageNumber = index + 1;
                  return (
                    <button
                      key={pageNumber}
                      onClick={() => setPaginaActual(pageNumber)}
                      className={`px-3 py-1 border rounded text-sm ${
                        paginaActual === pageNumber 
                          ? 'bg-blue-500 text-white' 
                          : 'hover:bg-gray-100'
                      }`}
                    >
                      {pageNumber}
                    </button>
                  );
                })}
                
                <button
                  onClick={() => setPaginaActual(prev => Math.min(prev + 1, totalPaginas))}
                  disabled={paginaActual === totalPaginas}
                  className="px-3 py-1 border rounded text-sm disabled:opacity-50"
                >
                  <FaChevronRight />
                </button>
              </div>
            </div>
          </>
        )}
      </Card>

      {/* 🆕 NUEVO: Diálogo de importación */}
      <ImportacionExcel
        isOpen={showImportDialog}
        onClose={() => setShowImportDialog(false)}
        onImportar={cargarClientes}
      />
    </div>
  );
};

export default Clientes;