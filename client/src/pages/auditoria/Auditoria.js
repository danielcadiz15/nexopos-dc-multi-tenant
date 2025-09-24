import React from 'react';
import Card from '../../components/common/Card';
import { FaHistory } from 'react-icons/fa';

const Auditoria = () => {
  return (
    <div className="space-y-6">
      <h1 className="text-2xl font-bold text-gray-800">Auditoría del Sistema</h1>
      <Card>
        <div className="text-center py-12">
          <FaHistory className="mx-auto h-16 w-16 text-gray-400 mb-4" />
          <p className="text-gray-500">Módulo de Auditoría - En desarrollo</p>
        </div>
      </Card>
    </div>
  );
};

export default Auditoria;