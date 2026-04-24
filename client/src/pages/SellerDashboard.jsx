import React, { useState, useEffect } from 'react';
import { useAuth } from '../context/useAuth';
import { useNavigate } from 'react-router-dom';

export default function SellerDashboard() {
  const { user } = useAuth();
  const navigate = useNavigate();
  const [gigs, setGigs] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);

  // Form State
  const [showForm, setShowForm] = useState(false);
  const [title, setTitle] = useState('');
  const [description, setDescription] = useState('');
  const [category, setCategory] = useState('Programming');
  const [price, setPrice] = useState('');
  const [deliveryDays, setDeliveryDays] = useState('');
  const [revisionLimit, setRevisionLimit] = useState(1);

  // Fetch Seller's Gigs
  useEffect(() => {
    const fetchGigs = async () => {
      try {
        const response = await fetch(`http://localhost:3000/api/gigs/seller/${user.id}`);
        if (!response.ok) {
          throw new Error('Failed to fetch gigs');
        }
        const data = await response.json();
        setGigs(data);
      } catch (err) {
        setError(err.message);
      } finally {
        setLoading(false);
      }
    };
    if (user?.id) fetchGigs();
  }, [user]);

  const handleCreateGig = async (e) => {
    e.preventDefault();
    try {
      const gigData = {
        seller_id: user.id,
        title,
        description,
        category,
        price: parseFloat(price),
        delivery_days: parseInt(deliveryDays, 10),
        revision_limit: parseInt(revisionLimit, 10),
        thumbnail_url: 'https://via.placeholder.com/400x300?text=Service+Thumbnail' // Placeholder
      };

      const response = await fetch('http://localhost:3000/api/gigs', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(gigData)
      });

      if (!response.ok) {
        throw new Error('Failed to create gig');
      }

      const resData = await response.json();
      const newGig = { gig_id: resData.gig_id || resData.insertId, ...gigData, is_active: 1 };
      
      setGigs([newGig, ...gigs]);
      setShowForm(false);
      // Reset Form
      setTitle('');
      setDescription('');
      setPrice('');
      setDeliveryDays('');
      
    } catch (err) {
      alert(err.message);
    }
  };

  return (
    <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8 w-full">
      <div className="flex justify-between items-center mb-8">
        <div className="brand-hero flex-1 px-6 py-7 sm:px-8">
          <p className="mb-2 text-xs font-semibold uppercase tracking-[0.24em] text-[#0f699e]">Creator workspace</p>
          <h1 className="brand-page-title text-3xl font-bold">Seller Dashboard</h1>
          <p className="brand-page-subtitle mt-1 text-sm">Manage your active services and listings.</p>
        </div>
        <button 
          onClick={() => setShowForm(!showForm)}
          className="brand-button-primary ml-4 rounded-xl px-4 py-2.5 font-medium transition shadow-sm"
        >
          {showForm ? 'Cancel' : '+ Create New Gig'}
        </button>
      </div>

      {/* Create Gig Form */}
      {showForm && (
        <div className="brand-surface mb-8 p-6">
          <h2 className="mb-4 text-xl font-semibold text-slate-800">Create a New Service (Gig)</h2>
          <form onSubmit={handleCreateGig} className="space-y-4">
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              <div className="md:col-span-2">
                <label className="mb-1 block text-sm font-medium text-slate-700">Gig Title</label>
                <input required type="text" value={title} onChange={e=>setTitle(e.target.value)} className="brand-input" placeholder="I will build a fullstack React application..." />
              </div>
              <div className="md:col-span-2">
                <label className="mb-1 block text-sm font-medium text-slate-700">Description</label>
                <textarea required rows="3" value={description} onChange={e=>setDescription(e.target.value)} className="brand-input" placeholder="Describe what you will do..." />
              </div>
              <div>
                <label className="mb-1 block text-sm font-medium text-slate-700">Category</label>
                <select value={category} onChange={e=>setCategory(e.target.value)} className="brand-input">
                  <option value="Programming">Programming</option>
                  <option value="Graphics">Graphics & Design</option>
                  <option value="Writing">Writing & Translation</option>
                  <option value="Video">Video & Animation</option>
                  <option value="Marketing">Digital Marketing</option>
                </select>
              </div>
              <div>
                <label className="mb-1 block text-sm font-medium text-slate-700">Price ($)</label>
                <input required type="number" min="5" step="0.01" value={price} onChange={e=>setPrice(e.target.value)} className="brand-input" placeholder="50.00" />
              </div>
              <div>
                <label className="mb-1 block text-sm font-medium text-slate-700">Delivery Time (Days)</label>
                <input required type="number" min="1" value={deliveryDays} onChange={e=>setDeliveryDays(e.target.value)} className="brand-input" placeholder="3" />
              </div>
              <div>
                <label className="mb-1 block text-sm font-medium text-slate-700">Revision Limit</label>
                <input required type="number" min="0" value={revisionLimit} onChange={e=>setRevisionLimit(e.target.value)} className="brand-input" placeholder="1" />
              </div>
            </div>
            <div className="pt-4 flex justify-end">
              <button type="submit" className="brand-button-primary rounded-xl px-6 py-2.5 font-medium transition shadow-sm">
                Publish Gig
              </button>
            </div>
          </form>
        </div>
      )}

      {/* Gigs List */}
      <div>
        <h2 className="mb-4 text-xl font-semibold text-slate-800">Your Active Gigs</h2>
        {loading ? (
          <p className="text-slate-500">Loading your gigs...</p>
        ) : error ? (
          <p className="text-red-500">Error: {error}</p>
        ) : gigs.length === 0 ? (
          <div className="brand-surface p-8 text-center">
            <p className="text-slate-500">You haven't created any gigs yet.</p>
          </div>
        ) : (
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-6">
            {gigs.map(gig => (
              <div key={gig.gig_id} className="brand-surface flex cursor-pointer flex-col overflow-hidden transition hover:shadow-md" onClick={() => navigate(`/gigs/${gig.gig_id}`)}>
                <img src={gig.thumbnail_url || 'https://via.placeholder.com/400x300?text=No+Image'} alt={gig.title} className="w-full h-48 object-cover" />
                <div className="p-4 flex-grow flex flex-col">
                  <div className="flex justify-between items-start mb-2">
                    <span className="brand-chip rounded-full px-3 py-1 text-xs font-semibold uppercase tracking-wide">{gig.category}</span>
                    <span className={`text-xs px-2 py-1 rounded-full font-medium ${gig.is_active ? 'bg-green-100 text-green-800' : 'bg-red-100 text-red-800'}`}>
                      {gig.is_active ? 'Active' : 'Paused'}
                    </span>
                  </div>
                  <h3 className="mb-1 line-clamp-2 text-xl font-bold text-slate-900">{gig.title}</h3>
                  <div className="mt-auto pt-4 flex items-center justify-between">
                    <span className="text-sm text-slate-500">Delivery: {gig.delivery_days} days</span>
                    <span className="text-xl font-extrabold text-slate-900">${gig.price}</span>
                  </div>
                </div>
              </div>
            ))}
          </div>
        )}
      </div>
    </div>
  );
}
