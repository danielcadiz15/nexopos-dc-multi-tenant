/**
 * Componente selector de rango de fechas
 * 
 * Permite seleccionar un rango de fechas para filtrar reportes.
 * 
 * @module components/common/DateRangePicker
 * @requires react, react-datepicker
 * @related_files ../../pages/reportes/ReporteCompras.js, ../../pages/reportes/ReporteVentas.js
 */

import React, { useState, useEffect } from 'react';
import DatePicker, { registerLocale } from 'react-datepicker';
import 'react-datepicker/dist/react-datepicker.css';
import es from 'date-fns/locale/es';
import { format, subDays, subMonths, startOfMonth, endOfMonth, startOfYear, endOfYear } from 'date-fns';
import { FaCalendarAlt, FaChevronDown } from 'react-icons/fa';

// Registrar el idioma español
registerLocale('es', es);

/**
 * Componente para seleccionar rango de fechas
 * @param {Object} props - Propiedades del componente
 * @param {Date} props.fechaInicio - Fecha de inicio seleccionada
 * @param {Date} props.fechaFin - Fecha de fin seleccionada
 * @param {Function} props.onChange - Función que se ejecuta al cambiar las fechas
 * @param {boolean} props.showPresets - Mostrar opciones predefinidas
 * @returns {JSX.Element} Componente DateRangePicker
 */
const DateRangePicker = ({ 
  fechaInicio = new Date(new Date().getFullYear(), new Date().getMonth(), 1), 
  fechaFin = new Date(), 
  onChange,
  showPresets = true
}) => {
  const [startDate, setStartDate] = useState(fechaInicio);
  const [endDate, setEndDate] = useState(fechaFin);
  const [isOpen, setIsOpen] = useState(false);
  
  /**
   * Actualiza las fechas y notifica al componente padre
   * @param {Date} start - Nueva fecha de inicio
   * @param {Date} end - Nueva fecha de fin
   */
  const actualizarFechas = (start, end) => {
    setStartDate(start);
    setEndDate(end);
    
    if (onChange) {
      onChange({ fechaInicio: start, fechaFin: end });
    }
  };
  
  /**
   * Maneja el cambio en la fecha de inicio
   * @param {Date} date - Nueva fecha seleccionada
   */
  const handleStartDateChange = (date) => {
    // Si la fecha de inicio es después de la fecha de fin, ajustar la fecha de fin
    if (date > endDate) {
      actualizarFechas(date, date);
    } else {
      actualizarFechas(date, endDate);
    }
  };
  
  /**
   * Maneja el cambio en la fecha de fin
   * @param {Date} date - Nueva fecha seleccionada
   */
  const handleEndDateChange = (date) => {
    // Si la fecha de fin es antes de la fecha de inicio, ajustar la fecha de inicio
    if (date < startDate) {
      actualizarFechas(date, date);
    } else {
      actualizarFechas(startDate, date);
    }
  };
  
  /**
   * Establece un rango predefinido
   * @param {string} range - Identificador del rango a establecer
   */
  const setPresetRange = (range) => {
    const today = new Date();
    
    switch (range) {
      case 'today':
        actualizarFechas(today, today);
        break;
      case 'yesterday':
        const yesterday = subDays(today, 1);
        actualizarFechas(yesterday, yesterday);
        break;
      case 'last7Days':
        actualizarFechas(subDays(today, 6), today);
        break;
      case 'last30Days':
        actualizarFechas(subDays(today, 29), today);
        break;
      case 'thisMonth':
        actualizarFechas(startOfMonth(today), today);
        break;
      case 'lastMonth':
        const lastMonth = subMonths(today, 1);
        actualizarFechas(startOfMonth(lastMonth), endOfMonth(lastMonth));
        break;
      case 'thisYear':
        actualizarFechas(startOfYear(today), today);
        break;
      default:
        break;
    }
    
    setIsOpen(false);
  };
  
  /**
   * Formatea la fecha para mostrar
   * @param {Date} date - Fecha a formatear
   * @returns {string} Fecha formateada
   */
  const formatDate = (date) => {
    return format(date, 'dd/MM/yyyy');
  };
  
  // Actualizar cuando cambien las props
  useEffect(() => {
    setStartDate(fechaInicio);
    setEndDate(fechaFin);
  }, [fechaInicio, fechaFin]);

  return (
    <div className="relative">
      {/* Botón para mostrar el selector */}
      <button
        type="button"
        className="inline-flex items-center px-4 py-2 border border-gray-300 rounded-md shadow-sm text-sm font-medium text-gray-700 bg-white hover:bg-gray-50 focus:outline-none focus:ring-2 focus:ring-indigo-500"
        onClick={() => setIsOpen(!isOpen)}
      >
        <FaCalendarAlt className="mr-2 text-gray-500" />
        <span>{formatDate(startDate)} - {formatDate(endDate)}</span>
        <FaChevronDown className="ml-2 text-gray-500" />
      </button>
      
      {/* Dropdown del selector */}
      {isOpen && (
        <div className="origin-top-right absolute right-0 mt-2 w-72 rounded-md shadow-lg bg-white ring-1 ring-black ring-opacity-5 focus:outline-none z-10">
          <div className="py-2 px-3">
            {/* Rangos predefinidos */}
            {showPresets && (
              <div className="mb-3 border-b pb-2">
                <div className="text-xs font-medium text-gray-500 mb-1">Rangos rápidos</div>
                <div className="grid grid-cols-2 gap-1">
                  <button
                    type="button"
                    className="text-xs text-left px-2 py-1 text-gray-700 hover:bg-indigo-50 hover:text-indigo-700 rounded"
                    onClick={() => setPresetRange('today')}
                  >
                    Hoy
                  </button>
                  <button
                    type="button"
                    className="text-xs text-left px-2 py-1 text-gray-700 hover:bg-indigo-50 hover:text-indigo-700 rounded"
                    onClick={() => setPresetRange('yesterday')}
                  >
                    Ayer
                  </button>
                  <button
                    type="button"
                    className="text-xs text-left px-2 py-1 text-gray-700 hover:bg-indigo-50 hover:text-indigo-700 rounded"
                    onClick={() => setPresetRange('last7Days')}
                  >
                    Últimos 7 días
                  </button>
                  <button
                    type="button"
                    className="text-xs text-left px-2 py-1 text-gray-700 hover:bg-indigo-50 hover:text-indigo-700 rounded"
                    onClick={() => setPresetRange('last30Days')}
                  >
                    Últimos 30 días
                  </button>
                  <button
                    type="button"
                    className="text-xs text-left px-2 py-1 text-gray-700 hover:bg-indigo-50 hover:text-indigo-700 rounded"
                    onClick={() => setPresetRange('thisMonth')}
                  >
                    Este mes
                  </button>
                  <button
                    type="button"
                    className="text-xs text-left px-2 py-1 text-gray-700 hover:bg-indigo-50 hover:text-indigo-700 rounded"
                    onClick={() => setPresetRange('lastMonth')}
                  >
                    Mes anterior
                  </button>
                  <button
                    type="button"
                    className="text-xs text-left px-2 py-1 text-gray-700 hover:bg-indigo-50 hover:text-indigo-700 rounded"
                    onClick={() => setPresetRange('thisYear')}
                  >
                    Este año
                  </button>
                </div>
              </div>
            )}
            
            {/* Selector de fechas personalizado */}
            <div className="flex flex-col space-y-2">
              <div>
                <label htmlFor="start-date" className="block text-xs font-medium text-gray-700 mb-1">
                  Fecha de inicio
                </label>
                <DatePicker
                  id="start-date"
                  selected={startDate}
                  onChange={handleStartDateChange}
                  selectsStart
                  startDate={startDate}
                  endDate={endDate}
                  maxDate={new Date()}
                  dateFormat="dd/MM/yyyy"
                  locale="es"
                  className="block w-full p-2 text-sm border border-gray-300 rounded-md focus:outline-none focus:ring-indigo-500 focus:border-indigo-500"
                />
              </div>
              
              <div>
                <label htmlFor="end-date" className="block text-xs font-medium text-gray-700 mb-1">
                  Fecha de fin
                </label>
                <DatePicker
                  id="end-date"
                  selected={endDate}
                  onChange={handleEndDateChange}
                  selectsEnd
                  startDate={startDate}
                  endDate={endDate}
                  minDate={startDate}
                  maxDate={new Date()}
                  dateFormat="dd/MM/yyyy"
                  locale="es"
                  className="block w-full p-2 text-sm border border-gray-300 rounded-md focus:outline-none focus:ring-indigo-500 focus:border-indigo-500"
                />
              </div>
              
              <div className="flex justify-end space-x-2 pt-2">
                <button
                  type="button"
                  className="inline-flex items-center px-2.5 py-1.5 border border-gray-300 shadow-sm text-xs font-medium rounded text-gray-700 bg-white hover:bg-gray-50 focus:outline-none focus:ring-2 focus:ring-indigo-500"
                  onClick={() => setIsOpen(false)}
                >
                  Cancelar
                </button>
                <button
                  type="button"
                  className="inline-flex items-center px-2.5 py-1.5 border border-transparent text-xs font-medium rounded shadow-sm text-white bg-indigo-600 hover:bg-indigo-700 focus:outline-none focus:ring-2 focus:ring-indigo-500"
                  onClick={() => setIsOpen(false)}
                >
                  Aplicar
                </button>
              </div>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};

export default DateRangePicker;