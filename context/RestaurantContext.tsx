import React, { createContext, useContext, useEffect, useState } from 'react';
import { Booking, Settings } from '../types';
import { DEFAULT_SETTINGS } from '../constants';

interface RestaurantContextType {
  settings: Settings;
  updateSettings: (newSettings: Settings) => void;
  bookings: Booking[];
  addBooking: (booking: Booking) => void;
  isAdminMode: boolean;
  toggleAdminMode: () => void;
}

const RestaurantContext = createContext<RestaurantContextType | undefined>(undefined);

export const RestaurantProvider: React.FC<{ children: React.ReactNode }> = ({ children }) => {
  const [settings, setSettings] = useState<Settings>(() => {
    const saved = localStorage.getItem('restaurant_settings');
    return saved ? JSON.parse(saved) : DEFAULT_SETTINGS;
  });

  const [bookings, setBookings] = useState<Booking[]>(() => {
    const saved = localStorage.getItem('restaurant_bookings');
    return saved ? JSON.parse(saved) : [];
  });

  const [isAdminMode, setIsAdminMode] = useState(false);

  useEffect(() => {
    localStorage.setItem('restaurant_settings', JSON.stringify(settings));
  }, [settings]);

  useEffect(() => {
    localStorage.setItem('restaurant_bookings', JSON.stringify(bookings));
  }, [bookings]);

  const updateSettings = (newSettings: Settings) => {
    setSettings(newSettings);
  };

  const addBooking = (booking: Booking) => {
    setBookings(prev => [...prev, booking]);
  };

  const toggleAdminMode = () => setIsAdminMode(prev => !prev);

  return (
    <RestaurantContext.Provider value={{
      settings,
      updateSettings,
      bookings,
      addBooking,
      isAdminMode,
      toggleAdminMode
    }}>
      {children}
    </RestaurantContext.Provider>
  );
};

export const useRestaurant = () => {
  const context = useContext(RestaurantContext);
  if (!context) {
    throw new Error('useRestaurant must be used within a RestaurantProvider');
  }
  return context;
};