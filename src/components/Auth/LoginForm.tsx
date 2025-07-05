import React, { useState, memo } from 'react';
import { Package, Eye, EyeOff, Loader2 } from 'lucide-react';
import { useAuth } from '../../hooks/useAuth';

const LoginForm = memo(() => {
  const { signIn, signUp, loading } = useAuth();
  const [isSignUp, setIsSignUp] = useState(false);
  const [showPassword, setShowPassword] = useState(false);
  const [formData, setFormData] = useState({
    email: '',
    password: '',
    fullName: ''
  });

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    
    try {
      if (isSignUp) {
        // No role specified - will be set by database operator
        const result = await signUp(formData.email, formData.password, formData.fullName);
        if (result.success) {
          // Switch to sign in mode after successful registration
          setIsSignUp(false);
          setFormData(prev => ({ ...prev, password: '', fullName: '' }));
        }
      } else {
        await signIn(formData.email, formData.password);
      }
    } catch (error) {
      console.error('Form submission error:', error);
    }
  };

  const handleInputChange = (field: string, value: string) => {
    setFormData(prev => ({ ...prev, [field]: value }));
  };

  const handleDemoLogin = async (email: string, password: string) => {
    setFormData({ email, password, fullName: '' });
    await signIn(email, password);
  };

  return (
    <div className="min-h-screen bg-gradient-to-br from-blue-50 to-indigo-100 flex items-center justify-center p-4">
      <div className="max-w-md w-full">
        {/* Logo */}
        <div className="text-center mb-8">
          <div className="w-16 h-16 bg-blue-600 rounded-2xl flex items-center justify-center mx-auto mb-4">
            <Package className="w-8 h-8 text-white" />
          </div>
          <h1 className="text-2xl font-bold text-gray-900">MedInventory</h1>
          <p className="text-gray-600">Medical Inventory Management System</p>
        </div>

        {/* Form */}
        <div className="bg-white rounded-2xl shadow-xl p-8">
          <div className="mb-6">
            <h2 className="text-xl font-semibold text-gray-900">
              {isSignUp ? 'Create Account' : 'Sign In'}
            </h2>
            <p className="text-gray-600 mt-1">
              {isSignUp ? 'Register for a new account' : 'Welcome back! Please sign in to continue.'}
            </p>
          </div>

          <form onSubmit={handleSubmit} className="space-y-4">
            {isSignUp && (
              <div>
                <label htmlFor="fullName" className="block text-sm font-medium text-gray-700 mb-1">
                  Full Name
                </label>
                <input
                  id="fullName"
                  type="text"
                  required
                  value={formData.fullName}
                  onChange={(e) => handleInputChange('fullName', e.target.value)}
                  className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                  placeholder="Enter your full name"
                  disabled={loading}
                />
              </div>
            )}

            <div>
              <label htmlFor="email" className="block text-sm font-medium text-gray-700 mb-1">
                Email Address
              </label>
              <input
                id="email"
                type="email"
                required
                value={formData.email}
                onChange={(e) => handleInputChange('email', e.target.value)}
                className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                placeholder="Enter your email"
                disabled={loading}
              />
            </div>

            <div>
              <label htmlFor="password" className="block text-sm font-medium text-gray-700 mb-1">
                Password
              </label>
              <div className="relative">
                <input
                  id="password"
                  type={showPassword ? 'text' : 'password'}
                  required
                  value={formData.password}
                  onChange={(e) => handleInputChange('password', e.target.value)}
                  className="w-full px-3 py-2 pr-10 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                  placeholder="Enter your password"
                  disabled={loading}
                />
                <button
                  type="button"
                  onClick={() => setShowPassword(!showPassword)}
                  className="absolute right-3 top-1/2 transform -translate-y-1/2 text-gray-400 hover:text-gray-600"
                  disabled={loading}
                >
                  {showPassword ? <EyeOff className="w-4 h-4" /> : <Eye className="w-4 h-4" />}
                </button>
              </div>
            </div>

            <button
              type="submit"
              disabled={loading}
              className="w-full bg-blue-600 text-white py-2.5 px-4 rounded-lg font-medium hover:bg-blue-700 focus:ring-2 focus:ring-blue-500 focus:ring-offset-2 transition-colors disabled:opacity-50 disabled:cursor-not-allowed flex items-center justify-center"
            >
              {loading ? (
                <Loader2 className="w-4 h-4 animate-spin" />
              ) : (
                isSignUp ? 'Create Account' : 'Sign In'
              )}
            </button>
          </form>

          <div className="mt-6 text-center">
            <button
              onClick={() => {
                setIsSignUp(!isSignUp);
                setFormData({ email: '', password: '', fullName: '' });
              }}
              className="text-blue-600 hover:text-blue-700 font-medium"
              disabled={loading}
            >
              {isSignUp ? 'Already have an account? Sign in' : "Don't have an account? Sign up"}
            </button>
          </div>

          {/* Demo Accounts */}
          {!isSignUp && (
            <div className="mt-6 p-4 bg-gray-50 rounded-lg">
              <p className="text-sm font-medium text-gray-700 mb-3">Demo Accounts:</p>
              <div className="space-y-2">
                <button
                  onClick={() => handleDemoLogin('admin@medcenter.com', 'admin123')}
                  className="w-full text-left text-xs text-gray-600 hover:text-blue-600 p-2 rounded hover:bg-blue-50 transition-colors"
                  disabled={loading}
                >
                  <div className="font-medium">Admin Account</div>
                  <div>admin@medcenter.com / admin123</div>
                </button>
                <button
                  onClick={() => handleDemoLogin('staff@medcenter.com', 'staff123')}
                  className="w-full text-left text-xs text-gray-600 hover:text-blue-600 p-2 rounded hover:bg-blue-50 transition-colors"
                  disabled={loading}
                >
                  <div className="font-medium">Staff Account</div>
                  <div>staff@medcenter.com / staff123</div>
                </button>
                <button
                  onClick={() => handleDemoLogin('doctor@medcenter.com', 'doctor123')}
                  className="w-full text-left text-xs text-gray-600 hover:text-blue-600 p-2 rounded hover:bg-blue-50 transition-colors"
                  disabled={loading}
                >
                  <div className="font-medium">Medical Personnel</div>
                  <div>doctor@medcenter.com / doctor123</div>
                </button>
              </div>
            </div>
          )}

          {/* Registration Info */}
          {isSignUp && (
            <div className="mt-6 p-4 bg-amber-50 border border-amber-200 rounded-lg">
              <div className="flex items-start space-x-2">
                <div className="w-5 h-5 text-amber-600 mt-0.5">
                  <svg fill="currentColor" viewBox="0 0 20 20">
                    <path fillRule="evenodd" d="M8.257 3.099c.765-1.36 2.722-1.36 3.486 0l5.58 9.92c.75 1.334-.213 2.98-1.742 2.98H4.42c-1.53 0-2.493-1.646-1.743-2.98l5.58-9.92zM11 13a1 1 0 11-2 0 1 1 0 012 0zm-1-8a1 1 0 00-1 1v3a1 1 0 002 0V6a1 1 0 00-1-1z" clipRule="evenodd" />
                  </svg>
                </div>
                <div>
                  <p className="text-sm font-medium text-amber-800">Account Pending Approval</p>
                  <p className="text-sm text-amber-700 mt-1">
                    Your account will be created but requires administrator approval and role assignment before you can access the system. 
                    Please contact your system administrator after registration.
                  </p>
                </div>
              </div>
            </div>
          )}
        </div>
      </div>
    </div>
  );
});

LoginForm.displayName = 'LoginForm';

export default LoginForm;