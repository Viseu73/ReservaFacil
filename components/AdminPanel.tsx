import React, { useState, useMemo } from 'react';
import { useRestaurant } from '../context/RestaurantContext';
import { DayOfWeek, Table, TimeRange, Booking } from '../types';
import { DAYS_LABEL } from '../constants';
import { parseTime, assignTable } from '../utils/dateUtils';
import { Save, Plus, Trash2, Clock, MapPin, LayoutGrid, CalendarRange, Utensils, Moon, Download, Lock, CalendarPlus, Mail } from 'lucide-react';

const AdminPanel: React.FC = () => {
  const { settings, updateSettings, bookings, addBooking } = useRestaurant();
  const [localSettings, setLocalSettings] = useState(settings);
  const [viewDate, setViewDate] = useState(new Date().toISOString().split('T')[0]);
  
  // Auth State
  const [isAuthenticated, setIsAuthenticated] = useState(false);
  const [passwordInput, setPasswordInput] = useState('');

  // Manual Import State
  const [importString, setImportString] = useState(''); // e.g. "4 Luis"
  const [importLocation, setImportLocation] = useState(''); // e.g. "912345678"
  const [importDate, setImportDate] = useState(new Date().toISOString().split('T')[0]);
  const [importTime, setImportTime] = useState('12:00');

  const handleLogin = (e: React.FormEvent) => {
      e.preventDefault();
      if (passwordInput === '1234') {
          setIsAuthenticated(true);
      } else {
          alert('Password incorreta');
      }
  };

  const handleSave = () => {
    updateSettings(localSettings);
    alert('Definições guardadas com sucesso!');
  };

  const handleBackupExport = () => {
      const headers = ['ID', 'Nome', 'Email', 'Telefone', 'Data', 'Hora', 'Pessoas', 'Mesa ID'];
      const rows = bookings.map(b => [
          b.id,
          b.customerName,
          b.customerEmail,
          b.customerPhone,
          b.date,
          b.time,
          b.partySize,
          b.tableId
      ]);
      
      const csvContent = "data:text/csv;charset=utf-8," 
          + headers.join(",") + "\n" 
          + rows.map(e => e.join(",")).join("\n");
      
      const encodedUri = encodeURI(csvContent);
      const link = document.createElement("a");
      link.setAttribute("href", encodedUri);
      link.setAttribute("download", "ReservasBkp.csv");
      document.body.appendChild(link);
      link.click();
      document.body.removeChild(link);
  };

  const handleManualImport = () => {
      // Parse "4 Luis"
      const regex = /^(\d+)\s+(.+)$/;
      const match = importString.trim().match(regex);

      if (!match) {
          alert('Formato inválido. Deve ser "Numero Nome" (ex: "4 Luis")');
          return;
      }

      const partySize = parseInt(match[1]);
      const customerName = match[2];
      const customerPhone = importLocation;

      // Assign Table logic
      const tableId = assignTable(importDate, importTime, partySize, localSettings, bookings);
      
      if (!tableId) {
          alert('Não há mesa disponível para esta data/hora/pessoas.');
          return;
      }

      const newBooking: Booking = {
          id: `imp-${Date.now()}`,
          customerName,
          customerEmail: 'manual@import',
          customerPhone,
          date: importDate,
          time: importTime,
          partySize,
          tableId,
          createdAt: Date.now()
      };

      addBooking(newBooking);
      setImportString('');
      setImportLocation('');
      alert('Reserva importada com sucesso!');
  };

  const updateSchedule = (day: number, period: 'lunch' | 'dinner', field: keyof TimeRange, value: any) => {
    setLocalSettings(prev => ({
      ...prev,
      hours: {
        ...prev.hours,
        [day]: {
            ...prev.hours[day],
            [period]: {
                ...prev.hours[day][period],
                [field]: value
            }
        }
      }
    }));
  };

  const addTable = () => {
    const newId = `t${Date.now()}`;
    setLocalSettings(prev => ({
      ...prev,
      tables: [...prev.tables, { id: newId, name: `Nova Mesa`, seats: 2 }]
    }));
  };

  const removeTable = (id: string) => {
    setLocalSettings(prev => ({
      ...prev,
      tables: prev.tables.filter(t => t.id !== id)
    }));
  };

  const updateTable = (id: string, field: keyof Table, value: string | number) => {
    setLocalSettings(prev => ({
      ...prev,
      tables: prev.tables.map(t => t.id === id ? { ...t, [field]: value } : t)
    }));
  };

  // --- Statistics Logic ---
  const dailyBookings = bookings
    .filter(b => b.date === viewDate)
    .sort((a, b) => parseTime(a.time) - parseTime(b.time));

  const getOccupancy = (startStr: string, endStr: string) => {
      if (!startStr || !endStr) return { free: settings.tables.length, total: settings.tables.length, bookings: [] };
      
      const start = parseTime(startStr);
      const end = parseTime(endStr);
      
      // Filter bookings that happen within this period
      const periodBookings = dailyBookings.filter(b => {
          const t = parseTime(b.time);
          return t >= start && t < end; // Assuming 'end' is exclusive closing time
      });

      // Simple metric: Tables that have AT LEAST one booking in this period
      const usedTableIds = new Set(periodBookings.map(b => b.tableId));
      const totalTables = settings.tables.length;
      const freeTables = totalTables - usedTableIds.size;

      return { free: freeTables, total: totalTables, bookings: periodBookings };
  };

  // Get hours for the selected viewDate
  const viewDayOfWeek = new Date(viewDate).getDay();
  const daySchedule = settings.hours[viewDayOfWeek];
  
  const lunchStats = daySchedule?.lunch.isOpen 
    ? getOccupancy(daySchedule.lunch.start, daySchedule.lunch.end) 
    : { free: 0, total: 0, bookings: [] };
    
  const dinnerStats = daySchedule?.dinner.isOpen 
    ? getOccupancy(daySchedule.dinner.start, daySchedule.dinner.end) 
    : { free: 0, total: 0, bookings: [] };


  if (!isAuthenticated) {
      return (
          <div className="flex items-center justify-center min-h-[60vh]">
              <div className="bg-white p-8 rounded-xl shadow-lg w-full max-w-sm border border-slate-200">
                  <div className="text-center mb-6">
                      <div className="bg-slate-100 w-16 h-16 rounded-full flex items-center justify-center mx-auto mb-4 text-slate-500">
                          <Lock size={32} />
                      </div>
                      <h2 className="text-xl font-bold text-slate-800">Acesso Reservado</h2>
                  </div>
                  <form onSubmit={handleLogin} className="space-y-4">
                      <div>
                          <label className="text-sm font-medium text-slate-600 block mb-1">Password</label>
                          <input 
                              type="password" 
                              value={passwordInput}
                              onChange={e => setPasswordInput(e.target.value)}
                              className="w-full p-3 border border-slate-300 rounded-lg focus:ring-2 focus:ring-blue-500 outline-none"
                              placeholder="••••"
                          />
                      </div>
                      <button type="submit" className="w-full bg-blue-600 text-white py-3 rounded-lg font-semibold hover:bg-blue-700">
                          Entrar
                      </button>
                  </form>
              </div>
          </div>
      );
  }

  return (
    <div className="max-w-6xl mx-auto p-4 md:p-6 bg-white rounded-xl shadow-lg my-8">
      <div className="flex flex-col md:flex-row items-center justify-between mb-8 pb-4 border-b border-gray-100 gap-4">
        <h2 className="text-2xl font-bold text-slate-800 flex items-center gap-2">
           <MapPin className="text-blue-600" />
           Administração
        </h2>
        <div className="flex items-center gap-3">
            <button 
                onClick={handleBackupExport}
                className="flex items-center gap-2 bg-green-600 text-white px-4 py-2 rounded-lg hover:bg-green-700 transition-colors text-sm"
                title="Descarregar ReservasBkp"
            >
                <Download size={18} /> Sheet
            </button>
            <button 
                onClick={handleSave}
                className="flex items-center gap-2 bg-blue-600 text-white px-6 py-2 rounded-lg hover:bg-blue-700 transition-colors w-full md:w-auto justify-center"
            >
                <Save size={18} /> Guardar
            </button>
        </div>
      </div>

      <div className="space-y-12">
        
        {/* Manual Import Section */}
        <div className="bg-blue-50 p-6 rounded-xl border border-blue-100">
            <h3 className="text-xl font-bold text-slate-800 mb-4 flex items-center gap-2">
                <CalendarPlus className="text-blue-600" /> Importar do Calendário
            </h3>
            <p className="text-sm text-slate-600 mb-4">
                Copie os dados do Google Calendar para criar uma reserva manual.
                Formato do Título: <strong>"4 Luis"</strong> (Nº Pessoas Nome)
            </p>
            <div className="flex flex-col md:flex-row gap-4 items-end">
                 <div className="flex-1 w-full">
                    <label className="text-xs font-semibold text-slate-500 uppercase">Dia & Hora</label>
                    <div className="flex gap-2">
                        <input 
                            type="date" 
                            value={importDate}
                            onChange={e => setImportDate(e.target.value)}
                            className="p-2 border border-slate-300 rounded-lg w-full"
                        />
                        <input 
                            type="time" 
                            value={importTime}
                            onChange={e => setImportTime(e.target.value)}
                            className="p-2 border border-slate-300 rounded-lg"
                        />
                    </div>
                 </div>
                 <div className="flex-1 w-full">
                    <label className="text-xs font-semibold text-slate-500 uppercase">Título (Ex: 4 Luis)</label>
                    <input 
                        type="text" 
                        value={importString}
                        onChange={e => setImportString(e.target.value)}
                        className="p-2 border border-slate-300 rounded-lg w-full"
                        placeholder="4 Luis"
                    />
                 </div>
                 <div className="flex-1 w-full">
                    <label className="text-xs font-semibold text-slate-500 uppercase">Localização (Telefone)</label>
                    <input 
                        type="text" 
                        value={importLocation}
                        onChange={e => setImportLocation(e.target.value)}
                        className="p-2 border border-slate-300 rounded-lg w-full"
                        placeholder="912345678"
                    />
                 </div>
                 <button 
                    onClick={handleManualImport}
                    className="bg-blue-600 text-white px-4 py-2 rounded-lg font-semibold hover:bg-blue-700 h-[42px]"
                 >
                    Importar
                 </button>
            </div>
        </div>

        {/* Reservation Dashboard */}
        <div className="bg-slate-50 p-6 rounded-xl border border-slate-200">
            <h3 className="text-xl font-bold text-slate-800 mb-6 flex items-center gap-2">
                <CalendarRange className="text-blue-500" /> Gestão de Reservas
            </h3>
            
            <div className="mb-6">
                <label className="text-sm font-semibold text-slate-600 mr-2">Ver dia:</label>
                <input 
                    type="date" 
                    value={viewDate} 
                    onChange={e => setViewDate(e.target.value)}
                    className="p-2 border border-slate-300 rounded-lg"
                />
            </div>

            <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                {/* Lunch Card */}
                <div className="bg-white p-4 rounded-lg shadow-sm border border-orange-100">
                    <div className="flex justify-between items-center mb-4 border-b border-orange-50 pb-2">
                        <div className="flex items-center gap-2 text-orange-600 font-bold">
                            <Utensils size={20} /> Almoço
                        </div>
                        <div className="text-sm bg-orange-100 text-orange-700 px-3 py-1 rounded-full">
                            Mesas Livres: <strong>{lunchStats.free}</strong> / {lunchStats.total}
                        </div>
                    </div>
                    {lunchStats.bookings.length === 0 ? (
                        <p className="text-slate-400 text-sm italic">Sem reservas para o almoço.</p>
                    ) : (
                        <ul className="space-y-2">
                            {lunchStats.bookings.map(b => (
                                <li key={b.id} className="text-sm border-l-4 border-orange-300 pl-3 py-1 bg-slate-50">
                                    <span className="font-bold text-slate-800">{b.time}</span> - {b.customerName} 
                                    <span className="text-slate-500 text-xs block">Mesa: {settings.tables.find(t=>t.id===b.tableId)?.name} ({b.partySize}p) | Tel: {b.customerPhone}</span>
                                </li>
                            ))}
                        </ul>
                    )}
                </div>

                {/* Dinner Card */}
                <div className="bg-white p-4 rounded-lg shadow-sm border border-indigo-100">
                     <div className="flex justify-between items-center mb-4 border-b border-indigo-50 pb-2">
                        <div className="flex items-center gap-2 text-indigo-600 font-bold">
                            <Moon size={20} /> Jantar
                        </div>
                        <div className="text-sm bg-indigo-100 text-indigo-700 px-3 py-1 rounded-full">
                            Mesas Livres: <strong>{dinnerStats.free}</strong> / {dinnerStats.total}
                        </div>
                    </div>
                    {dinnerStats.bookings.length === 0 ? (
                        <p className="text-slate-400 text-sm italic">Sem reservas para o jantar.</p>
                    ) : (
                        <ul className="space-y-2">
                            {dinnerStats.bookings.map(b => (
                                <li key={b.id} className="text-sm border-l-4 border-indigo-300 pl-3 py-1 bg-slate-50">
                                    <span className="font-bold text-slate-800">{b.time}</span> - {b.customerName} 
                                    <span className="text-slate-500 text-xs block">Mesa: {settings.tables.find(t=>t.id===b.tableId)?.name} ({b.partySize}p) | Tel: {b.customerPhone}</span>
                                </li>
                            ))}
                        </ul>
                    )}
                </div>
            </div>
        </div>

        {/* Basic Settings */}
        <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
            <div>
                <label className="block text-sm font-medium text-slate-700 mb-2">Nome do Restaurante</label>
                <input 
                    type="text" 
                    value={localSettings.restaurantName}
                    onChange={e => setLocalSettings({...localSettings, restaurantName: e.target.value})}
                    className="w-full p-3 border border-slate-200 rounded-lg focus:ring-2 focus:ring-blue-500 outline-none"
                />
            </div>
            <div>
                <label className="text-sm font-medium text-slate-700 mb-2 flex items-center gap-2">
                    <Mail size={16} /> Google Calendar ID/Email
                </label>
                <input 
                    type="text" 
                    value={localSettings.googleCalendarId}
                    onChange={e => setLocalSettings({...localSettings, googleCalendarId: e.target.value})}
                    placeholder="restaurante@gmail.com"
                    className="w-full p-3 border border-slate-200 rounded-lg focus:ring-2 focus:ring-blue-500 outline-none"
                />
            </div>
        </div>
        <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
            <div>
                <label className="block text-sm font-medium text-slate-700 mb-2">Duração da Refeição (minutos)</label>
                <input 
                    type="number" 
                    value={localSettings.mealDurationMinutes}
                    onChange={e => setLocalSettings({...localSettings, mealDurationMinutes: parseInt(e.target.value) || 60})}
                    className="w-full p-3 border border-slate-200 rounded-lg focus:ring-2 focus:ring-blue-500 outline-none"
                />
            </div>
            <div>
                <label className="block text-sm font-medium text-slate-700 mb-2">Tolerância (minutos)</label>
                <input 
                    type="number" 
                    value={localSettings.toleranceMinutes}
                    onChange={e => setLocalSettings({...localSettings, toleranceMinutes: parseInt(e.target.value) || 15})}
                    className="w-full p-3 border border-slate-200 rounded-lg focus:ring-2 focus:ring-blue-500 outline-none"
                />
            </div>
        </div>

        {/* Schedule */}
        <div>
            <h3 className="text-lg font-semibold text-slate-800 mb-4 flex items-center gap-2">
                <Clock size={20} className="text-blue-500" /> Horário de Funcionamento
            </h3>
            <div className="bg-slate-50 p-4 rounded-xl border border-slate-200 overflow-x-auto">
                <table className="w-full min-w-[600px]">
                    <thead>
                        <tr className="text-left text-xs font-semibold text-slate-500 uppercase tracking-wider border-b border-slate-200">
                            <th className="pb-3 pl-2">Dia</th>
                            <th className="pb-3 text-center text-orange-600">Almoço</th>
                            <th className="pb-3 text-center text-indigo-600">Jantar</th>
                        </tr>
                    </thead>
                    <tbody className="divide-y divide-slate-200">
                    {Object.values(DayOfWeek).filter(v => typeof v === 'number').map((dayVal) => {
                        const day = dayVal as number;
                        const config = localSettings.hours[day] || { lunch: {isOpen: false, start: '', end: ''}, dinner: {isOpen: false, start: '', end: ''}};
                        
                        const TimeInputs = ({ period }: { period: 'lunch' | 'dinner' }) => (
                            <div className={`flex items-center justify-center gap-2 ${!config[period].isOpen ? 'opacity-50' : ''}`}>
                                <input 
                                    type="checkbox" 
                                    checked={config[period].isOpen}
                                    onChange={(e) => updateSchedule(day, period, 'isOpen', e.target.checked)}
                                    className="w-4 h-4 rounded text-blue-600"
                                />
                                <input 
                                    type="time" 
                                    disabled={!config[period].isOpen}
                                    value={config[period].start}
                                    onChange={(e) => updateSchedule(day, period, 'start', e.target.value)}
                                    className="p-1 border border-slate-300 rounded text-sm w-20"
                                />
                                <span className="text-slate-400">-</span>
                                <input 
                                    type="time" 
                                    disabled={!config[period].isOpen}
                                    value={config[period].end}
                                    onChange={(e) => updateSchedule(day, period, 'end', e.target.value)}
                                    className="p-1 border border-slate-300 rounded text-sm w-20"
                                />
                            </div>
                        );

                        return (
                            <tr key={day} className="hover:bg-slate-100 transition-colors">
                                <td className="py-3 pl-2 font-medium text-slate-800">{DAYS_LABEL[day]}</td>
                                <td className="py-3"><TimeInputs period="lunch" /></td>
                                <td className="py-3"><TimeInputs period="dinner" /></td>
                            </tr>
                        );
                    })}
                    </tbody>
                </table>
            </div>
        </div>

        {/* Tables */}
        <div>
            <div className="flex items-center justify-between mb-4">
                <h3 className="text-lg font-semibold text-slate-800 flex items-center gap-2">
                    <LayoutGrid size={20} className="text-blue-500" /> Mesas e Capacidade
                </h3>
                <button 
                    onClick={addTable}
                    className="flex items-center gap-1 text-sm bg-green-600 text-white px-3 py-1.5 rounded-lg hover:bg-green-700"
                >
                    <Plus size={16} /> Adicionar Mesa
                </button>
            </div>
            
            <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-3 gap-4">
                {localSettings.tables.map(table => (
                    <div key={table.id} className="bg-white p-4 border border-slate-200 rounded-lg shadow-sm flex flex-col gap-3 relative group">
                        <button 
                            onClick={() => removeTable(table.id)}
                            className="absolute top-2 right-2 text-red-400 hover:text-red-600 opacity-0 group-hover:opacity-100 transition-opacity"
                        >
                            <Trash2 size={16} />
                        </button>
                        <div>
                            <label className="text-xs text-slate-500 uppercase tracking-wide">Nome</label>
                            <input 
                                type="text"
                                value={table.name}
                                onChange={(e) => updateTable(table.id, 'name', e.target.value)}
                                className="w-full font-medium text-slate-800 border-b border-slate-200 focus:border-blue-500 outline-none pb-1"
                            />
                        </div>
                        <div>
                            <label className="text-xs text-slate-500 uppercase tracking-wide">Lugares</label>
                            <input 
                                type="number"
                                value={table.seats}
                                onChange={(e) => updateTable(table.id, 'seats', parseInt(e.target.value) || 2)}
                                className="w-full font-medium text-slate-800 border-b border-slate-200 focus:border-blue-500 outline-none pb-1"
                            />
                        </div>
                    </div>
                ))}
            </div>
        </div>
      </div>
    </div>
  );
};

export default AdminPanel;