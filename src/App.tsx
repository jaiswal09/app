// App.tsx (or AppContent component)
import React, { useState, useEffect } from 'react';
import { QueryClient, QueryClientProvider } from '@tanstack/react-query';
import { Toaster } from 'react-hot-toast';
import { useAuth } from './hooks/useAuth';
import LoginForm from './components/Auth/LoginForm';
import Sidebar from './components/Layout/Sidebar';
import Header from './components/Layout/Header';
// Import all your page components
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

// NEW IMPORTS FOR REACT ROUTER
import { BrowserRouter as Router, Routes, Route, useNavigate, useLocation } from 'react-router-dom';


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

// AppContent will now manage routing for authenticated users
function AppContent() {
  const { user, profile, loading } = useAuth();
  const [sidebarOpen, setSidebarOpen] = useState(false);
  const navigate = useNavigate(); // Initialize useNavigate
  const location = useLocation(); // Get current location

  // Effect to redirect after successful login or if unauthenticated
  useEffect(() => {
    if (!loading) {
      if (!user) {
        // If not authenticated, redirect to login page
        // Only redirect if not already on /login to avoid loop
        if (location.pathname !== '/login') {
          navigate('/login');
        }
      } else if (user && !profile) {
        // User authenticated but no profile, handle this state
        // Maybe a specific route for profile setup or a message
        // For now, let the existing UI handle it.
      } else {
        // User is authenticated and has profile
        // If they are on /login, redirect them to /dashboard
        if (location.pathname === '/login' || location.pathname === '/') {
          navigate('/dashboard');
        }
        // If they are on a non-existent route, redirect to dashboard
        // Or ensure they are on a valid authenticated route
      }
    }
  }, [loading, user, profile, navigate, location.pathname]);


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
    return <LoginForm />; // This will render if user is null/undefined
  }

  // If user exists but no profile, show a simplified interface
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

  // Render main application layout for authenticated users with profile
  return (
    <div className="h-screen bg-gray-100 flex overflow-hidden">
      {/* Mobile sidebar overlay */}
      {sidebarOpen && (
        <div 
          className="fixed inset-0 z-40 lg:hidden bg-black bg-opacity-50"
          onClick={() => setSidebarOpen(false)}
        />
      )}

      {/* Sidebar - now uses react-router-dom for navigation */}
      <div className={`
        fixed inset-y-0 left-0 z-50 w-64 transform transition-transform duration-300 ease-in-out lg:translate-x-0 lg:static lg:inset-0
        ${sidebarOpen ? 'translate-x-0' : '-translate-x-full'}
      `}>
        {/* Pass the setSidebarOpen function to close sidebar on mobile after navigation */}
        <Sidebar 
          onSectionChange={() => setSidebarOpen(false)} // Sidebar will use Link or useNavigate
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
            {/* Use React Router's Routes for authenticated sections */}
            <Routes>
              <Route path="/dashboard" element={<Dashboard />} />
              <Route path="/inventory" element={<InventoryPage />} />
              <Route path="/transactions" element={<TransactionsPage />} />
              <Route path="/maintenance" element={<MaintenancePage />} />
              <Route path="/alerts" element={<AlertsPage />} />
              <Route path="/analytics" element={<ReportsPage />} />
              <Route path="/billing" element={<BillingPage />} />
              <Route path="/users" element={<UsersPage />} />
              <Route path="/settings" element={<SettingsPage />} />
              {/* Fallback for any other authenticated route not explicitly defined */}
              <Route path="*" element={<Dashboard />} /> 
            </Routes>
          </div>
        </main>
      </div>

      <AINotificationPanel />
      <DebugPanel />
    </div>
  );
}

// The main App component wraps everything in BrowserRouter
function App() {
  return (
    <Router> {/* BrowserRouter is essential for routing */}
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
    </Router>
  );
}

export default App;