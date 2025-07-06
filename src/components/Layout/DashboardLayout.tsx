import React, { useState } from 'react';
import { Outlet } from 'react-router-dom';
import Sidebar from './Sidebar'; // Ensure this path is correct relative to DashboardLayout.tsx
import Header from './Header';   // Ensure this path is correct relative to DashboardLayout.tsx

// DashboardLayout provides the main layout for authenticated users,
// including the sidebar, header, and main content area.
const DashboardLayout: React.FC = () => {
  const [sidebarOpen, setSidebarOpen] = useState(false);

  const toggleSidebar = () => {
    setSidebarOpen(!sidebarOpen);
  };

  return (
    <div className="flex h-screen bg-gray-100">
      {/* Sidebar for larger screens */}
      <div className="hidden lg:flex flex-shrink-0">
        <Sidebar onSectionChange={() => {}} sidebarOpen={sidebarOpen} /> {/* sidebarOpen is not used in Sidebar directly, but passed for consistency */}
      </div>

      {/* Mobile Sidebar Overlay */}
      {sidebarOpen && (
        <div 
          className="fixed inset-0 bg-black bg-opacity-50 z-40 lg:hidden"
          onClick={toggleSidebar} // Close sidebar when clicking overlay
        ></div>
      )}
      
      {/* Mobile Sidebar */}
      <div className={`fixed inset-y-0 left-0 w-64 bg-white z-50 transform ${
        sidebarOpen ? 'translate-x-0' : '-translate-x-full'
      } lg:hidden transition-transform duration-200 ease-in-out shadow-lg`}>
        <Sidebar onSectionChange={toggleSidebar} sidebarOpen={sidebarOpen} /> {/* Pass toggleSidebar to close it */}
      </div>

      {/* Main Content Area */}
      <div className="flex flex-col flex-1 overflow-hidden">
        <Header onMenuClick={toggleSidebar} sidebarOpen={sidebarOpen} /> {/* Pass toggleSidebar for menu button */}
        
        <main className="flex-1 overflow-x-hidden overflow-y-auto bg-gray-100">
          <Outlet /> {/* Renders the matched child route component (e.g., DashboardPage, InventoryPage) */}
        </main>
      </div>
    </div>
  );
};

export default DashboardLayout;
