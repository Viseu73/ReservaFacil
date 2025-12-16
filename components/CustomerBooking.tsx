import React, { useState, useEffect, useMemo } from 'react';
import { useRestaurant } from '../context/RestaurantContext';
import { generateTimeSlots, assignTable, createGoogleCalendarUrl, isDateOpen } from '../utils/dateUtils';
import { TimeSlot } from '../types';
import { generateConfirmationMessage } from '../services/geminiService';
import { Calendar, Users, Clock, CheckCircle, AlertCircle, ExternalLink, Loader2, Phone, Mail, User } from 'lucide-react';
import { DAYS_LABEL } from '../constants';

const CustomerBooking: React.FC = () => {
  const { settings, bookings, addBooking } = useRestaurant();
  
  // Form State
  const [date, setDate] = useState('');
  const [partySize, setPartySize] = useState(2);
  const [selectedTime, setSelectedTime] = useState<string | null>(null);
  const [customerName, setCustomerName] = useState('');
  const [customerEmail, setCustomerEmail] = useState('');
  const [customerPhone, setCustomerPhone] = useState('');
  
  // UI State
  const [step, setStep] = useState(1); // 1: Search, 2: Details, 3: Confirmation
  const [loading, setLoading] = useState(false);
  const [confirmationMsg, setConfirmationMsg] = useState('');
  const [lastBookedId, setLastBookedId] = useState<string | null>(null);

  const handleDateChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const newDate = e.target.value;
    if (!newDate) {
        setDate('');
        return;
    }

    if (!isDateOpen(newDate, settings)) {
        const day = new Date(newDate).getDay();
        alert(`Desculpe, o restaurante encontra-se encerrado à(ao) ${DAYS_LABEL[day]}.`);
        setDate('');
        return;
    }
    setDate(newDate);
    setSelectedTime(null);
  };

  // Computed slots based on Date and Party Size
  const timeSlots: TimeSlot[] = useMemo(() => {
    if (!date) return [];
    return generateTimeSlots(date, partySize, settings, bookings);
  }, [date, partySize, settings, bookings]);

  // Handlers
  const handleTimeSelect = (time: string) => {
    setSelectedTime(time);
  };

  const handleNextStep = () => {
    if (step === 1 && selectedTime) setStep(2);
  };

  const handleBookingSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!selectedTime || !date) return;

    setLoading(true);

    // Double check availability logic just in case
    const tableId = assignTable(date, selectedTime, partySize, settings, bookings);

    if (!tableId) {
      alert("Desculpe, este horário acabou de ser ocupado. Por favor escolha outro.");
      setStep(1);
      setLoading(false);
      return;
    }

    const newBooking = {
      id: `bk-${Date.now()}`,
      date,
      time: selectedTime,
      partySize,
      customerName,
      customerEmail,
      customerPhone,
      tableId,
      createdAt: Date.now()
    };

    // Simulate network delay for effect
    setTimeout(async () => {
        addBooking(newBooking);
        
        // Call Gemini for a nice message
        const message = await generateConfirmationMessage(newBooking, settings);
        setConfirmationMsg(message);
        setLastBookedId(newBooking.id);
        
        setLoading(false);
        setStep(3);
    }, 1000);
  };

  const getBookingById = (id: string) => bookings.find(b => b.id === id);
  const lastBooking = lastBookedId ? getBookingById(lastBookedId) : null;
  const gcalLink = lastBooking ? createGoogleCalendarUrl(lastBooking, settings) : '#';

  const today = new Date().toISOString().split('T')[0];

  return (
    <div className="max-w-3xl mx-auto my-12 bg-white rounded-2xl shadow-xl overflow-hidden">
      
      {/* Header */}
      <div className="bg-slate-900 text-white p-8 text-center">
        <h1 className="text-3xl font-bold mb-2">{settings.restaurantName}</h1>
        <p className="text-slate-400">Faça a sua reserva online</p>
      </div>

      <div className="p-8">
        
        {/* Step 1: Select Date, Guests, Time */}
        {step === 1 && (
          <div className="space-y-8 animate-fade-in">
            <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
              <div>
                <label className="block text-sm font-semibold text-slate-700 mb-2 flex items-center gap-2">
                    <Calendar size={16} /> Data
                </label>
                <input 
                  type="date" 
                  min={today}
                  value={date}
                  onChange={handleDateChange}
                  className="w-full p-3 border border-slate-200 rounded-lg focus:ring-2 focus:ring-blue-500 outline-none"
                />
                <p className="text-xs text-slate-400 mt-1">Apenas dias de funcionamento.</p>
              </div>
              <div>
                <label className="block text-sm font-semibold text-slate-700 mb-2 flex items-center gap-2">
                    <Users size={16} /> N.º de Pessoas
                </label>
                <select 
                    value={partySize}
                    onChange={(e) => { setPartySize(parseInt(e.target.value)); setSelectedTime(null); }}
                    className="w-full p-3 border border-slate-200 rounded-lg focus:ring-2 focus:ring-blue-500 outline-none bg-white"
                >
                    {[1,2,3,4,5,6,7,8,9,10].map(n => (
                        <option key={n} value={n}>{n} Pessoas</option>
                    ))}
                </select>
              </div>
            </div>

            {date && (
                <div>
                    <h3 className="text-lg font-semibold text-slate-800 mb-4 flex items-center gap-2">
                        <Clock size={18} className="text-blue-500" /> Horários Disponíveis
                    </h3>
                    
                    {timeSlots.length === 0 ? (
                        <div className="p-4 bg-orange-50 text-orange-600 rounded-lg flex items-center gap-2">
                            <AlertCircle size={20} />
                            O restaurante está fechado ou sem horários para este dia.
                        </div>
                    ) : (
                        <div className="grid grid-cols-3 sm:grid-cols-4 md:grid-cols-5 gap-3">
                            {timeSlots.map(slot => (
                                <button
                                    key={slot.time}
                                    disabled={!slot.available}
                                    onClick={() => handleTimeSelect(slot.time)}
                                    className={`
                                        py-2 px-1 rounded-lg text-sm font-medium transition-all
                                        ${slot.available 
                                            ? (selectedTime === slot.time 
                                                ? 'bg-blue-600 text-white shadow-md transform scale-105' 
                                                : 'bg-white border border-blue-200 text-blue-600 hover:bg-blue-50')
                                            : 'bg-slate-100 text-slate-400 cursor-not-allowed opacity-60'
                                        }
                                    `}
                                >
                                    {slot.time}
                                </button>
                            ))}
                        </div>
                    )}
                    
                    {timeSlots.length > 0 && !timeSlots.some(s => s.available) && (
                         <div className="mt-4 p-4 bg-red-50 text-red-600 rounded-lg text-sm text-center">
                            Não existem mesas disponíveis para {partySize} pessoas nesta data. Tente outro dia ou menos pessoas.
                         </div>
                    )}
                </div>
            )}

            <div className="flex justify-end pt-4">
                <button 
                    disabled={!selectedTime}
                    onClick={handleNextStep}
                    className="bg-slate-900 text-white px-8 py-3 rounded-xl font-semibold disabled:opacity-50 disabled:cursor-not-allowed hover:bg-slate-800 transition-colors"
                >
                    Continuar
                </button>
            </div>
          </div>
        )}

        {/* Step 2: Customer Details */}
        {step === 2 && (
            <form onSubmit={handleBookingSubmit} className="space-y-6 animate-fade-in">
                <div className="bg-blue-50 p-4 rounded-lg flex items-center justify-between text-blue-900 mb-6">
                    <div className="flex items-center gap-4">
                        <Calendar size={20} />
                        <div>
                            <p className="font-semibold text-lg">{date.split('-').reverse().join('/')}</p>
                            <p className="text-sm opacity-80">{selectedTime} - {partySize} Pessoas</p>
                        </div>
                    </div>
                    <button type="button" onClick={() => setStep(1)} className="text-sm underline hover:text-blue-700">Alterar</button>
                </div>

                <div>
                    <label className="text-sm font-medium text-slate-700 mb-1 flex items-center gap-2">
                        <User size={16} /> Nome Completo
                    </label>
                    <input 
                        required
                        type="text" 
                        value={customerName}
                        onChange={e => setCustomerName(e.target.value)}
                        className="w-full p-3 border border-slate-200 rounded-lg focus:ring-2 focus:ring-blue-500 outline-none"
                        placeholder="Ex: João Silva"
                    />
                </div>
                
                <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                    <div>
                        <label className="text-sm font-medium text-slate-700 mb-1 flex items-center gap-2">
                            <Mail size={16} /> Email
                        </label>
                        <input 
                            required
                            type="email" 
                            value={customerEmail}
                            onChange={e => setCustomerEmail(e.target.value)}
                            className="w-full p-3 border border-slate-200 rounded-lg focus:ring-2 focus:ring-blue-500 outline-none"
                            placeholder="Ex: joao@email.com"
                        />
                    </div>
                    <div>
                        <label className="text-sm font-medium text-slate-700 mb-1 flex items-center gap-2">
                            <Phone size={16} /> Telefone
                        </label>
                        <input 
                            required
                            type="tel" 
                            value={customerPhone}
                            onChange={e => setCustomerPhone(e.target.value)}
                            className="w-full p-3 border border-slate-200 rounded-lg focus:ring-2 focus:ring-blue-500 outline-none"
                            placeholder="Ex: 912 345 678"
                        />
                    </div>
                </div>

                <button 
                    type="submit"
                    disabled={loading}
                    className="w-full bg-slate-900 text-white py-4 rounded-xl font-bold text-lg hover:bg-slate-800 transition-colors flex justify-center items-center gap-2"
                >
                    {loading ? <Loader2 className="animate-spin" /> : 'Confirmar Reserva'}
                </button>
            </form>
        )}

        {/* Step 3: Success */}
        {step === 3 && (
            <div className="text-center space-y-6 animate-fade-in py-8">
                <div className="w-20 h-20 bg-green-100 rounded-full flex items-center justify-center mx-auto text-green-600">
                    <CheckCircle size={40} />
                </div>
                
                <h2 className="text-3xl font-bold text-slate-900">Reserva Confirmada!</h2>
                
                <div className="bg-slate-50 p-6 rounded-xl border border-slate-100 max-w-md mx-auto">
                    <p className="text-slate-600 italic">"{confirmationMsg}"</p>
                </div>

                <div className="text-sm text-slate-500">
                    Foi enviado um comprovativo para {customerEmail}
                </div>

                <div className="grid gap-4 max-w-sm mx-auto">
                    <a 
                        href={gcalLink} 
                        target="_blank" 
                        rel="noreferrer"
                        className="flex items-center justify-center gap-2 w-full bg-blue-600 hover:bg-blue-700 text-white font-semibold py-3 px-4 rounded-lg transition-colors"
                    >
                        <Calendar size={18} />
                        Adicionar ao Google Calendar
                    </a>
                    
                    <button 
                        onClick={() => {
                            setStep(1);
                            setDate('');
                            setSelectedTime(null);
                            setCustomerName('');
                            setCustomerEmail('');
                            setCustomerPhone('');
                        }}
                        className="text-slate-500 hover:text-slate-800 font-medium py-2"
                    >
                        Fazer nova reserva
                    </button>
                </div>
            </div>
        )}
      </div>
    </div>
  );
};

export default CustomerBooking;