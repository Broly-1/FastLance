import React, { useState } from 'react';
import { Link, useNavigate } from 'react-router-dom';
import { useAuth } from '../context/useAuth';

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
    <nav className="brand-topbar sticky top-0 z-20">
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
        <div className="flex justify-between h-16">
          <div className="flex items-center">
            <h1 className="brand-logo-text text-2xl font-extrabold tracking-tight">
              <Link to="/">Fastlance</Link>
            </h1>
            <div className="hidden md:ml-6 md:flex md:space-x-8">
              {/* Dynamic Links Based on Role */}
              {user && effectiveRole === 'Buyer' && (
                <>
                  <Link to="/buyer" className="inline-flex items-center border-b-2 border-transparent px-1 pt-1 text-sm font-medium text-slate-700 transition hover:border-[#ffd247] hover:text-sky-700">Explore Gigs</Link>
                  <Link to="/buyer/orders" className="inline-flex items-center border-b-2 border-transparent px-1 pt-1 text-sm font-medium text-slate-700 transition hover:border-[#ffd247] hover:text-sky-700">My Orders</Link>
                </>
              )}
              {user && effectiveRole === 'Seller' && (
                <>
                  <Link to="/seller" className="inline-flex items-center border-b-2 border-transparent px-1 pt-1 text-sm font-medium text-slate-700 transition hover:border-[#ffd247] hover:text-sky-700">My Dashboard</Link>
                  <Link to="/seller/orders" className="inline-flex items-center border-b-2 border-transparent px-1 pt-1 text-sm font-medium text-slate-700 transition hover:border-[#ffd247] hover:text-sky-700">Manage Orders</Link>
                </>
              )}
              {user && user.role === 'Admin' && (
                <Link to="/admin" className="inline-flex items-center border-b-2 border-transparent px-1 pt-1 text-sm font-medium text-slate-700 transition hover:border-[#ffd247] hover:text-sky-700">Administration</Link>
              )}
              {user && user.role !== 'Admin' && (
                <Link to="/messages" className="inline-flex items-center border-b-2 border-transparent px-1 pt-1 text-sm font-medium text-slate-700 transition hover:border-[#ffd247] hover:text-sky-700">
                  <svg className="mr-1.5 h-4 w-4" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="1.8" d="M8 10h.01M12 10h.01M16 10h.01M9 16H5a2 2 0 01-2-2V6a2 2 0 012-2h14a2 2 0 012 2v8a2 2 0 01-2 2h-5l-5 5v-5z" />
                  </svg>
                  Messages
                </Link>
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
                    className="brand-link text-sm font-medium transition"
                  >
                    Switch to {activeMode === 'Buyer' ? 'Selling' : 'Buying'}
                  </button>
                )}
                <span className="hidden text-sm text-slate-500 sm:block">Logged in as {user.username} ({user.role})</span>
                <button 
                  onClick={handleLogout}
                  className="brand-button-neutral rounded-xl px-4 py-2 text-sm font-medium transition"
                >
                  Logout
                </button>
              </div>
            ) : (
              <div className="space-x-4 flex">
                <Link to="/login" className="px-3 py-2 text-sm font-medium text-slate-600 transition hover:text-sky-700">Sign in</Link>
                <Link to="/register" className="brand-button-primary rounded-xl px-4 py-2 text-sm font-medium transition">Sign up</Link>
              </div>
            )}
          </div>
        </div>
      </div>
    </nav>
  );
}
