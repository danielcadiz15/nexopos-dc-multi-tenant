import React, { useEffect, useState } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import stockSucursalService from '../../services/stock-sucursal.service';
import Spinner from '../../components/common/Spinner';
import { FaArrowLeft } from 'react-icons/fa';
import { toast } from 'react-toastify';

const MovimientosProducto = () => {
  const { productoId } = useParams();
  const navigate = useNavigate();
  const [movimientos, setMovimientos] = useState([]);
  const [loading, setLoading] = useState(true);
  const [producto, setProducto] = useState(null);

  useEffect(() => {
    const cargarMovimientos = async () => {
      setLoading(true);
      try {
        // Obtener movimientos del producto
        const resp = await stockSucursalService.obtenerMovimientosPorProducto(productoId);
        setMovimientos(resp.movimientos || []);
        setProducto(resp.producto || null);
      } catch (error) {
        toast.error('Error al cargar movimientos');
      } finally {
        setLoading(false);
      }
    };
    cargarMovimientos();
  }, [productoId]);

  return (
    <div className="p-6 max-w-4xl mx-auto">
      <div className="flex items-center mb-4">
        <button onClick={() => navigate(-1)} className="mr-4 text-gray-600 hover:text-gray-900">
          <FaArrowLeft />
        </button>
        <h2 className="text-2xl font-bold">Historial de movimientos</h2>
      </div>
      {producto && (
        <div className="mb-4 p-3 bg-gray-100 rounded">
          <span className="font-semibold">Producto:</span> {producto.nombre ? producto.nombre : productoId} <br/>
          <span className="font-semibold">Código:</span> {producto.codigo || '-'}
        </div>
      )}
      {loading ? (
        <Spinner />
      ) : movimientos.length === 0 ? (
        <div className="text-center text-gray-500">No hay movimientos registrados para este producto.</div>
      ) : (
        <div className="overflow-x-auto">
          <table className="min-w-full border">
            <thead>
              <tr className="bg-gray-200">
                <th className="px-3 py-2 border">Fecha</th>
                <th className="px-3 py-2 border">Tipo</th>
                <th className="px-3 py-2 border">Cantidad</th>
                <th className="px-3 py-2 border">Usuario</th>
                <th className="px-3 py-2 border">Motivo</th>
              </tr>
            </thead>
            <tbody>
              {movimientos.map((mov, idx) => (
                <tr key={idx} className="border-b hover:bg-gray-50">
                  <td className="px-3 py-2 border">{mov.fecha ? new Date(mov.fecha._seconds * 1000).toLocaleString() : '-'}</td>
                  <td className="px-3 py-2 border">{mov.tipo || '-'}</td>
                  <td className="px-3 py-2 border text-right">{mov.cantidad}</td>
                  <td className="px-3 py-2 border">{mov.usuario_nombre || mov.usuario_id || '-'}</td>
                  <td className="px-3 py-2 border">{mov.motivo || '-'}</td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}
    </div>
  );
};

export default MovimientosProducto; 