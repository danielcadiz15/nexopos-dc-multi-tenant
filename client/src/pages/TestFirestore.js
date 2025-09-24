import React, { useEffect } from 'react';
import { db } from '../config/firebase';

const TestFirestore = () => {
  useEffect(() => {
    const obtenerEjemplos = async () => {
      try {
        console.log('=== EJEMPLO DE VENTA ===');
        const ventasSnapshot = await db.collection('ventas')
          .limit(1)
          .get();
        
        if (!ventasSnapshot.empty) {
          const venta = ventasSnapshot.docs[0];
          console.log('ID:', venta.id);
          console.log('Datos:', venta.data());
        } else {
          console.log('No hay ventas');
        }
        
        console.log('\n=== EJEMPLO DE COMPRA ===');
        const comprasSnapshot = await db.collection('compras')
          .limit(1)
          .get();
        
        if (!comprasSnapshot.empty) {
          const compra = comprasSnapshot.docs[0];
          console.log('ID:', compra.id);
          console.log('Datos:', compra.data());
        } else {
          console.log('No hay compras');
        }
        
        console.log('\n=== EJEMPLO DE PRODUCTO ===');
        const productosSnapshot = await db.collection('productos')
          .where('activo', '==', true)
          .limit(1)
          .get();
        
        if (!productosSnapshot.empty) {
          const producto = productosSnapshot.docs[0];
          console.log('ID:', producto.id);
          console.log('Datos:', producto.data());
        } else {
          console.log('No hay productos');
        }
        
        console.log('\n=== MÉTODOS DE PAGO USADOS ===');
        const metodosPago = new Set();
        const ventasMetodosSnapshot = await db.collection('ventas')
          .limit(20)
          .get();
        
        ventasMetodosSnapshot.forEach(doc => {
          const metodo = doc.data().metodo_pago;
          if (metodo) metodosPago.add(metodo);
        });
        
        console.log('Métodos encontrados:', Array.from(metodosPago));
        
        console.log('\n=== CATEGORÍAS DE PRODUCTOS ===');
        const categorias = new Set();
        const productosCategSnapshot = await db.collection('productos')
          .where('activo', '==', true)
          .limit(50)
          .get();
        
        productosCategSnapshot.forEach(doc => {
          const cat = doc.data().categoria_id;
          if (cat) categorias.add(cat);
        });
        
        console.log('Categorías encontradas:', Array.from(categorias));
        
      } catch (error) {
        console.error('Error:', error);
      }
    };
    
    obtenerEjemplos();
  }, []);
  
  return <div>Ver consola para resultados...</div>;
};

export default TestFirestore;