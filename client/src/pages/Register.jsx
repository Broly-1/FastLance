import React, { useState } from 'react';
import { useNavigate, Link } from 'react-router-dom';

export default function Register() {
  const navigate = useNavigate();
  const [username, setUsername] = useState('');
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [role, setRole] = useState('Buyer');
  const [error, setError] = useState(null);

  const handleRegister = async (e) => {
    e.preventDefault();
    try {
      const response = await fetch('http://localhost:3000/api/users', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ username, email, password, role }),
      });
      
      const data = await response.json();
      
      if (!response.ok) {
        throw new Error(data.error || 'Failed to register');
      }

      alert('Registration successful! Please login.');
      navigate('/login');
    } catch (err) {
      setError(err.message);
    }
  };

  return (
    <div className="brand-auth-shell flex min-h-screen items-center justify-center px-4">
      <div className="brand-auth-card w-full max-w-md p-8">
        <div className="mb-8 text-center">
          <p className="mb-3 inline-flex rounded-full border border-[#c8ecff] bg-[#eef9ff] px-3 py-1 text-xs font-semibold uppercase tracking-[0.24em] text-[#0f699e]">
            Light blue + yellow
          </p>
          <h1 className="brand-logo-text text-4xl font-extrabold">Fastlance</h1>
          <p className="brand-page-subtitle mt-2 text-sm">Create a new account</p>
        </div>

        {error && (
          <div className="mb-4 rounded-xl border border-red-200 bg-red-50 p-3 text-sm text-red-700">
            {error}
          </div>
        )}

        <form onSubmit={handleRegister} className="space-y-4">
          <div>
            <label className="mb-1 block text-sm font-medium text-slate-700">Username</label>
            <input 
              type="text"
              required
              className="brand-input"
              placeholder="johndoe123"
              value={username}
              onChange={(e) => setUsername(e.target.value)}
            />
          </div>

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

          <div>
            <label className="mb-1 block text-sm font-medium text-slate-700">I want to...</label>
            <select 
              value={role}
              onChange={(e) => setRole(e.target.value)}
              className="brand-input"
            >
              <option value="Buyer">Hire Freelancers (Buyer)</option>
              <option value="Seller">Offer my Services (Seller)</option>
              <option value="Both">Do Both</option>
            </select>
          </div>

          <button 
            type="submit"
            className="brand-button-primary mt-6 flex w-full justify-center rounded-xl px-4 py-2.5 text-sm font-medium transition"
          >
            Create Account
          </button>
        </form>

        <div className="mt-6 text-center text-sm">
          <p className="text-slate-600">
            Already have an account?{' '}
            <Link to="/login" className="brand-link font-medium transition">
              Sign in
            </Link>
          </p>
        </div>
      </div>
    </div>
  );
}
