import React, { useState, useEffect, useRef } from 'react';
import { Link, useNavigate } from 'react-router-dom';
import { useAuth } from '../context/useAuth';

const API = 'http://localhost:3000';

export default function Navbar() {
  const { user, logout } = useAuth();
  const navigate = useNavigate();
  const [activeMode, setActiveMode] = useState('Buyer');

  // Notifications state
  const [unreadCount, setUnreadCount]       = useState(0);
  const [notifications, setNotifications]   = useState([]);
  const [bellOpen, setBellOpen]             = useState(false);
  const bellRef = useRef(null);

  const handleLogout = () => {
    logout();
    navigate('/login');
  };

  const effectiveRole = user?.role === 'Both' ? activeMode : user?.role;

  // Poll unread count every 30s
  useEffect(() => {
    if (!user || user.role === 'Admin') return;

    const fetchCount = () =>
      fetch(`${API}/api/notifications/user/${user.id}/unread-count`)
        .then((r) => r.ok ? r.json() : { unread_count: 0 })
        .then((d) => setUnreadCount(Number(d.unread_count || 0)))
        .catch(() => {});

    fetchCount();
    const interval = setInterval(fetchCount, 30_000);
    return () => clearInterval(interval);
  }, [user]);

  // Fetch full list when bell opens
  useEffect(() => {
    if (!bellOpen || !user) return;
    fetch(`${API}/api/notifications/user/${user.id}`)
      .then((r) => r.ok ? r.json() : [])
      .then((d) => setNotifications(Array.isArray(d) ? d.slice(0, 15) : []))
      .catch(() => {});
  }, [bellOpen, user]);

  // Close bell dropdown on outside click
  useEffect(() => {
    const handler = (e) => {
      if (bellRef.current && !bellRef.current.contains(e.target)) setBellOpen(false);
    };
    document.addEventListener('mousedown', handler);
    return () => document.removeEventListener('mousedown', handler);
  }, []);

  const markAllRead = async () => {
    if (!user) return;
    await fetch(`${API}/api/notifications/user/${user.id}/read-all`, { method: 'PATCH' });
    setUnreadCount(0);
    setNotifications((prev) => prev.map((n) => ({ ...n, is_read: 1 })));
  };

  const markOneRead = async (notifId) => {
    await fetch(`${API}/api/notifications/${notifId}/read`, { method: 'PATCH' });
    setNotifications((prev) =>
      prev.map((n) => n.notification_id === notifId ? { ...n, is_read: 1 } : n)
    );
    setUnreadCount((c) => Math.max(0, c - 1));
  };

  return (
    <nav className="brand-topbar sticky top-0 z-20">
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
        <div className="flex justify-between h-16">
          <div className="flex items-center flex-1">
            <h1 className="brand-logo-text text-2xl font-extrabold tracking-tight flex-shrink-0">
              <Link to="/">Fastlance</Link>
            </h1>

            {/* Global Search Bar */}
            {user && effectiveRole === 'Buyer' && (
              <form 
                onSubmit={(e) => {
                  e.preventDefault();
                  const term = e.target.search.value;
                  if (term.trim()) {
                    navigate(`/buyer?q=${encodeURIComponent(term)}`);
                    e.target.reset();
                  }
                }}
                className="hidden lg:flex ml-8 flex-1 max-w-sm relative"
              >
                <input 
                  name="search"
                  type="text" 
                  placeholder="What service are you looking for today?"
                  className="brand-input pl-10 h-10 text-sm italic"
                />
                <svg className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-[#50616b]" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2.5" d="M21 21l-6-6m2-5a7 7 0 11-14 0 7 7 0 0114 0z" />
                </svg>
              </form>
            )}

            <div className="hidden md:ml-6 md:flex md:space-x-8">
              {user && effectiveRole === 'Buyer' && (
                <>
                  <NavLink to="/buyer">Explore Gigs</NavLink>
                  <NavLink to="/buyer/orders">My Orders</NavLink>
                </>
              )}
              {user && effectiveRole === 'Seller' && (
                <>
                  <NavLink to="/seller">My Dashboard</NavLink>
                  <NavLink to="/seller/orders">Manage Orders</NavLink>
                </>
              )}
              {user && user.role === 'Admin' && (
                <NavLink to="/admin">Administration</NavLink>
              )}
              {user && user.role !== 'Admin' && (
                <>
                  <NavLink to="/wallet">
                    <svg className="mr-1.5 h-4 w-4 inline" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="1.8" d="M3 10h18M7 15h1m4 0h1m-7 4h12a3 3 0 003-3V8a3 3 0 00-3-3H6a3 3 0 00-3 3v8a3 3 0 003 3z" />
                    </svg>
                    Wallet
                  </NavLink>
                  <NavLink to="/messages">
                    <svg className="mr-1.5 h-4 w-4 inline" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="1.8" d="M8 10h.01M12 10h.01M16 10h.01M9 16H5a2 2 0 01-2-2V6a2 2 0 012-2h14a2 2 0 012 2v8a2 2 0 01-2 2h-5l-5 5v-5z" />
                    </svg>
                    Messages
                  </NavLink>
                </>
              )}
            </div>
          </div>

          <div className="flex items-center gap-3">
            {user ? (
              <>
                {/* Role switcher */}
                {user.role === 'Both' && (
                  <button
                    onClick={() => {
                      const newMode = activeMode === 'Buyer' ? 'Seller' : 'Buyer';
                      setActiveMode(newMode);
                      navigate(newMode === 'Seller' ? '/seller' : '/buyer');
                    }}
                    className="hidden sm:block brand-link text-sm font-medium transition"
                  >
                    Switch to {activeMode === 'Buyer' ? 'Selling' : 'Buying'}
                  </button>
                )}

                {/* Notification Bell */}
                {user.role !== 'Admin' && (
                  <div className="relative" ref={bellRef}>
                    <button
                      onClick={() => setBellOpen((o) => !o)}
                      className="relative brand-button-neutral rounded-xl p-2 transition"
                      aria-label="Notifications"
                    >
                      <svg className="h-5 w-5" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="1.8"
                          d="M15 17h5l-1.405-1.405A2.032 2.032 0 0118 14.158V11a6.002 6.002 0 00-4-5.659V5a2 2 0 10-4 0v.341C7.67 6.165 6 8.388 6 11v3.159c0 .538-.214 1.055-.595 1.436L4 17h5m6 0v1a3 3 0 11-6 0v-1m6 0H9" />
                      </svg>
                      {unreadCount > 0 && (
                        <span className="absolute -top-1 -right-1 flex h-4 w-4 items-center justify-center rounded-full bg-red-500 text-[10px] font-bold text-white">
                          {unreadCount > 9 ? '9+' : unreadCount}
                        </span>
                      )}
                    </button>

                    {/* Bell dropdown */}
                    {bellOpen && (
                      <div className="absolute right-0 mt-2 w-80 brand-surface rounded-2xl overflow-hidden z-50">
                        <div className="flex items-center justify-between px-4 py-3 border-b" style={{ borderColor: 'var(--brand-line)' }}>
                          <p className="text-sm font-bold" style={{ color: 'var(--brand-ink)' }}>Notifications</p>
                          {unreadCount > 0 && (
                            <button onClick={markAllRead} className="text-xs brand-link font-medium">Mark all read</button>
                          )}
                        </div>
                        <div className="max-h-72 overflow-y-auto divide-y" style={{ borderColor: 'var(--brand-line)' }}>
                          {notifications.length === 0 ? (
                            <p className="px-4 py-8 text-center text-sm" style={{ color: 'var(--brand-muted)' }}>No notifications yet</p>
                          ) : notifications.map((n) => (
                            <button
                              key={n.notification_id}
                              onClick={() => markOneRead(n.notification_id)}
                              className={`w-full text-left px-4 py-3 transition hover:bg-[#f1fbff] ${!n.is_read ? 'bg-[#eef9ff]' : ''}`}
                            >
                              <div className="flex items-start gap-2">
                                {!n.is_read && <span className="mt-1.5 h-2 w-2 flex-shrink-0 rounded-full bg-[#2da8ed]" />}
                                <div className={!n.is_read ? '' : 'ml-4'}>
                                  <p className="text-sm font-semibold leading-snug" style={{ color: 'var(--brand-ink)' }}>{n.title}</p>
                                  {n.body && <p className="text-xs mt-0.5 leading-snug" style={{ color: 'var(--brand-muted)' }}>{n.body}</p>}
                                  <p className="text-xs mt-1" style={{ color: 'var(--brand-muted)' }}>
                                    {new Date(n.created_at).toLocaleDateString()}
                                  </p>
                                </div>
                              </div>
                            </button>
                          ))}
                        </div>
                      </div>
                    )}
                  </div>
                )}

                {/* User avatar / profile link */}
                <Link
                  to="/profile"
                  className="hidden sm:flex items-center gap-2 brand-button-neutral rounded-xl px-3 py-2 text-sm font-medium transition"
                >
                  <div className="h-8 w-8 flex items-center justify-center brand-surface font-black text-xs text-[#0f172a] bg-[#fef08a] overflow-hidden rounded-full flex-shrink-0">
                    {user?.profile_pic_url ? (
                      <img src={user.profile_pic_url} alt={user.username} className="h-full w-full object-cover" />
                    ) : (
                      user?.username?.charAt(0).toUpperCase()
                    )}
                  </div>
                  <span className="hidden lg:block">{user.username}</span>
                </Link>

                <button
                  onClick={handleLogout}
                  className="brand-button-neutral rounded-xl px-4 py-2 text-sm font-medium transition"
                >
                  Logout
                </button>
              </>
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

function NavLink({ to, children }) {
  return (
    <Link
      to={to}
      className="inline-flex items-center px-1 pt-1 text-sm font-bold text-[#0f172a] transition-all hover:text-[#695f02] relative group"
    >
      <span className="relative z-10">{children}</span>
      <span className="absolute bottom-3 left-0 right-0 h-2 bg-[#fef08a] transform scale-x-0 group-hover:scale-x-100 transition-transform origin-left z-0 rotate-[-1deg]"></span>
    </Link>
  );
}
