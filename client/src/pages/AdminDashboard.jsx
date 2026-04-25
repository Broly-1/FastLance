import React, { useState, useEffect } from 'react';
import { useAuth } from '../context/useAuth';

export default function AdminDashboard() {
  const { user } = useAuth();
  const [summary, setSummary] = useState(null);
  const [topSellers, setTopSellers] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');

  useEffect(() => {
    const fetchAdminData = async () => {
      try {
        const [summaryRes, sellersRes] = await Promise.all([
          fetch('http://localhost:3000/api/reports/platform-summary'),
          fetch('http://localhost:3000/api/reports/top-sellers'),
        ]);
        if (!summaryRes.ok || !sellersRes.ok) throw new Error('Failed to fetch reporting data.');
        setSummary(await summaryRes.json());
        setTopSellers(await sellersRes.json());
      } catch (err) {
        setError(err.message);
      } finally {
        setLoading(false);
      }
    };
    fetchAdminData();
  }, []);

  if (loading) {
    return (
      <div className="flex justify-center items-center min-h-[60vh]">
        <div className="h-12 w-12 animate-spin rounded-full border-b-2 border-[#2da8ed]" />
      </div>
    );
  }

  if (error) {
    return (
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
        <div className="brand-surface p-6 text-center text-red-600">{error}</div>
      </div>
    );
  }

  return (
    <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8 w-full">

      {/* Page header */}
      <div className="brand-hero mb-8 px-6 py-8 sm:px-8">
        <h1 className="brand-page-title text-3xl font-bold">Platform Overview</h1>
        <p className="brand-page-subtitle mt-1 text-sm">
          Welcome back, <span className="font-semibold">{user?.username}</span>. Here is the current state of the platform.
        </p>
      </div>

      {/* Stats Grid */}
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-5 gap-4 mb-8">
        <StatCard label="Total Users"       value={summary?.total_users ?? 0}                                         icon="👥" />
        <StatCard label="Total Gigs"        value={summary?.total_gigs ?? 0}                                          icon="💼" />
        <StatCard label="Completed Orders"  value={summary?.completed_orders ?? 0}                                    icon="✅" />
        <StatCard label="Total Revenue"     value={`$${Number(summary?.total_revenue ?? 0).toLocaleString()}`}        icon="💰" />
        <StatCard label="Avg. Rating"       value={`${summary?.platform_avg_rating ?? 0} / 5`}                        icon="⭐" />
      </div>

      {/* Top Sellers Table */}
      <div className="brand-surface overflow-hidden">
        <div className="px-6 py-5 border-b" style={{ borderColor: 'var(--brand-line)' }}>
          <h3 className="brand-page-title text-lg font-bold">🏆 Top Performing Sellers</h3>
        </div>
        <div className="overflow-x-auto">
          <table className="w-full text-left">
            <thead>
              <tr className="text-xs uppercase tracking-wide border-b" style={{ borderColor: 'var(--brand-line)', color: 'var(--brand-muted)' }}>
                <th className="px-6 py-4 font-semibold">Seller</th>
                <th className="px-6 py-4 font-semibold text-center">Completed Orders</th>
                <th className="px-6 py-4 font-semibold text-center">Avg. Rating</th>
                <th className="px-6 py-4 font-semibold text-center">Reviews</th>
              </tr>
            </thead>
            <tbody className="divide-y" style={{ borderColor: 'var(--brand-line)' }}>
              {topSellers.map((seller, idx) => (
                <tr key={seller.user_id} className="transition-colors hover:bg-[#f1fbff]">
                  <td className="px-6 py-4">
                    <div className="flex items-center gap-3">
                      <div className="h-9 w-9 flex-shrink-0 rounded-full flex items-center justify-center font-bold text-sm border"
                           style={{ background: '#eef9ff', borderColor: '#c8ecff', color: 'var(--brand-sky-700)' }}>
                        {seller.profile_pic_url
                          ? <img src={seller.profile_pic_url} alt={seller.username} className="h-9 w-9 rounded-full object-cover" />
                          : seller.username.charAt(0).toUpperCase()}
                      </div>
                      <div>
                        <p className="font-semibold text-sm" style={{ color: 'var(--brand-ink)' }}>{seller.username}</p>
                        <p className="text-xs" style={{ color: 'var(--brand-muted)' }}>Rank #{idx + 1}</p>
                      </div>
                    </div>
                  </td>
                  <td className="px-6 py-4 text-center">
                    <span className="brand-chip rounded-full px-3 py-1 text-xs font-semibold">
                      {seller.total_orders}
                    </span>
                  </td>
                  <td className="px-6 py-4 text-center">
                    <span className="brand-chip-warm rounded-full px-3 py-1 text-xs font-semibold">
                      ⭐ {Number(seller.avg_rating).toFixed(2)}
                    </span>
                  </td>
                  <td className="px-6 py-4 text-center text-sm" style={{ color: 'var(--brand-muted)' }}>
                    {seller.total_reviews}
                  </td>
                </tr>
              ))}
              {topSellers.length === 0 && (
                <tr>
                  <td colSpan="4" className="px-6 py-16 text-center text-sm" style={{ color: 'var(--brand-muted)' }}>
                    No completed orders found yet.
                  </td>
                </tr>
              )}
            </tbody>
          </table>
        </div>
      </div>
    </div>
  );
}

function StatCard({ label, value, icon }) {
  return (
    <div className="brand-surface p-5 flex flex-col gap-3 transition-all duration-200 hover:-translate-y-0.5">
      <div className="flex justify-between items-center">
        <p className="text-xs font-semibold uppercase tracking-wide" style={{ color: 'var(--brand-muted)' }}>{label}</p>
        <span className="brand-chip h-8 w-8 rounded-xl flex items-center justify-center text-base">{icon}</span>
      </div>
      <p className="text-2xl font-bold" style={{ color: 'var(--brand-ink)' }}>{value}</p>
    </div>
  );
}