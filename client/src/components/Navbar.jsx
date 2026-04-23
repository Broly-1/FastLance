import React, { useState } from 'react';
import { Link, useNavigate } from 'react-router-dom';
import { useAuth } from '../context/AuthContext';

export default function Navbar() {
  const { user, logout } = useAuth();
  const navigate = useNavigate();
  const [activeMode, setActiveMode] = useState('Buyer'); // Default to Buyer for 'Both' role

  const handleLogout = () => {
    logout();
    navigate('/login');
  };

  // Determine effective role
  const effectiveRole = user?.role === 'Both' ? activeMode : user?.role;

  return (
    <nav className="bg-white shadow">
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
        <div className="flex justify-between h-16">
          <div className="flex items-center">
            <h1 className="text-2xl font-extrabold text-blue-600">
              <Link to="/">Fastlance</Link>
            </h1>
            <div className="hidden md:ml-6 md:flex md:space-x-8">
              {/* Dynamic Links Based on Role */}
              {user && effectiveRole === 'Buyer' && (
                <>
                  <Link to="/buyer" className="text-gray-900 border-transparent hover:border-blue-500 hover:text-blue-500 inline-flex items-center px-1 pt-1 border-b-2 text-sm font-medium">Explore Gigs</Link>
                  <Link to="/buyer/orders" className="text-gray-900 border-transparent hover:border-blue-500 hover:text-blue-500 inline-flex items-center px-1 pt-1 border-b-2 text-sm font-medium">My Orders</Link>
                </>
              )}
              {user && effectiveRole === 'Seller' && (
                <>
                  <Link to="/seller" className="text-gray-900 border-transparent hover:border-blue-500 hover:text-blue-500 inline-flex items-center px-1 pt-1 border-b-2 text-sm font-medium">My Dashboard</Link>
                  <Link to="/seller/orders" className="text-gray-900 border-transparent hover:border-blue-500 hover:text-blue-500 inline-flex items-center px-1 pt-1 border-b-2 text-sm font-medium">Manage Orders</Link>
                </>
              )}
              {user && user.role === 'Admin' && (
                <Link to="/admin" className="text-gray-900 border-transparent hover:border-blue-500 hover:text-blue-500 inline-flex items-center px-1 pt-1 border-b-2 text-sm font-medium">Administration</Link>
              )}
            </div>
          </div>
          
          <div className="flex items-center">
            {user ? (
              <div className="flex items-center space-x-4">
                {user.role === 'Both' && (
                  <button 
                    onClick={() => {
                      const newMode = activeMode === 'Buyer' ? 'Seller' : 'Buyer';
                      setActiveMode(newMode);
                      if (newMode === 'Seller') navigate('/seller');
                      else navigate('/buyer');
                    }}
                    className="text-sm font-medium text-blue-600 hover:text-blue-800"
                  >
                    Switch to {activeMode === 'Buyer' ? 'Selling' : 'Buying'}
                  </button>
                )}
                <span className="text-sm text-gray-500 hidden sm:block">Logged in as {user.username} ({user.role})</span>
                <button 
                  onClick={handleLogout}
                  className="bg-gray-800 text-white px-4 py-2 rounded-md hover:bg-gray-900 transition text-sm font-medium"
                >
                  Logout
                </button>
              </div>
            ) : (
              <div className="space-x-4 flex">
                <Link to="/login" className="text-gray-600 hover:text-gray-900 px-3 py-2 rounded-md text-sm font-medium">Sign in</Link>
                <Link to="/register" className="bg-blue-600 text-white px-4 py-2 rounded-md hover:bg-blue-700 transition text-sm font-medium">Sign up</Link>
              </div>
            )}
          </div>
        </div>
      </div>
    </nav>
  );
}