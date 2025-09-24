import React, { useState, useEffect } from 'react';
import Button from '../../components/common/Button';
import Spinner from '../../components/common/Spinner';
import { FaPlus, FaMoneyBill, FaMinus, FaCalendarAlt, FaTrash, FaCheck, FaTimes, FaCalculator, FaEye } from 'react-icons/fa';
import { toast } from 'react-toastify';
import { useAuth } from '../../contexts/AuthContext';

// URL de Firebase Functions - ajustar según tu proyecto
const API_URL = process.env.REACT_APP_API_URL || 'https://api-5q2i5764zq-uc.a.run.app';

const Caja = () => {
  const { orgId, getAccessToken } = useAuth();
  const [fecha, setFecha] = useState(() => new Date().toISOString().slice(0, 10));
  const [movimientos, setMovimientos] = useState([]);
  const [resumen, setResumen] = useState({ ingresos: 0, egresos: 0, saldo: 0 });
  const [saldoAcumulado, setSaldoAcumulado] = useState(0);
  const [loading, setLoading] = useState(false);
  const [form, setForm] = useState({ tipo: 'ingreso', monto: '', concepto: '', observaciones: '' });
  const [agregando, setAgregando] = useState(false);
  const [eliminando, setEliminando] = useState(null);
  const [modoVista, setModoVista] = useState('diario'); // 'diario' o 'acumulado'
  const [verificandoSaldo, setVerificandoSaldo] = useState(false);
  const [saldoFisico, setSaldoFisico] = useState('');
  const [mostrarVerificacion, setMostrarVerificacion] = useState(false);

  // Cargar movimientos y resumen al cambiar la fecha o orgId
  useEffect(() => {
    if (!orgId) return; // No cargar si no hay orgId
    
    console.log('💰 [FRONTEND] Fecha actual en el componente:', fecha, 'orgId:', orgId);
    if (modoVista === 'diario') {
      cargarMovimientos();
      cargarResumen();
    } else {
      cargarMovimientosAcumulados();
      cargarSaldoAcumulado();
    }
    // eslint-disable-next-line
  }, [fecha, modoVista, orgId]);

  const cargarMovimientos = async () => {
    if (!orgId) {
      console.warn('💰 [FRONTEND] No hay orgId disponible');
      return;
    }
    
    setLoading(true);
    try {
      console.log('💰 [FRONTEND] Cargando movimientos para fecha:', fecha, 'orgId:', orgId);
      const token = await getAccessToken();
      const res = await fetch(`${API_URL}/caja/movimientos?fecha=${fecha}&orgId=${orgId}`, {
        headers: {
          'Authorization': `Bearer ${token}`,
          'Content-Type': 'application/json'
        }
      });
      console.log('💰 [FRONTEND] Respuesta de movimientos:', res.status, res.ok);
      
      if (!res.ok) throw new Error('Error al cargar movimientos');
      
      const data = await res.json();
      console.log('💰 [FRONTEND] Datos de movimientos:', data);
      
      setMovimientos(data.data || []);
    } catch (e) {
      console.error('❌ [FRONTEND] Error cargando movimientos:', e);
      toast.error('Error al cargar movimientos');
      setMovimientos([]);
    } finally {
      setLoading(false);
    }
  };

  const cargarMovimientosAcumulados = async () => {
    if (!orgId) {
      console.warn('💰 [FRONTEND] No hay orgId disponible');
      return;
    }
    
    setLoading(true);
    try {
      console.log('💰 [FRONTEND] Cargando movimientos acumulados para orgId:', orgId);
      const token = await getAccessToken();
      const res = await fetch(`${API_URL}/caja/movimientos-acumulados?orgId=${orgId}`, {
        headers: {
          'Authorization': `Bearer ${token}`,
          'Content-Type': 'application/json'
        }
      });
      console.log('💰 [FRONTEND] Respuesta de movimientos acumulados:', res.status, res.ok);
      
      if (!res.ok) throw new Error('Error al cargar movimientos acumulados');
      
      const data = await res.json();
      console.log('💰 [FRONTEND] Datos de movimientos acumulados:', data);
      
      setMovimientos(data.data || []);
    } catch (e) {
      console.error('❌ [FRONTEND] Error cargando movimientos acumulados:', e);
      toast.error('Error al cargar movimientos acumulados');
      setMovimientos([]);
    } finally {
      setLoading(false);
    }
  };

  const cargarSaldoAcumulado = async () => {
    if (!orgId) {
      console.warn('💰 [FRONTEND] No hay orgId disponible');
      return;
    }
    
    try {
      console.log('💰 [FRONTEND] Cargando saldo acumulado para orgId:', orgId);
      const token = await getAccessToken();
      const res = await fetch(`${API_URL}/caja/saldo-acumulado?orgId=${orgId}`, {
        headers: {
          'Authorization': `Bearer ${token}`,
          'Content-Type': 'application/json'
        }
      });
      console.log('💰 [FRONTEND] Respuesta de saldo acumulado:', res.status, res.ok);
      
      if (!res.ok) throw new Error('Error al cargar saldo acumulado');
      
      const data = await res.json();
      console.log('💰 [FRONTEND] Datos de saldo acumulado:', data);
      
      setSaldoAcumulado(data.saldoAcumulado || 0);
    } catch (e) {
      console.error('❌ [FRONTEND] Error cargando saldo acumulado:', e);
      setSaldoAcumulado(0);
    }
  };

  const verificarSaldoFisico = async () => {
    if (!saldoFisico || isNaN(parseFloat(saldoFisico))) {
      toast.warning('Ingresa un monto válido para el saldo físico');
      return;
    }

    setVerificandoSaldo(true);
    try {
      console.log('💰 [FRONTEND] Verificando saldo físico:', saldoFisico);
      
      const token = await getAccessToken();
      const res = await fetch(`${API_URL}/caja/verificar-saldo?orgId=${orgId}`, {
        method: 'POST',
        headers: { 
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${token}`
        },
        body: JSON.stringify({ saldoFisico: parseFloat(saldoFisico) })
      });
      
      console.log('💰 [FRONTEND] Respuesta de verificación:', res.status, res.ok);
      
      if (!res.ok) throw new Error('Error al verificar saldo');
      
      const data = await res.json();
      console.log('💰 [FRONTEND] Datos de verificación:', data);
      
      if (data.coinciden) {
        toast.success('✅ Saldo físico coincide con el sistema');
      } else {
        toast.warning(`⚠️ Diferencia encontrada: $${data.diferencia.toFixed(2)}`);
      }
      
      setMostrarVerificacion(false);
      setSaldoFisico('');
      
    } catch (e) {
      console.error('❌ [FRONTEND] Error verificando saldo:', e);
      toast.error('Error al verificar saldo');
    } finally {
      setVerificandoSaldo(false);
    }
  };

  const cargarResumen = async () => {
    try {
      console.log('💰 [FRONTEND] Cargando resumen para fecha:', fecha);
      const token = await getAccessToken();
      const res = await fetch(`${API_URL}/caja/resumen?fecha=${fecha}&orgId=${orgId}`, {
        headers: {
          'Authorization': `Bearer ${token}`,
          'Content-Type': 'application/json'
        }
      });
      console.log('💰 [FRONTEND] Respuesta de resumen:', res.status, res.ok);
      
      if (!res.ok) throw new Error('Error al cargar resumen');
      
      const data = await res.json();
      console.log('💰 [FRONTEND] Datos de resumen:', data);
      
      setResumen({ ingresos: data.ingresos || 0, egresos: data.egresos || 0, saldo: data.saldo || 0 });
    } catch (e) {
      console.error('❌ [FRONTEND] Error cargando resumen:', e);
      setResumen({ ingresos: 0, egresos: 0, saldo: 0 });
    }
  };

  const handleFormChange = e => {
    const { name, value } = e.target;
    setForm(f => ({ ...f, [name]: value }));
  };

  const handleAgregar = async e => {
    e.preventDefault();
    if (!form.monto || !form.concepto) {
      toast.warning('Completa todos los campos obligatorios');
      return;
    }
    
    setAgregando(true);
    try {
      console.log('💰 [FRONTEND] Agregando movimiento:', form);
      
      const token = await getAccessToken();
      const res = await fetch(`${API_URL}/caja/movimiento?orgId=${orgId}`, {
        method: 'POST',
        headers: { 
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${token}`
        },
        body: JSON.stringify({ ...form, monto: parseFloat(form.monto), fecha })
      });
      
      console.log('💰 [FRONTEND] Respuesta de agregar:', res.status, res.ok);
      
      if (!res.ok) throw new Error('Error al agregar movimiento');
      
      const responseData = await res.json();
      console.log('💰 [FRONTEND] Datos de respuesta:', responseData);
      
      toast.success(`${form.tipo === 'ingreso' ? 'Ingreso' : 'Egreso'} agregado correctamente`);
      setForm({ tipo: 'ingreso', monto: '', concepto: '', observaciones: '' });
      
      if (modoVista === 'diario') {
        await cargarMovimientos();
        await cargarResumen();
      } else {
        await cargarMovimientosAcumulados();
        await cargarSaldoAcumulado();
      }
    } catch (e) {
      console.error('❌ [FRONTEND] Error agregando movimiento:', e);
      toast.error('Error al agregar movimiento');
    } finally {
      setAgregando(false);
    }
  };

  const handleEliminar = async (movimientoId) => {
    if (!window.confirm('¿Estás seguro de eliminar este movimiento?')) return;
    
    setEliminando(movimientoId);
    try {
      const token = await getAccessToken();
      const res = await fetch(`${API_URL}/caja/movimiento/${movimientoId}?orgId=${orgId}`, {
        method: 'DELETE',
        headers: {
          'Authorization': `Bearer ${token}`,
          'Content-Type': 'application/json'
        }
      });
      
      if (!res.ok) throw new Error('Error al eliminar movimiento');
      
      toast.success('Movimiento eliminado correctamente');
      
      if (modoVista === 'diario') {
        await cargarMovimientos();
        await cargarResumen();
      } else {
        await cargarMovimientosAcumulados();
        await cargarSaldoAcumulado();
      }
    } catch (e) {
      console.error('Error eliminando movimiento:', e);
      toast.error('Error al eliminar movimiento');
    } finally {
      setEliminando(null);
    }
  };

  return (
    <div className="max-w-6xl mx-auto p-4">
      {/* Header */}
      <div className="mb-6">
        <h1 className="text-3xl font-bold text-gray-800 flex items-center gap-3">
          <FaMoneyBill className="text-green-600" /> Caja Chica
        </h1>
        <p className="text-gray-600 mt-1">Gestión de ingresos y egresos continuos</p>
      </div>

      {/* Selector de modo de vista */}
      <div className="mb-6">
        <div className="flex items-center gap-4">
          <div className="flex bg-gray-100 rounded-lg p-1">
            <button
              onClick={() => setModoVista('diario')}
              className={`px-4 py-2 rounded-md text-sm font-medium transition-colors ${
                modoVista === 'diario'
                  ? 'bg-white text-blue-600 shadow-sm'
                  : 'text-gray-600 hover:text-gray-800'
              }`}
            >
              Vista Diaria
            </button>
            <button
              onClick={() => setModoVista('acumulado')}
              className={`px-4 py-2 rounded-md text-sm font-medium transition-colors ${
                modoVista === 'acumulado'
                  ? 'bg-white text-blue-600 shadow-sm'
                  : 'text-gray-600 hover:text-gray-800'
              }`}
            >
              Caja Chica (Acumulado)
            </button>
          </div>
          
          {modoVista === 'acumulado' && (
            <button
              onClick={() => setMostrarVerificacion(true)}
              className="flex items-center gap-2 px-4 py-2 bg-yellow-500 text-white rounded-lg hover:bg-yellow-600 transition-colors"
            >
              <FaCalculator />
              Verificar Saldo Físico
            </button>
          )}
        </div>
      </div>

      {/* Selector de fecha - Solo en modo diario */}
      {modoVista === 'diario' && (
        <div className="mb-6">
          <label className="block text-sm font-medium text-gray-700 mb-2">Fecha a consultar</label>
          <div className="flex items-center gap-3">
            <FaCalendarAlt className="text-gray-400" />
            <input 
              type="date" 
              value={fecha} 
              onChange={e => setFecha(e.target.value)} 
              className="border border-gray-300 rounded-lg px-4 py-2 focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
            />
          </div>
        </div>
      )}

      {/* Resumen */}
      {modoVista === 'diario' ? (
        <div className="grid grid-cols-1 md:grid-cols-3 gap-4 mb-8">
          <div className="bg-gradient-to-r from-green-50 to-green-100 border border-green-200 rounded-lg p-6 shadow-sm">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-green-600 text-sm font-medium">Ingresos del día</p>
                <p className="text-green-800 text-2xl font-bold">+${resumen.ingresos.toFixed(2)}</p>
              </div>
              <FaPlus className="text-green-500 text-xl" />
            </div>
          </div>
          
          <div className="bg-gradient-to-r from-red-50 to-red-100 border border-red-200 rounded-lg p-6 shadow-sm">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-red-600 text-sm font-medium">Egresos del día</p>
                <p className="text-red-800 text-2xl font-bold">-${resumen.egresos.toFixed(2)}</p>
              </div>
              <FaMinus className="text-red-500 text-xl" />
            </div>
          </div>
          
          <div className={`rounded-lg p-6 shadow-sm border ${
            resumen.saldo >= 0 
              ? 'bg-gradient-to-r from-blue-50 to-blue-100 border-blue-200' 
              : 'bg-gradient-to-r from-yellow-50 to-yellow-100 border-yellow-200'
          }`}>
            <div className="flex items-center justify-between">
              <div>
                <p className="text-gray-600 text-sm font-medium">Saldo del día</p>
                <p className={`text-2xl font-bold ${resumen.saldo >= 0 ? 'text-blue-800' : 'text-yellow-800'}`}>
                  {resumen.saldo >= 0 ? '+' : ''}${resumen.saldo.toFixed(2)}
                </p>
              </div>
              <FaMoneyBill className={`text-xl ${resumen.saldo >= 0 ? 'text-blue-500' : 'text-yellow-500'}`} />
            </div>
          </div>
        </div>
      ) : (
        <div className="grid grid-cols-1 md:grid-cols-2 gap-4 mb-8">
          <div className="bg-gradient-to-r from-purple-50 to-purple-100 border border-purple-200 rounded-lg p-6 shadow-sm">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-purple-600 text-sm font-medium">Saldo Acumulado</p>
                <p className={`text-3xl font-bold ${saldoAcumulado >= 0 ? 'text-purple-800' : 'text-red-800'}`}>
                  {saldoAcumulado >= 0 ? '+' : ''}${saldoAcumulado.toFixed(2)}
                </p>
                <p className="text-purple-600 text-xs mt-1">Total en caja chica</p>
              </div>
              <FaMoneyBill className="text-purple-500 text-2xl" />
            </div>
          </div>
          
          <div className="bg-gradient-to-r from-orange-50 to-orange-100 border border-orange-200 rounded-lg p-6 shadow-sm">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-orange-600 text-sm font-medium">Movimientos</p>
                <p className="text-orange-800 text-2xl font-bold">{movimientos.length}</p>
                <p className="text-orange-600 text-xs mt-1">Total registrados</p>
              </div>
              <FaEye className="text-orange-500 text-2xl" />
            </div>
          </div>
        </div>
      )}

      {/* Formulario de agregar movimiento */}
      <div className="bg-white rounded-lg shadow-lg p-6 mb-8">
        <h2 className="text-xl font-semibold text-gray-800 mb-4 flex items-center gap-2">
          <FaPlus className="text-blue-500" />
          Agregar Movimiento
        </h2>
        
        <form onSubmit={handleAgregar} className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-5 gap-4 items-end">
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">Tipo</label>
            <select 
              name="tipo" 
              value={form.tipo} 
              onChange={handleFormChange} 
              className="w-full border border-gray-300 rounded-lg px-3 py-2 focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
            >
              <option value="ingreso">Ingreso</option>
              <option value="egreso">Egreso</option>
            </select>
          </div>
          
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">Monto</label>
            <input 
              name="monto" 
              type="number" 
              step="0.01" 
              min="0" 
              value={form.monto} 
              onChange={handleFormChange} 
              placeholder="0.00" 
              className="w-full border border-gray-300 rounded-lg px-3 py-2 focus:ring-2 focus:ring-blue-500 focus:border-blue-500" 
              required 
            />
          </div>
          
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">Concepto</label>
            <input 
              name="concepto" 
              value={form.concepto} 
              onChange={handleFormChange} 
              placeholder="Descripción del movimiento" 
              className="w-full border border-gray-300 rounded-lg px-3 py-2 focus:ring-2 focus:ring-blue-500 focus:border-blue-500" 
              required 
            />
          </div>
          
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">Observaciones</label>
            <input 
              name="observaciones" 
              value={form.observaciones} 
              onChange={handleFormChange} 
              placeholder="Opcional" 
              className="w-full border border-gray-300 rounded-lg px-3 py-2 focus:ring-2 focus:ring-blue-500 focus:border-blue-500" 
            />
          </div>
          
          <div>
            <Button 
              color={form.tipo === 'ingreso' ? 'green' : 'red'} 
              type="submit" 
              loading={agregando} 
              icon={<FaPlus />}
              className="w-full"
            >
              {agregando ? 'Agregando...' : 'Agregar'}
            </Button>
          </div>
        </form>
      </div>

      {/* Tabla de movimientos */}
      <div className="bg-white rounded-lg shadow-lg p-6">
        <h2 className="text-xl font-semibold text-gray-800 mb-4">
          {modoVista === 'diario' ? 'Movimientos del día' : 'Movimientos de Caja Chica'}
        </h2>
        
        {loading ? (
          <div className="flex justify-center py-8">
            <Spinner />
          </div>
        ) : movimientos.length === 0 ? (
          <div className="text-center py-8">
            <FaMoneyBill className="mx-auto text-gray-300 text-4xl mb-4" />
            <p className="text-gray-500 text-lg">No hay movimientos para esta fecha</p>
            <p className="text-gray-400 text-sm">Agrega el primer movimiento usando el formulario de arriba</p>
          </div>
        ) : (
          <div className="overflow-x-auto">
            <table className="w-full text-sm">
              <thead>
                <tr className="bg-gray-50 border-b border-gray-200">
                  <th className="p-3 text-left font-medium text-gray-700">Hora</th>
                  <th className="p-3 text-left font-medium text-gray-700">Tipo</th>
                  <th className="p-3 text-right font-medium text-gray-700">Monto</th>
                  <th className="p-3 text-left font-medium text-gray-700">Concepto</th>
                  <th className="p-3 text-left font-medium text-gray-700">Observaciones</th>
                  <th className="p-3 text-center font-medium text-gray-700">Acciones</th>
                </tr>
              </thead>
              <tbody>
                {movimientos.map(mov => (
                  <tr key={mov.id} className={`border-b border-gray-100 hover:bg-gray-50 transition-colors ${
                    mov.tipo === 'ingreso' ? 'bg-green-50' : 'bg-red-50'
                  }`}>
                    <td className="p-3 text-gray-600">
                      {new Date(mov.fecha).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}
                    </td>
                    <td className="p-3">
                      <span className={`inline-flex items-center px-2 py-1 rounded-full text-xs font-medium ${
                        mov.tipo === 'ingreso' 
                          ? 'bg-green-100 text-green-800' 
                          : 'bg-red-100 text-red-800'
                      }`}>
                        {mov.tipo === 'ingreso' ? <FaPlus className="mr-1" /> : <FaMinus className="mr-1" />}
                        {mov.tipo === 'ingreso' ? 'Ingreso' : 'Egreso'}
                      </span>
                    </td>
                    <td className="p-3 text-right font-mono font-semibold">
                      <span className={mov.tipo === 'ingreso' ? 'text-green-600' : 'text-red-600'}>
                        {mov.tipo === 'ingreso' ? '+' : '-'}${parseFloat(mov.monto).toFixed(2)}
                      </span>
                    </td>
                    <td className="p-3 text-gray-800 font-medium">{mov.concepto}</td>
                    <td className="p-3 text-gray-600">{mov.observaciones || '-'}</td>
                    <td className="p-3 text-center">
                      <button
                        onClick={() => handleEliminar(mov.id)}
                        disabled={eliminando === mov.id}
                        className="text-red-500 hover:text-red-700 disabled:opacity-50 disabled:cursor-not-allowed p-1 rounded hover:bg-red-50 transition-colors"
                        title="Eliminar movimiento"
                      >
                        {eliminando === mov.id ? <Spinner size="sm" /> : <FaTrash />}
                      </button>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
      </div>

      {/* Modal de verificación de saldo físico */}
      {mostrarVerificacion && (
        <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50">
          <div className="bg-white rounded-lg p-6 w-full max-w-md mx-4">
            <h3 className="text-lg font-semibold text-gray-800 mb-4 flex items-center gap-2">
              <FaCalculator className="text-yellow-500" />
              Verificar Saldo Físico
            </h3>
            
            <p className="text-gray-600 mb-4">
              Ingresa el monto que hay físicamente en la caja chica para comparar con el saldo del sistema.
            </p>
            
            <div className="mb-4">
              <label className="block text-sm font-medium text-gray-700 mb-2">Saldo Físico</label>
              <input
                type="number"
                step="0.01"
                min="0"
                value={saldoFisico}
                onChange={(e) => setSaldoFisico(e.target.value)}
                placeholder="0.00"
                className="w-full border border-gray-300 rounded-lg px-3 py-2 focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
              />
            </div>
            
            <div className="flex gap-3">
              <button
                onClick={() => {
                  setMostrarVerificacion(false);
                  setSaldoFisico('');
                }}
                className="flex-1 px-4 py-2 border border-gray-300 text-gray-700 rounded-lg hover:bg-gray-50 transition-colors"
              >
                Cancelar
              </button>
              <button
                onClick={verificarSaldoFisico}
                disabled={verificandoSaldo}
                className="flex-1 px-4 py-2 bg-yellow-500 text-white rounded-lg hover:bg-yellow-600 disabled:opacity-50 disabled:cursor-not-allowed transition-colors"
              >
                {verificandoSaldo ? <Spinner size="sm" /> : 'Verificar'}
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};

export default Caja;