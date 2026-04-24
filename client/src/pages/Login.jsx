import React, { useState, useEffect } from 'react';
import { useNavigate, Link } from 'react-router-dom';
import { useAuth } from '../context/useAuth';

export default function Login() {
  const navigate = useNavigate();
  const { login, user } = useAuth();
  
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [error, setError] = useState(null);

  // If already logged in, push to dashboard
  useEffect(() => {
    if (user) {
      if (user.role === 'Admin') navigate('/admin');
      else if (user.role === 'Seller' || user.role === 'Both') navigate('/seller');
      else navigate('/buyer');
    }
  }, [user, navigate]);

  const handleLogin = async (e) => {
    e.preventDefault();
    try {
      const response = await fetch('http://localhost:3000/api/users/login', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ email, password }),
      });
      
      const data = await response.json();
      
      if (!response.ok) {
        throw new Error(data.error || 'Failed to login');
      }

      setError(null);
      // Let Context know!
      login(data.user);
      
      // Navigate based on user role
      const role = data.user.role;
      if (role === 'Admin') navigate('/admin');
      else if (role === 'Seller' || role === 'Both') navigate('/seller');
      else navigate('/buyer');
      
    } catch (err) {
      setError(err.message);
    }
  };

  return (
    <div className="brand-auth-shell flex min-h-screen items-center justify-center px-4">
      <div className="brand-auth-card w-full max-w-md p-8">
        <div className="mb-8 text-center">
          <h1 className="brand-logo-text text-4xl font-extrabold">Fastlance</h1>
          <p className="brand-page-subtitle mt-2 text-sm">Sign in to your account</p>
        </div>

        {error && (
          <div className="mb-4 rounded-xl border border-red-200 bg-red-50 p-3 text-sm text-red-700">
            {error}
          </div>
        )}

        <form onSubmit={handleLogin} className="space-y-5">
          <div>
            <label className="mb-1 block text-sm font-medium text-slate-700">Email Address</label>
            <input 
              type="email"
              required
              className="brand-input"
              placeholder="you@example.com"
              value={email}
              onChange={(e) => setEmail(e.target.value)}
            />
          </div>

          <div>
            <label className="mb-1 block text-sm font-medium text-slate-700">Password</label>
            <input 
              type="password"
              required
              className="brand-input"
              placeholder="********"
              value={password}
              onChange={(e) => setPassword(e.target.value)}
            />
          </div>

          <button 
            type="submit"
            className="brand-button-primary flex w-full justify-center rounded-xl px-4 py-2.5 text-sm font-medium transition"
          >
            Sign in
          </button>
        </form>

        <div className="mt-6 text-center text-sm">
          <p className="text-slate-600">
            Don't have an account?{' '}
            <Link to="/register" className="brand-link font-medium transition">
              Sign up
            </Link>
          </p>
        </div>
      </div>
    </div>
  );
}
