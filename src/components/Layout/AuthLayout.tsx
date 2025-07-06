import React from 'react';
import { Outlet } from 'react-router-dom';

// AuthLayout provides a consistent layout for authentication pages (Login, Register).
// It typically centers the content and applies minimal styling.
const AuthLayout: React.FC = () => {
  return (
    <div className="min-h-screen flex items-center justify-center bg-gray-100 p-4">
      <div className="w-full max-w-md bg-white rounded-lg shadow-lg p-6 sm:p-8">
        {/* Outlet renders the matched child route component (e.g., LoginPage, RegisterPage) */}
        <Outlet />
      </div>
    </div>
  );
};

export default AuthLayout;
