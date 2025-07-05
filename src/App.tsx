import React, { useState } from 'react';
import { QueryClient, QueryClientProvider } from '@tanstack/react-query';
import { Toaster } from 'react-hot-toast';
import { useAuth } from './hooks/useAuth';
import LoginForm from './components/Auth/LoginForm';
import Sidebar from './components/Layout/Sidebar';
import Header from './components/Layout/Header';
import Dashboard from './components/Dashboard/Dashboard';
import InventoryPage from './components/Inventory/InventoryPage';
import TransactionsPage from './components/Transactions/TransactionsPage';
import ReportsPage from './components/Reports/ReportsPage';
import MaintenancePage from './components/Maintenance/MaintenancePage';
import AlertsPage from './components/Alerts/AlertsPage';
import UsersPage from './components/Users/UsersPage';
import SettingsPage from './components/Settings/SettingsPage';
import BillingPage from './components/Billing/BillingPage';
import DebugPanel from './components/Debug/DebugPanel';
import AINotificationPanel from './components/AI/AINotificationPanel';

// Create a client with optimized settings
const queryClient = new QueryClient({
  defaultOptions: {
    queries: {
      staleTime: 1000 * 60 * 5, // 5 minutes
      retry: 1,
      refetchOnWindowFocus: false,
      refetchOnReconnect: true,
      refetchInterval: false, // Disable automatic refetching
    },
    mutations: {
      retry: 1,
    },
  },
});

function AppContent() {
  const { user, profile, loading } = useAuth();
  const [activeSection, setActiveSection] = useState('dashboard');
  const [sidebarOpen, setSidebarOpen] = useState(false);

  // Show loading with timeout protection
  if (loading) {
    return (
      <div className="min-h-screen bg-gray-100 flex items-center justify-center">
        <div className="text-center">
          <div className="w-8 h-8 border-4 border-blue-600 border-t-transparent rounded-full animate-spin mx-auto mb-4"></div>
          <p className="text-gray-600">Loading...</p>
          <p className="text-xs text-gray-400 mt-2">If this takes too long, please refresh the page</p>
        </div>
      </div>
    );
  }

  // Show login form if no user
  if (!user) {
    return <LoginForm />;
  }

  // If user exists but no profile, show a simplified interface
  // This prevents infinite loading when profile fetch fails
  if (!profile) {
    return (
      <div className="min-h-screen bg-gray-100 flex items-center justify-center p-4">
        <div className="text-center bg-white p-8 rounded-lg shadow-md max-w-md w-full">
          <h2 className="text-xl font-semibold text-gray-900 mb-4">Profile Setup Required</h2>
          <p className="text-gray-600 mb-4">
            Your account exists but your profile needs to be set up. Please contact an administrator or try signing out and back in.
          </p>
          <div className="flex flex-col sm:flex-row space-y-2 sm:space-y-0 sm:space-x-2">
            <button
              onClick={() => window.location.reload()}
              className="flex-1 px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 transition-colors"
            >
              Retry
            </button>
            <button
              onClick={() => {
                // Force sign out and reload
                localStorage.clear();
                window.location.reload();
              }}
              className="flex-1 px-4 py-2 bg-gray-600 text-white rounded-lg hover:bg-gray-700 transition-colors"
            >
              Sign Out
            </button>
          </div>
        </div>
      </div>
    );
  }

  const renderContent = () => {
    switch (activeSection) {
      case 'dashboard':
        return <Dashboard />;
      case 'inventory':
        return <InventoryPage />;
      case 'transactions':
        return <TransactionsPage />;
      case 'maintenance':
        return <MaintenancePage />;
      case 'alerts':
        return <AlertsPage />;
      case 'analytics':
        return <ReportsPage />;
      case 'billing':
        return <BillingPage />;
      case 'users':
        return <UsersPage />;
      case 'settings':
        return <SettingsPage />;
      default:
        return <Dashboard />;
    }
  };

  const handleSectionChange = (section: string) => {
    setActiveSection(section);
    setSidebarOpen(false); // Close sidebar on mobile when section changes
  };

  return (
    <div className="h-screen bg-gray-100 flex overflow-hidden">
      {/* Mobile sidebar overlay */}
      {sidebarOpen && (
        <div 
          className="fixed inset-0 z-40 lg:hidden bg-black bg-opacity-50"
          onClick={() => setSidebarOpen(false)}
        />
      )}

      {/* Sidebar */}
      <div className={`
        fixed inset-y-0 left-0 z-50 w-64 transform transition-transform duration-300 ease-in-out lg:translate-x-0 lg:static lg:inset-0
        ${sidebarOpen ? 'translate-x-0' : '-translate-x-full'}
      `}>
        <Sidebar 
          activeSection={activeSection} 
          onSectionChange={handleSectionChange}
        />
      </div>

      {/* Main content */}
      <div className="flex-1 flex flex-col overflow-hidden">
        <Header 
          onMenuClick={() => setSidebarOpen(!sidebarOpen)}
          sidebarOpen={sidebarOpen}
        />
        <main className="flex-1 overflow-y-auto">
          <div className="min-h-full">
            {renderContent()}
          </div>
        </main>
      </div>

      <AINotificationPanel />
      <DebugPanel />
    </div>
  );
}

function App() {
  return (
    <QueryClientProvider client={queryClient}>
      <AppContent />
      <Toaster 
        position="top-right"
        toastOptions={{
          duration: 4000,
          style: {
            background: '#363636',
            color: '#fff',
          },
        }}
      />
    </QueryClientProvider>
  );
}

export default App;