import React from 'react';
import { RestaurantProvider, useRestaurant } from './context/RestaurantContext';
import AdminPanel from './components/AdminPanel';
import CustomerBooking from './components/CustomerBooking';
import { ChefHat, User } from 'lucide-react';

const MainLayout: React.FC = () => {
  const { isAdminMode, toggleAdminMode } = useRestaurant();

  return (
    <div className="min-h-screen flex flex-col">
      <nav className="bg-white border-b border-slate-200 sticky top-0 z-50">
        <div className="max-w-6xl mx-auto px-4 h-16 flex items-center justify-between">
            <div className="font-bold text-xl text-slate-900 flex items-center gap-2">
                <ChefHat className="text-orange-500" />
                ReservaFácil
            </div>
            
            <button 
                onClick={toggleAdminMode}
                className={`
                    flex items-center gap-2 px-4 py-2 rounded-full text-sm font-medium transition-all
                    ${isAdminMode 
                        ? 'bg-blue-100 text-blue-700 hover:bg-blue-200' 
                        : 'bg-slate-100 text-slate-600 hover:bg-slate-200'}
                `}
            >
                {isAdminMode ? (
                    <>
                        <User size={16} /> Ir para Vista de Cliente
                    </>
                ) : (
                    <>
                        <ChefHat size={16} /> Ir para Administração
                    </>
                )}
            </button>
        </div>
      </nav>

      <main className="flex-1 bg-slate-50 px-4">
        {isAdminMode ? <AdminPanel /> : <CustomerBooking />}
      </main>

      <footer className="bg-white border-t border-slate-200 py-6 mt-auto">
        <div className="max-w-6xl mx-auto px-4 text-center text-slate-400 text-sm">
            &copy; {new Date().getFullYear()} ReservaFácil. Powered by React & Gemini.
        </div>
      </footer>
    </div>
  );
};

const App: React.FC = () => {
  return (
    <RestaurantProvider>
      <MainLayout />
    </RestaurantProvider>
  );
};

export default App;