import React from 'react';
import Card from '../../components/common/Card';
import { FaUndo } from 'react-icons/fa';

const Devoluciones = () => {
  return (
    <div className="space-y-6">
      <h1 className="text-2xl font-bold text-gray-800">Gestión de Devoluciones</h1>
      <Card>
        <div className="text-center py-12">
          <FaUndo className="mx-auto h-16 w-16 text-gray-400 mb-4" />
          <p className="text-gray-500">Módulo de Devoluciones - En desarrollo</p>
        </div>
      </Card>
    </div>
  );
};

export default Devoluciones;