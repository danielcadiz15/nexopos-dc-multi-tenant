import React, { useState, useEffect } from 'react';
import { FaSearch, FaPlus, FaMinus, FaTrash, FaPrint, FaCreditCard } from 'react-icons/fa';

const MobilePuntoVenta = () => {
  const [productos, setProductos] = useState([]);
  const [carrito, setCarrito] = useState([]);
  const [busqueda, setBusqueda] = useState('');
  const [productoSeleccionado, setProductoSeleccionado] = useState(null);
  const [cantidad, setCantidad] = useState(1);

  // Simulación de productos
  const productosEjemplo = [
    { id: 1, nombre: 'Arroz', precio: 2.50, stock: 100 },
    { id: 2, nombre: 'Aceite', precio: 3.20, stock: 50 },
    { id: 3, nombre: 'Azúcar', precio: 1.80, stock: 75 },
    { id: 4, nombre: 'Leche', precio: 2.10, stock: 30 },
    { id: 5, nombre: 'Pan', precio: 0.80, stock: 200 },
  ];

  useEffect(() => {
    setProductos(productosEjemplo);
  }, []);

  const agregarAlCarrito = () => {
    if (!productoSeleccionado) return;

    const itemExistente = carrito.find(item => item.id === productoSeleccionado.id);
    
    if (itemExistente) {
      setCarrito(carrito.map(item => 
        item.id === productoSeleccionado.id 
          ? { ...item, cantidad: item.cantidad + cantidad }
          : item
      ));
    } else {
      setCarrito([...carrito, { ...productoSeleccionado, cantidad }]);
    }

    setProductoSeleccionado(null);
    setCantidad(1);
  };

  const removerDelCarrito = (id) => {
    setCarrito(carrito.filter(item => item.id !== id));
  };

  const actualizarCantidad = (id, nuevaCantidad) => {
    if (nuevaCantidad <= 0) {
      removerDelCarrito(id);
      return;
    }
    
    setCarrito(carrito.map(item => 
      item.id === id ? { ...item, cantidad: nuevaCantidad } : item
    ));
  };

  const calcularTotal = () => {
    return carrito.reduce((total, item) => total + (item.precio * item.cantidad), 0);
  };

  const finalizarVenta = () => {
    // Aquí iría la lógica para finalizar la venta
    alert('Venta finalizada');
    setCarrito([]);
  };

  const productosFiltrados = productos.filter(producto =>
    producto.nombre.toLowerCase().includes(busqueda.toLowerCase())
  );

  return (
    <div className="h-screen flex flex-col">
      {/* Header */}
      <div className="bg-blue-600 text-white p-4">
        <h1 className="text-xl font-bold">Punto de Venta</h1>
        <div className="mt-2 relative">
          <input
            type="text"
            placeholder="Buscar productos..."
            value={busqueda}
            onChange={(e) => setBusqueda(e.target.value)}
            className="w-full p-2 pl-10 rounded-lg text-gray-800"
          />
          <FaSearch className="absolute left-3 top-3 text-gray-400" />
        </div>
      </div>

      <div className="flex-1 flex">
        {/* Lista de Productos */}
        <div className="flex-1 p-4 overflow-y-auto">
          <div className="grid grid-cols-2 gap-3">
            {productosFiltrados.map(producto => (
              <div
                key={producto.id}
                onClick={() => setProductoSeleccionado(producto)}
                className={`bg-white p-3 rounded-lg shadow cursor-pointer border-2 ${
                  productoSeleccionado?.id === producto.id ? 'border-blue-500' : 'border-gray-200'
                }`}
              >
                <h3 className="font-semibold text-sm">{producto.nombre}</h3>
                <p className="text-green-600 font-bold">${producto.precio}</p>
                <p className="text-xs text-gray-500">Stock: {producto.stock}</p>
              </div>
            ))}
          </div>
        </div>

        {/* Carrito */}
        <div className="w-80 bg-gray-100 p-4 flex flex-col">
          <h2 className="text-lg font-bold mb-4">Carrito</h2>
          
          {/* Producto Seleccionado */}
          {productoSeleccionado && (
            <div className="bg-white p-3 rounded-lg mb-4">
              <h3 className="font-semibold">{productoSeleccionado.nombre}</h3>
              <p className="text-green-600 font-bold">${productoSeleccionado.precio}</p>
              <div className="flex items-center justify-between mt-2">
                <div className="flex items-center space-x-2">
                  <button
                    onClick={() => setCantidad(Math.max(1, cantidad - 1))}
                    className="bg-gray-200 p-1 rounded"
                  >
                    <FaMinus className="text-xs" />
                  </button>
                  <span className="w-8 text-center">{cantidad}</span>
                  <button
                    onClick={() => setCantidad(cantidad + 1)}
                    className="bg-gray-200 p-1 rounded"
                  >
                    <FaPlus className="text-xs" />
                  </button>
                </div>
                <button
                  onClick={agregarAlCarrito}
                  className="bg-blue-500 text-white px-3 py-1 rounded text-sm"
                >
                  Agregar
                </button>
              </div>
            </div>
          )}

          {/* Items del Carrito */}
          <div className="flex-1 overflow-y-auto">
            {carrito.map(item => (
              <div key={item.id} className="bg-white p-3 rounded-lg mb-2">
                <div className="flex justify-between items-start">
                  <div className="flex-1">
                    <h3 className="font-semibold text-sm">{item.nombre}</h3>
                    <p className="text-green-600 font-bold">${item.precio}</p>
                  </div>
                  <button
                    onClick={() => removerDelCarrito(item.id)}
                    className="text-red-500 ml-2"
                  >
                    <FaTrash />
                  </button>
                </div>
                <div className="flex items-center justify-between mt-2">
                  <div className="flex items-center space-x-2">
                    <button
                      onClick={() => actualizarCantidad(item.id, item.cantidad - 1)}
                      className="bg-gray-200 p-1 rounded"
                    >
                      <FaMinus className="text-xs" />
                    </button>
                    <span className="w-8 text-center">{item.cantidad}</span>
                    <button
                      onClick={() => actualizarCantidad(item.id, item.cantidad + 1)}
                      className="bg-gray-200 p-1 rounded"
                    >
                      <FaPlus className="text-xs" />
                    </button>
                  </div>
                  <span className="font-bold">${(item.precio * item.cantidad).toFixed(2)}</span>
                </div>
              </div>
            ))}
          </div>

          {/* Total y Botones */}
          <div className="mt-4">
            <div className="bg-white p-3 rounded-lg mb-3">
              <div className="flex justify-between text-lg font-bold">
                <span>Total:</span>
                <span>${calcularTotal().toFixed(2)}</span>
              </div>
            </div>
            
            <div className="grid grid-cols-2 gap-2">
              <button
                onClick={finalizarVenta}
                disabled={carrito.length === 0}
                className="bg-green-500 text-white p-3 rounded-lg font-semibold disabled:bg-gray-300"
              >
                <FaCreditCard className="inline mr-2" />
                Cobrar
              </button>
              <button className="bg-blue-500 text-white p-3 rounded-lg font-semibold">
                <FaPrint className="inline mr-2" />
                Ticket
              </button>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
};

export default MobilePuntoVenta; 