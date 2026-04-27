import React, { useState, useEffect } from 'react';
import { useAuth } from '../context/useAuth';
import { useNavigate } from 'react-router-dom';

const API = 'http://localhost:3000';

export default function Profile() {
  const { user, login } = useAuth();
  const navigate = useNavigate();

  const [profile, setProfile]           = useState(null);
  const [loading, setLoading]           = useState(true);
  const [error, setError]               = useState('');

  const [username, setUsername]         = useState('');
  const [email, setEmail]               = useState('');
  const [bio, setBio]                   = useState('');
  const [profilePic, setProfilePic]     = useState('');
  const [role, setRole]                 = useState('');

  const [saving, setSaving]             = useState(false);
  const [saveError, setSaveError]       = useState('');
  const [saveSuccess, setSaveSuccess]   = useState('');

  useEffect(() => {
    if (!user) return navigate('/login');
    fetch(`${API}/api/users/${user.id}`)
      .then((r) => r.json())
      .then((data) => {
        setProfile(data);
        setUsername(data.username || '');
        setEmail(data.email || '');
        setBio(data.bio || '');
        setProfilePic(data.profile_pic_url || '');
        setRole(data.role || 'Buyer');
      })
      .catch(() => setError('Failed to load profile.'))
      .finally(() => setLoading(false));
  }, [user, navigate]);

  const handleSave = async (e) => {
    e.preventDefault();
    setSaveError('');
    setSaveSuccess('');
    try {
      setSaving(true);
      const res = await fetch(`${API}/api/users/${user.id}`, {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          username: username.trim(),
          email: email.trim(),
          bio: bio.trim() || null,
          profile_pic_url: profilePic.trim() || null,
          role,
        }),
      });
      if (!res.ok) {
        const d = await res.json();
        throw new Error(d.error || 'Failed to save.');
      }
      setSaveSuccess('Profile updated successfully!');
      // Refresh profile data
      const updated = await fetch(`${API}/api/users/${user.id}`).then((r) => r.json());
      setProfile(updated);
    } catch (err) {
      setSaveError(err.message);
    } finally {
      setSaving(false);
    }
  };

  if (loading) {
    return (
      <div className="flex justify-center items-center min-h-[60vh]">
        <div className="h-12 w-12 animate-spin rounded-full border-b-2 border-[#2da8ed]" />
      </div>
    );
  }

  if (error) {
    return (
      <div className="max-w-2xl mx-auto px-4 py-8">
        <div className="brand-surface p-6 text-center text-red-600">{error}</div>
      </div>
    );
  }

  const initials = profile?.username?.charAt(0).toUpperCase() || '?';

  return (
    <div className="max-w-2xl mx-auto px-4 sm:px-6 lg:px-8 py-8 w-full">

      {/* Header */}
      <div className="brand-hero mb-8 px-6 py-8 flex items-center gap-6">
        <div className="flex-shrink-0 h-20 w-20 rounded-full flex items-center justify-center text-3xl font-extrabold border-2 overflow-hidden"
             style={{ background: '#eef9ff', borderColor: '#c8ecff', color: 'var(--brand-sky-700)' }}>
          {profilePic
            ? <img src={profilePic} alt={username} className="h-full w-full object-cover" onError={(e) => { e.target.style.display = 'none'; }} />
            : initials}
        </div>
        <div>
          <h1 className="brand-page-title text-2xl font-bold">{profile?.username}</h1>
          <p className="brand-page-subtitle text-sm mt-0.5">{profile?.role} · Member since {new Date(profile?.created_at).toLocaleDateString()}</p>
          <p className="text-sm font-semibold mt-1" style={{ color: 'var(--brand-sky-600)' }}>
            Wallet: ${Number(profile?.wallet_balance ?? 0).toFixed(2)}
          </p>
        </div>
      </div>

      {/* Edit Form */}
      <div className="brand-surface p-6">
        <h2 className="brand-page-title text-lg font-bold mb-5">Edit Profile</h2>
        <form onSubmit={handleSave} className="space-y-4">
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
            <div>
              <label className="block text-sm font-medium mb-1" style={{ color: 'var(--brand-ink)' }}>Username</label>
              <input className="brand-input" value={username} onChange={(e) => setUsername(e.target.value)} required />
            </div>
            <div>
              <label className="block text-sm font-medium mb-1" style={{ color: 'var(--brand-ink)' }}>Email</label>
              <input className="brand-input" type="email" value={email} onChange={(e) => setEmail(e.target.value)} required />
            </div>
          </div>

          <div>
            <label className="block text-sm font-medium mb-1" style={{ color: 'var(--brand-ink)' }}>Role</label>
            <select className="brand-input" value={role} onChange={(e) => setRole(e.target.value)}>
              <option value="Buyer">Buyer</option>
              <option value="Seller">Seller</option>
              <option value="Both">Both (Buyer & Seller)</option>
            </select>
          </div>

          <div>
            <label className="block text-sm font-medium mb-1" style={{ color: 'var(--brand-ink)' }}>Profile Picture URL</label>
            <input
              className="brand-input"
              placeholder="https://example.com/avatar.jpg"
              value={profilePic}
              onChange={(e) => setProfilePic(e.target.value)}
            />
          </div>

          <div>
            <label className="block text-sm font-medium mb-1" style={{ color: 'var(--brand-ink)' }}>Bio</label>
            <textarea
              rows="4"
              className="brand-input"
              placeholder="Tell buyers and sellers about yourself..."
              value={bio}
              onChange={(e) => setBio(e.target.value)}
            />
          </div>

          {saveError && (
            <p className="text-sm text-red-600 border border-red-200 bg-red-50 rounded-lg px-4 py-2">{saveError}</p>
          )}
          {saveSuccess && (
            <p className="text-sm text-green-700 border border-[#c9e8d5] bg-[#edf9f2] rounded-lg px-4 py-2">{saveSuccess}</p>
          )}

          <button
            type="submit"
            disabled={saving}
            className="brand-button-primary w-full rounded-xl py-2.5 text-sm font-semibold transition disabled:cursor-not-allowed disabled:opacity-60"
          >
            {saving ? 'Saving...' : 'Save Changes'}
          </button>
        </form>
      </div>
    </div>
  );
}
