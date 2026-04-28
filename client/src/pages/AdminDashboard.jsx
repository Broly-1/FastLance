import React, { useState, useEffect, useCallback } from 'react';
import { useAuth } from '../context/useAuth';

const API = 'http://localhost:3000';

export default function AdminDashboard() {
  const { user } = useAuth();

  const [summary, setSummary]       = useState(null);
  const [topSellers, setTopSellers] = useState([]);
  const [disputes, setDisputes]     = useState([]);
  const [users, setUsers]           = useState([]);
  const [orders, setOrders]         = useState([]);
  const [tags, setTags]             = useState([]);
  const [gigs, setGigs]             = useState([]);
  const [reviews, setReviews]       = useState([]);
  const [loading, setLoading]       = useState(true);
  const [error, setError]           = useState('');

  // Active tab: 'overview' | 'users' | 'orders' | 'disputes' | 'tags'
  const [tab, setTab] = useState('overview');

  // User editing state
  const [editingUser, setEditingUser] = useState(null);

  // Dispute resolution state
  const [resolvingId, setResolvingId]         = useState(null);
  const [resolution, setResolution]           = useState('');
  const [orderAction, setOrderAction]         = useState('cancel');
  const [resolveSubmitting, setResolveSubmitting] = useState(false);
  const [resolveError, setResolveError]       = useState('');

  const fetchAll = useCallback(async () => {
    try {
      const headers = { 'x-user-role': user?.role || 'Admin' };
      const [summaryRes, sellersRes, disputesRes, usersRes, ordersRes, tagsRes, gigsRes, reviewsRes] = await Promise.all([
        fetch(`${API}/api/reports/platform-summary`, { headers }),
        fetch(`${API}/api/reports/top-sellers`, { headers }),
        fetch(`${API}/api/disputes`, { headers }),
        fetch(`${API}/api/users`, { headers }),
        fetch(`${API}/api/orders`, { headers }),
        fetch(`${API}/api/tags`, { headers }),
        fetch(`${API}/api/gigs/admin/all`, { headers }),
        fetch(`${API}/api/reviews/admin/all`, { headers })
      ]);
      if (!summaryRes.ok || !sellersRes.ok || !disputesRes.ok || !usersRes.ok || !ordersRes.ok || !tagsRes.ok || !gigsRes.ok || !reviewsRes.ok)
        throw new Error('Failed to fetch dashboard data.');
      setSummary(await summaryRes.json());
      setTopSellers(await sellersRes.json());
      setDisputes(await disputesRes.json());
      setUsers(await usersRes.json());
      setOrders(await ordersRes.json());
      setTags(await tagsRes.json());
      setGigs(await gigsRes.json());
      setReviews(await reviewsRes.json());
    } catch (err) {
      setError(err.message);
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => { fetchAll(); }, [fetchAll]);

  const handleResolve = async (e, disputeId) => {
    e.preventDefault();
    setResolveError('');
    const trimmed = resolution.trim();
    if (!trimmed) { setResolveError('Please enter a resolution note.'); return; }
    try {
      setResolveSubmitting(true);
      const res = await fetch(`${API}/api/disputes/${disputeId}`, {
        method: 'PUT',
        headers: { 
          'Content-Type': 'application/json',
          'x-user-role': user?.role || 'Admin'
        },
        body: JSON.stringify({ status: 'Resolved', resolution: trimmed, order_action: orderAction }),
      });
      if (!res.ok) throw new Error('Failed to resolve dispute.');
      setResolvingId(null);
      setResolution('');
      setOrderAction('cancel');
      await fetchAll();
    } catch (err) {
      setResolveError(err.message);
    } finally {
      setResolveSubmitting(false);
    }
  };

  const handleDeleteUser = async (userId, username) => {
    if (!window.confirm(`Permanently delete user "${username}"? This cannot be undone.`)) return;
    try {
      const res = await fetch(`${API}/api/users/${userId}`, {
        method: 'DELETE',
        headers: { 'x-user-role': user?.role || 'Admin' }
      });
      if (!res.ok) throw new Error('Failed to delete user.');
      await fetchAll();
    } catch (err) {
      alert(err.message);
    }
  };

  const handleToggleSuspendUser = async (userId, isActive) => {
    const action = isActive ? 'suspend' : 'activate';
    if (!window.confirm(`Are you sure you want to ${action} this user?`)) return;
    try {
      const res = await fetch(`${API}/api/users/${userId}/${action}`, {
        method: 'POST',
        headers: { 'x-user-role': user?.role || 'Admin' }
      });
      if (!res.ok) throw new Error(`Failed to ${action} user.`);
      await fetchAll();
    } catch (err) {
      alert(err.message);
    }
  };

  const handleUpdateUser = async (e) => {
    e.preventDefault();
    try {
      const res = await fetch(`${API}/api/users/${editingUser.user_id}`, {
        method: 'PUT',
        headers: { 
          'Content-Type': 'application/json',
          'x-user-role': user?.role || 'Admin' 
        },
        body: JSON.stringify(editingUser)
      });
      if (!res.ok) throw new Error('Failed to update user.');
      setEditingUser(null);
      await fetchAll();
    } catch (err) {
      alert(err.message);
    }
  };

  const handleDeleteOrder = async (orderId) => {
    if (!window.confirm(`Permanently delete Order #${orderId}? This cannot be undone.`)) return;
    try {
      const res = await fetch(`${API}/api/orders/${orderId}`, {
        method: 'DELETE',
        headers: { 'x-user-role': user?.role || 'Admin' }
      });
      if (!res.ok) throw new Error('Failed to delete order.');
      await fetchAll();
    } catch (err) {
      alert(err.message);
    }
  };

  const handleRefundOrder = async (orderId) => {
    const amountStr = window.prompt(`Issue refund for Order #${orderId}.\nEnter the refund amount:`);
    if (!amountStr) return;
    const amount = Number(amountStr);
    if (isNaN(amount) || amount <= 0) return alert('Invalid amount');
    
    const reason = window.prompt('Enter reason for refund:');
    if (!reason) return;

    try {
      const res = await fetch(`${API}/api/wallet/refund`, { 
        method: 'POST',
        headers: { 
          'Content-Type': 'application/json',
          'x-user-role': user?.role || 'Admin'
        },
        body: JSON.stringify({ order_id: orderId, amount, description: reason })
      });
      if (!res.ok) {
        const d = await res.json();
        throw new Error(d.error || 'Failed to process refund.');
      }
      alert('Refund processed successfully!');
      await fetchAll();
    } catch (err) {
      alert(err.message);
    }
  };

  const handleAddTag = async () => {
    const name = window.prompt('Enter new tag name:');
    if (!name || !name.trim()) return;
    try {
      const res = await fetch(`${API}/api/tags`, {
        method: 'POST',
        headers: { 
          'Content-Type': 'application/json',
          'x-user-role': user.role 
        },
        body: JSON.stringify({ name: name.trim() })
      });
      if (!res.ok) {
        const d = await res.json();
        throw new Error(d.error || 'Failed to add tag.');
      }
      await fetchAll();
    } catch (err) {
      alert(err.message);
    }
  };

  const handleDeleteTag = async (tagId, tagName) => {
    if (!window.confirm(`Permanently delete tag "${tagName}"? This may fail if it is attached to gigs.`)) return;
    try {
      const res = await fetch(`${API}/api/tags/${tagId}`, { 
        method: 'DELETE',
        headers: { 'x-user-role': user.role }
      });
      if (!res.ok) {
        const d = await res.json();
        throw new Error(d.error || 'Failed to delete tag.');
      }
      await fetchAll();
    } catch (err) {
      alert(err.message);
    }
  };

  const handleExportCSV = async () => {
    try {
      const res = await fetch(`${API}/api/reports/export`, {
        headers: { 'x-user-role': user?.role || 'Admin' }
      });
      if (!res.ok) throw new Error('Failed to fetch export data.');
      const data = await res.json();
      
      let csvContent = '';
      const processDataset = (dataset) => {
        if (!Array.isArray(dataset) || dataset.length === 0) return '';
        const headers = Object.keys(dataset[0]).join(',');
        const rows = dataset.map(item => 
          Object.values(item).map(val => {
            if (val === null || val === undefined) return '';
            return typeof val === 'string' ? `"${val.replace(/"/g, '""')}"` : val;
          }).join(',')
        );
        return [headers, ...rows].join('\n');
      };

      if (data && (data.users || data.gigs || data.orders)) {
        // Handle structured analytics data
        if (data.users)  csvContent += "=== USERS ===\n" + processDataset(data.users) + "\n\n";
        if (data.gigs)   csvContent += "=== GIGS ===\n" + processDataset(data.gigs) + "\n\n";
        if (data.orders) csvContent += "=== ORDERS ===\n" + processDataset(data.orders);
      } else if (Array.isArray(data)) {
        // Handle single array data
        csvContent = processDataset(data);
      }

      if (!csvContent.trim()) {
        alert('No data available to export.');
        return;
      }
      
      const csv = csvContent;
      
      const blob = new Blob([csv], { type: 'text/csv' });
      const url = window.URL.createObjectURL(blob);
      const a = document.createElement('a');
      a.setAttribute('hidden', '');
      a.setAttribute('href', url);
      a.setAttribute('download', 'export.csv');
      document.body.appendChild(a);
      a.click();
      document.body.removeChild(a);
    } catch (err) {
      alert(err.message);
    }
  };

  const handleDeleteGig = async (gigId, title) => {
    if (!window.confirm(`Permanently delete gig "${title}"? This cannot be undone.`)) return;
    try {
      const res = await fetch(`${API}/api/gigs/${gigId}`, {
        method: 'DELETE',
        headers: { 'x-user-role': user?.role || 'Admin' }
      });
      if (!res.ok) throw new Error('Failed to delete gig.');
      await fetchAll();
    } catch (err) {
      alert(err.message);
    }
  };

  const handleDeleteReview = async (reviewId) => {
    if (!window.confirm(`Permanently delete this review? This cannot be undone.`)) return;
    try {
      const res = await fetch(`${API}/api/reviews/${reviewId}`, {
        method: 'DELETE',
        headers: { 'x-user-role': user?.role || 'Admin' }
      });
      if (!res.ok) throw new Error('Failed to delete review.');
      await fetchAll();
    } catch (err) {
      alert(err.message);
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
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
        <div className="brand-surface p-6 text-center text-red-600">{error}</div>
      </div>
    );
  }

  const openDisputes = disputes.filter((d) => d.status === 'Open');
  const resolvedDisputes = disputes.filter((d) => d.status !== 'Open');

  const TABS = [
    { id: 'overview',  label: '📊 Overview' },
    { id: 'users',     label: `👥 Users (${users.length})` },
    { id: 'gigs',      label: `💼 Gigs (${gigs.length})` },
    { id: 'orders',    label: `📦 Orders (${orders.length})` },
    { id: 'disputes',  label: `⚠️ Disputes${openDisputes.length ? ` (${openDisputes.length})` : ''}` },
    { id: 'tags',      label: `🏷️ Tags (${tags.length})` },
    { id: 'reviews',   label: `⭐ Reviews (${reviews.length})` },
  ];

  return (
    <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8 w-full">

      {/* Page header */}
      <div className="brand-hero mb-6 px-6 py-7 sm:px-8">
        <h1 className="brand-page-title text-3xl font-bold">Administration</h1>
        <p className="brand-page-subtitle mt-1 text-sm">
          Logged in as <span className="font-semibold">{user?.username}</span>
        </p>
      </div>

      {/* Tab bar */}
      <div className="flex gap-2 mb-6 flex-wrap">
        {TABS.map((t) => (
          <button
            key={t.id}
            onClick={() => setTab(t.id)}
            className={`rounded-xl px-4 py-2 text-sm font-semibold transition border ${
              tab === t.id
                ? 'bg-[#1689ca] text-white border-[#1689ca]'
                : 'bg-white text-slate-600 border-[#d4e7f3] hover:border-[#2da8ed] hover:text-[#1689ca]'
            }`}
          >
            {t.label}
          </button>
        ))}
      </div>

      {/* ── OVERVIEW ── */}
      {tab === 'overview' && (
        <>
          <div className="flex justify-end mb-4">
            <button
              onClick={handleExportCSV}
              className="brand-button-primary rounded-lg px-4 py-2 text-sm font-semibold transition"
            >
              📥 Export Data to CSV
            </button>
          </div>
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-5 gap-4 mb-8">
            <StatCard label="Total Users"      value={summary?.total_users ?? 0}                                     icon="👥" />
            <StatCard label="Total Gigs"       value={summary?.total_gigs ?? 0}                                      icon="💼" />
            <StatCard label="Completed Orders" value={summary?.completed_orders ?? 0}                                icon="✅" />
            <StatCard label="Total Revenue"    value={`$${Number(summary?.total_revenue ?? 0).toLocaleString()}`}    icon="💰" />
            <StatCard label="Avg. Rating"      value={`${summary?.platform_avg_rating ?? 0} / 5`}                    icon="⭐" />
          </div>
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
                            {seller.username.charAt(0).toUpperCase()}
                          </div>
                          <div>
                            <p className="font-semibold text-sm" style={{ color: 'var(--brand-ink)' }}>{seller.username}</p>
                            <p className="text-xs" style={{ color: 'var(--brand-muted)' }}>Rank #{idx + 1}</p>
                          </div>
                        </div>
                      </td>
                      <td className="px-6 py-4 text-center"><span className="brand-chip rounded-full px-3 py-1 text-xs font-semibold">{seller.total_orders}</span></td>
                      <td className="px-6 py-4 text-center"><span className="brand-chip-warm rounded-full px-3 py-1 text-xs font-semibold">⭐ {Number(seller.avg_rating).toFixed(2)}</span></td>
                      <td className="px-6 py-4 text-center text-sm" style={{ color: 'var(--brand-muted)' }}>{seller.total_reviews}</td>
                    </tr>
                  ))}
                  {topSellers.length === 0 && (
                    <tr><td colSpan="4" className="px-6 py-16 text-center text-sm" style={{ color: 'var(--brand-muted)' }}>No completed orders found yet.</td></tr>
                  )}
                </tbody>
              </table>
            </div>
          </div>
        </>
      )}

      {/* ── USERS ── */}
      {tab === 'users' && (
        <div className="brand-surface overflow-hidden">
          <div className="px-6 py-5 border-b" style={{ borderColor: 'var(--brand-line)' }}>
            <h3 className="brand-page-title text-lg font-bold">All Users</h3>
          </div>
          <div className="overflow-x-auto">
            <table className="w-full text-left">
              <thead>
                <tr className="text-xs uppercase tracking-wide border-b" style={{ borderColor: 'var(--brand-line)', color: 'var(--brand-muted)' }}>
                  <th className="px-6 py-4 font-semibold">User</th>
                  <th className="px-6 py-4 font-semibold">Role</th>
                  <th className="px-6 py-4 font-semibold">Balance</th>
                  <th className="px-6 py-4 font-semibold">Status</th>
                  <th className="px-6 py-4 font-semibold">Joined</th>
                  <th className="px-6 py-4 font-semibold text-right">Action</th>
                </tr>
              </thead>
              <tbody className="divide-y" style={{ borderColor: 'var(--brand-line)' }}>
                {users.map((u) => (
                  <tr key={u.user_id} className="transition-colors hover:bg-[#f1fbff]">
                    <td className="px-6 py-4">
                      <p className="font-semibold text-sm" style={{ color: 'var(--brand-ink)' }}>{u.username}</p>
                      <p className="text-xs" style={{ color: 'var(--brand-muted)' }}>{u.email}</p>
                    </td>
                    <td className="px-6 py-4">
                      <span className="brand-chip rounded-full px-2.5 py-1 text-xs font-semibold">{u.role}</span>
                    </td>
                    <td className="px-6 py-4 text-sm font-medium" style={{ color: 'var(--brand-ink)' }}>
                      ${Number(u.wallet_balance ?? 0).toFixed(2)}
                    </td>
                    <td className="px-6 py-4">
                      {u.is_active
                        ? <span className="brand-status brand-status-completed">Active</span>
                        : <span className="brand-status brand-status-cancelled">Suspended</span>}
                    </td>
                    <td className="px-6 py-4 text-sm" style={{ color: 'var(--brand-muted)' }}>
                      {new Date(u.created_at).toLocaleDateString()}
                    </td>
                    <td className="px-6 py-4 text-right">
                      {u.role !== 'Admin' && (
                        <div className="flex justify-end gap-2">
                          <button
                            onClick={() => setEditingUser(u)}
                            className="rounded-lg border border-blue-200 bg-white px-3 py-1.5 text-xs font-semibold text-blue-600 transition hover:bg-blue-50"
                          >
                            Edit
                          </button>
                          <button
                            onClick={() => handleToggleSuspendUser(u.user_id, u.is_active)}
                            className="rounded-lg border border-orange-200 bg-white px-3 py-1.5 text-xs font-semibold text-orange-600 transition hover:bg-orange-50"
                          >
                            {u.is_active ? 'Suspend' : 'Activate'}
                          </button>
                          <button
                            onClick={() => handleDeleteUser(u.user_id, u.username)}
                            className="rounded-lg border border-red-200 bg-white px-3 py-1.5 text-xs font-semibold text-red-600 transition hover:bg-red-50"
                          >
                            Delete
                          </button>
                        </div>
                      )}
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </div>
      )}

      {/* ── GIGS ── */}
      {tab === 'gigs' && (
        <div className="brand-surface overflow-hidden">
          <div className="px-6 py-5 border-b" style={{ borderColor: 'var(--brand-line)' }}>
            <h3 className="brand-page-title text-lg font-bold">All Gigs</h3>
          </div>
          <div className="overflow-x-auto">
            <table className="w-full text-left">
              <thead>
                <tr className="text-xs uppercase tracking-wide border-b" style={{ borderColor: 'var(--brand-line)', color: 'var(--brand-muted)' }}>
                  <th className="px-6 py-4 font-semibold">Title</th>
                  <th className="px-6 py-4 font-semibold">Seller</th>
                  <th className="px-6 py-4 font-semibold">Price</th>
                  <th className="px-6 py-4 font-semibold">Status</th>
                  <th className="px-6 py-4 font-semibold">Created</th>
                  <th className="px-6 py-4 font-semibold text-right">Action</th>
                </tr>
              </thead>
              <tbody className="divide-y" style={{ borderColor: 'var(--brand-line)' }}>
                {gigs.map((g) => (
                  <tr key={g.gig_id} className="transition-colors hover:bg-[#f1fbff]">
                    <td className="px-6 py-4">
                      <p className="font-semibold text-sm max-w-[250px] truncate" style={{ color: 'var(--brand-ink)' }}>{g.title}</p>
                    </td>
                    <td className="px-6 py-4 text-sm" style={{ color: 'var(--brand-ink)' }}>{g.seller_name}</td>
                    <td className="px-6 py-4 text-sm font-medium" style={{ color: 'var(--brand-ink)' }}>
                      ${Number(g.price).toFixed(2)}
                    </td>
                    <td className="px-6 py-4">
                      {g.is_active
                        ? <span className="brand-status brand-status-completed">Active</span>
                        : <span className="brand-status brand-status-cancelled">Inactive</span>}
                    </td>
                    <td className="px-6 py-4 text-sm" style={{ color: 'var(--brand-muted)' }}>
                      {new Date(g.created_at).toLocaleDateString()}
                    </td>
                    <td className="px-6 py-4 text-right">
                      <button
                        onClick={() => handleDeleteGig(g.gig_id, g.title)}
                        className="rounded-lg border border-red-200 bg-white px-3 py-1.5 text-xs font-semibold text-red-600 transition hover:bg-red-50"
                      >
                        Delete
                      </button>
                    </td>
                  </tr>
                ))}
                {gigs.length === 0 && (
                  <tr><td colSpan="6" className="px-6 py-16 text-center text-sm" style={{ color: 'var(--brand-muted)' }}>No gigs found.</td></tr>
                )}
              </tbody>
            </table>
          </div>
        </div>
      )}

      {/* ── ORDERS ── */}
      {tab === 'orders' && (
        <div className="brand-surface overflow-hidden">
          <div className="px-6 py-5 border-b" style={{ borderColor: 'var(--brand-line)' }}>
            <h3 className="brand-page-title text-lg font-bold">All Orders</h3>
          </div>
          <div className="overflow-x-auto">
            <table className="w-full text-left">
              <thead>
                <tr className="text-xs uppercase tracking-wide border-b" style={{ borderColor: 'var(--brand-line)', color: 'var(--brand-muted)' }}>
                  <th className="px-6 py-4 font-semibold">#</th>
                  <th className="px-6 py-4 font-semibold">Gig</th>
                  <th className="px-6 py-4 font-semibold">Buyer</th>
                  <th className="px-6 py-4 font-semibold">Seller</th>
                  <th className="px-6 py-4 font-semibold">Amount</th>
                  <th className="px-6 py-4 font-semibold">Status</th>
                  <th className="px-6 py-4 font-semibold">Date</th>
                  <th className="px-6 py-4 font-semibold text-right">Action</th>
                </tr>
              </thead>
              <tbody className="divide-y" style={{ borderColor: 'var(--brand-line)' }}>
                {orders.map((o) => (
                  <tr key={o.order_id} className="transition-colors hover:bg-[#f1fbff]">
                    <td className="px-6 py-4 text-sm font-mono" style={{ color: 'var(--brand-muted)' }}>#{o.order_id}</td>
                    <td className="px-6 py-4 max-w-[200px]">
                      <p className="text-sm font-medium truncate" style={{ color: 'var(--brand-ink)' }}>{o.gig_title}</p>
                    </td>
                    <td className="px-6 py-4 text-sm" style={{ color: 'var(--brand-ink)' }}>{o.buyer_name}</td>
                    <td className="px-6 py-4 text-sm" style={{ color: 'var(--brand-ink)' }}>{o.seller_name}</td>
                    <td className="px-6 py-4 text-sm font-semibold" style={{ color: 'var(--brand-ink)' }}>
                      ${Number(o.total_price).toFixed(2)}
                    </td>
                    <td className="px-6 py-4">
                      <OrderStatusBadge status={o.status} />
                    </td>
                    <td className="px-6 py-4 text-sm" style={{ color: 'var(--brand-muted)' }}>
                      {new Date(o.order_date).toLocaleDateString()}
                    </td>
                    <td className="px-6 py-4 text-right">
                      <div className="flex justify-end gap-2">
                        <button
                          onClick={() => handleRefundOrder(o.order_id)}
                          className="rounded-lg border border-blue-200 bg-white px-3 py-1.5 text-xs font-semibold text-blue-600 transition hover:bg-blue-50"
                        >
                          Refund
                        </button>
                        <button
                          onClick={() => handleDeleteOrder(o.order_id)}
                          className="rounded-lg border border-red-200 bg-white px-3 py-1.5 text-xs font-semibold text-red-600 transition hover:bg-red-50"
                        >
                          Delete
                        </button>
                      </div>
                    </td>
                  </tr>
                ))}
                {orders.length === 0 && (
                  <tr><td colSpan="8" className="px-6 py-16 text-center text-sm" style={{ color: 'var(--brand-muted)' }}>No orders yet.</td></tr>
                )}
              </tbody>
            </table>
          </div>
        </div>
      )}

      {/* ── TAGS ── */}
      {tab === 'tags' && (
        <div className="brand-surface overflow-hidden">
          <div className="px-6 py-5 border-b flex items-center justify-between" style={{ borderColor: 'var(--brand-line)' }}>
            <h3 className="brand-page-title text-lg font-bold">Manage Tags</h3>
            <button
              onClick={handleAddTag}
              className="brand-button-primary rounded-lg px-4 py-2 text-sm font-semibold transition"
            >
              + Create Tag
            </button>
          </div>
          <div className="overflow-x-auto">
            <table className="w-full text-left">
              <thead>
                <tr className="text-xs uppercase tracking-wide border-b" style={{ borderColor: 'var(--brand-line)', color: 'var(--brand-muted)' }}>
                  <th className="px-6 py-4 font-semibold">ID</th>
                  <th className="px-6 py-4 font-semibold">Tag Name</th>
                  <th className="px-6 py-4 font-semibold text-right">Action</th>
                </tr>
              </thead>
              <tbody className="divide-y" style={{ borderColor: 'var(--brand-line)' }}>
                {tags.map((t) => (
                  <tr key={t.tag_id} className="transition-colors hover:bg-[#f1fbff]">
                    <td className="px-6 py-4 text-sm font-mono" style={{ color: 'var(--brand-muted)' }}>{t.tag_id}</td>
                    <td className="px-6 py-4 text-sm font-medium" style={{ color: 'var(--brand-ink)' }}>{t.name}</td>
                    <td className="px-6 py-4 text-right">
                      <button
                        onClick={() => handleDeleteTag(t.tag_id, t.name)}
                        className="rounded-lg border border-red-200 bg-white px-3 py-1.5 text-xs font-semibold text-red-600 transition hover:bg-red-50"
                      >
                        Delete
                      </button>
                    </td>
                  </tr>
                ))}
                {tags.length === 0 && (
                  <tr><td colSpan="3" className="px-6 py-16 text-center text-sm" style={{ color: 'var(--brand-muted)' }}>No tags found.</td></tr>
                )}
              </tbody>
            </table>
          </div>
        </div>
      )}

      {/* ── DISPUTES ── */}
      {tab === 'disputes' && (
        <div className="brand-surface overflow-hidden">
          <div className="px-6 py-5 border-b flex items-center justify-between" style={{ borderColor: 'var(--brand-line)' }}>
            <h3 className="brand-page-title text-lg font-bold">⚠️ Dispute Management</h3>
            {openDisputes.length > 0 && (
              <span className="brand-status border-red-200 bg-red-50 text-red-700">{openDisputes.length} Open</span>
            )}
          </div>
          {disputes.length === 0 ? (
            <div className="px-6 py-16 text-center text-sm" style={{ color: 'var(--brand-muted)' }}>No disputes have been raised yet.</div>
          ) : (
            <div className="divide-y" style={{ borderColor: 'var(--brand-line)' }}>
              {[...openDisputes, ...resolvedDisputes].map((d) => (
                <div key={d.dispute_id} className="px-6 py-5">
                  <div className="flex flex-col sm:flex-row sm:items-start sm:justify-between gap-3">
                    <div className="flex-1 min-w-0">
                      <div className="flex items-center gap-2 mb-1 flex-wrap">
                        <span className="font-bold text-sm" style={{ color: 'var(--brand-ink)' }}>Dispute #{d.dispute_id}</span>
                        <span className={`brand-status ${d.status === 'Open' ? 'border-red-200 bg-red-50 text-red-700' : 'brand-status-completed'}`}>{d.status}</span>
                        <span className="brand-chip rounded-full px-2 py-0.5 text-xs">Order #{d.order_id}</span>
                      </div>
                      <p className="text-xs mb-1" style={{ color: 'var(--brand-muted)' }}>
                        {d.gig_title} · Raised by <span className="font-semibold" style={{ color: 'var(--brand-ink)' }}>{d.raised_by_name}</span>
                        {' · '}{new Date(d.created_at).toLocaleDateString()}
                      </p>
                      <p className="text-sm mt-2 rounded-lg border border-red-100 bg-red-50 px-3 py-2" style={{ color: 'var(--brand-ink)' }}>{d.reason}</p>
                      {d.resolution && (
                        <p className="text-sm mt-2 rounded-lg border border-[#c9e8d5] bg-[#edf9f2] px-3 py-2">
                          <span className="font-semibold text-[#1b7850]">Resolution: </span>{d.resolution}
                        </p>
                      )}
                    </div>
                    {d.status === 'Open' && (
                      <div className="sm:ml-4 flex-shrink-0">
                        {resolvingId !== d.dispute_id ? (
                          <button
                            onClick={() => { setResolvingId(d.dispute_id); setResolution(''); setResolveError(''); }}
                            className="brand-button-primary rounded-lg px-4 py-2 text-sm font-semibold transition"
                          >
                            Resolve
                          </button>
                        ) : (
                          <form onSubmit={(e) => handleResolve(e, d.dispute_id)} className="space-y-2 w-56">
                            <div>
                              <label className="block text-xs font-medium mb-1" style={{ color: 'var(--brand-muted)' }}>Order Outcome</label>
                              <select
                                value={orderAction}
                                onChange={(e) => setOrderAction(e.target.value)}
                                className="brand-input text-sm"
                              >
                                <option value="cancel">↩️ Refund Buyer (Cancel)</option>
                                <option value="complete">✅ Pay Seller (Complete)</option>
                              </select>
                            </div>
                            <textarea
                              rows="3"
                              required
                              className="brand-input text-sm"
                              placeholder="Enter resolution note..."
                              value={resolution}
                              onChange={(e) => setResolution(e.target.value)}
                            />
                            {resolveError && <p className="text-xs text-red-600">{resolveError}</p>}
                            <div className="flex gap-2">
                              <button type="submit" disabled={resolveSubmitting}
                                className="flex-1 brand-button-primary rounded-lg py-1.5 text-xs font-semibold transition disabled:opacity-60">
                                {resolveSubmitting ? 'Saving...' : 'Confirm'}
                              </button>
                              <button type="button" onClick={() => setResolvingId(null)}
                                className="brand-button-neutral rounded-lg px-3 py-1.5 text-xs font-semibold transition">
                                Cancel
                              </button>
                            </div>
                          </form>
                        )}
                      </div>
                    )}
                  </div>
                </div>
              ))}
            </div>
          )}
        </div>
      )}

      {/* ── REVIEWS ── */}
      {tab === 'reviews' && (
        <div className="brand-surface overflow-hidden">
          <div className="px-6 py-5 border-b" style={{ borderColor: 'var(--brand-line)' }}>
            <h3 className="brand-page-title text-lg font-bold">All Reviews</h3>
          </div>
          <div className="overflow-x-auto">
            <table className="w-full text-left">
              <thead>
                <tr className="text-xs uppercase tracking-wide border-b" style={{ borderColor: 'var(--brand-line)', color: 'var(--brand-muted)' }}>
                  <th className="px-6 py-4 font-semibold">Review ID</th>
                  <th className="px-6 py-4 font-semibold">Gig ID</th>
                  <th className="px-6 py-4 font-semibold">Order ID</th>
                  <th className="px-6 py-4 font-semibold">Reviewer</th>
                  <th className="px-6 py-4 font-semibold">Rating</th>
                  <th className="px-6 py-4 font-semibold max-w-[200px]">Comment</th>
                  <th className="px-6 py-4 font-semibold">Date</th>
                  <th className="px-6 py-4 font-semibold text-right">Action</th>
                </tr>
              </thead>
              <tbody className="divide-y" style={{ borderColor: 'var(--brand-line)' }}>
                {reviews.map((r) => (
                  <tr key={r.review_id} className="transition-colors hover:bg-[#f1fbff]">
                    <td className="px-6 py-4 text-sm font-mono" style={{ color: 'var(--brand-muted)' }}>#{r.review_id}</td>
                    <td className="px-6 py-4 text-sm font-mono" style={{ color: 'var(--brand-muted)' }}>#{r.gig_id}</td>
                    <td className="px-6 py-4 text-sm font-mono" style={{ color: 'var(--brand-muted)' }}>#{r.order_id}</td>
                    <td className="px-6 py-4 text-sm" style={{ color: 'var(--brand-ink)' }}>{r.reviewer_name}</td>
                    <td className="px-6 py-4 text-sm font-medium" style={{ color: 'var(--brand-ink)' }}>
                      ⭐ {Number(r.rating).toFixed(1)}
                    </td>
                    <td className="px-6 py-4 text-sm max-w-[200px] truncate" title={r.comment} style={{ color: 'var(--brand-ink)' }}>
                      {r.comment}
                    </td>
                    <td className="px-6 py-4 text-sm" style={{ color: 'var(--brand-muted)' }}>
                      {new Date(r.created_at).toLocaleDateString()}
                    </td>
                    <td className="px-6 py-4 text-right">
                      <button
                        onClick={() => handleDeleteReview(r.review_id)}
                        className="rounded-lg border border-red-200 bg-white px-3 py-1.5 text-xs font-semibold text-red-600 transition hover:bg-red-50"
                      >
                        Delete
                      </button>
                    </td>
                  </tr>
                ))}
                {reviews.length === 0 && (
                  <tr><td colSpan="8" className="px-6 py-16 text-center text-sm" style={{ color: 'var(--brand-muted)' }}>No reviews found.</td></tr>
                )}
              </tbody>
            </table>
          </div>
        </div>
      )}

      {/* ── EDIT USER MODAL ── */}
      {editingUser && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/60 backdrop-blur-sm">
          <div className="brand-surface w-full max-w-md p-8 animate-in fade-in zoom-in duration-200 rotate-[0.5deg]">
            <h3 className="text-xl font-black text-[#0f172a] uppercase italic mb-6">Edit User Profile</h3>
            <form onSubmit={handleUpdateUser} className="space-y-4">
              <div className="space-y-1">
                <label className="text-[10px] font-black uppercase tracking-widest text-[#50616b]">Username</label>
                <input 
                  type="text" 
                  value={editingUser.username} 
                  onChange={e => setEditingUser({...editingUser, username: e.target.value})} 
                  className="brand-input text-sm"
                  required
                />
              </div>
              <div className="space-y-1">
                <label className="text-[10px] font-black uppercase tracking-widest text-[#50616b]">Email</label>
                <input 
                  type="email" 
                  value={editingUser.email} 
                  onChange={e => setEditingUser({...editingUser, email: e.target.value})} 
                  className="brand-input text-sm"
                  required
                />
              </div>
              <div className="space-y-1">
                <label className="text-[10px] font-black uppercase tracking-widest text-[#50616b]">Role</label>
                <select 
                  value={editingUser.role} 
                  onChange={e => setEditingUser({...editingUser, role: e.target.value})} 
                  className="brand-input text-sm"
                >
                  <option value="Buyer">Buyer</option>
                  <option value="Seller">Seller</option>
                  <option value="Both">Both</option>
                </select>
              </div>
              <div className="space-y-1">
                <label className="text-[10px] font-black uppercase tracking-widest text-[#50616b]">Profile Pic URL</label>
                <input 
                  type="url" 
                  value={editingUser.profile_pic_url || ''} 
                  onChange={e => setEditingUser({...editingUser, profile_pic_url: e.target.value})} 
                  className="brand-input text-sm"
                  placeholder="https://..."
                />
              </div>
              <div className="space-y-1">
                <label className="text-[10px] font-black uppercase tracking-widest text-[#50616b]">Bio</label>
                <textarea 
                  value={editingUser.bio || ''} 
                  onChange={e => setEditingUser({...editingUser, bio: e.target.value})} 
                  className="brand-input text-sm"
                  rows="3"
                />
              </div>
              <div className="flex gap-4 pt-4">
                <button type="submit" className="brand-button-primary flex-1 py-3 text-xs uppercase tracking-widest font-black">
                  Save Changes
                </button>
                <button 
                  type="button" 
                  onClick={() => setEditingUser(null)} 
                  className="brand-button-neutral px-8 text-xs uppercase tracking-widest font-black"
                >
                  Cancel
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
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

function OrderStatusBadge({ status }) {
  const map = {
    Pending:      'brand-status-pending',
    'In Progress':'brand-status-progress',
    Delivered:    'brand-status-delivered',
    Completed:    'brand-status-completed',
    Cancelled:    'brand-status-cancelled',
    Disputed:     'border-red-200 bg-red-50 text-red-700',
  };
  return <span className={`brand-status ${map[status] ?? ''}`}>{status}</span>;
}