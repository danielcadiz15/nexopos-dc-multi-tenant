import React from 'react';
import Card from '../../components/common/Card';
import { FaMoneyBillWave } from 'react-icons/fa';

const Gastos = () => {
  return (
    <div className="space-y-6">
      <h1 className="text-2xl font-bold text-gray-800">Gestión de Gastos</h1>
      <Card>
        <div className="text-center py-12">
          <FaMoneyBillWave className="mx-auto h-16 w-16 text-gray-400 mb-4" />
          <p className="text-gray-500">Módulo de Gastos - En desarrollo</p>
        </div>
      </Card>
    </div>
  );
};

export default Gastos;