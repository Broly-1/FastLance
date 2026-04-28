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
  const [availableTags, setAvailableTags] = useState([]);
  const [tags, setTags] = useState([]);
  const [thumbnailUrl, setThumbnailUrl] = useState('');
  const [editingGigId, setEditingGigId] = useState(null);

  
  useEffect(() => {
    const fetchSystemTags = async () => {
      try {
        const res = await fetch('http://localhost:3000/api/tags');
        if (res.ok) {
          const data = await res.json();
          setAvailableTags(data);
        }
      } catch (err) {
        console.error("Error fetching tags", err);
      }
    };
    fetchSystemTags();
  }, []);

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
        thumbnail_url: thumbnailUrl.trim() || 'https://via.placeholder.com/400x300?text=Service+Thumbnail'
      };

      const url = editingGigId 
        ? `http://localhost:3000/api/gigs/${editingGigId}`
        : 'http://localhost:3000/api/gigs';
      
      const method = editingGigId ? 'PUT' : 'POST';

      const response = await fetch(url, {
        method,
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(gigData)
      });

      if (!response.ok) {
        throw new Error(`Failed to ${editingGigId ? 'update' : 'create'} gig`);
      }

      if (editingGigId) {
        // Update local state
        setGigs(gigs.map(g => g.gig_id === editingGigId ? { ...g, ...gigData } : g));
        alert('Gig updated successfully!');
      } else {
        const resData = await response.json();
        const newGigId = resData.gig_id || resData.insertId;
        const newGig = { gig_id: newGigId, ...gigData, is_active: 1 };
        
        if (tags.length > 0) {
          await Promise.all(tags.map(tag => 
            fetch(`http://localhost:3000/api/gigs/${newGigId}/tags`, {
              method: 'POST',
              headers: { 'Content-Type': 'application/json' },
              body: JSON.stringify({ name: tag })
            })
          ));
        }
        setGigs([newGig, ...gigs]);
        alert('Gig published successfully!');
      }

      // Reset and close
      setShowForm(false);
      setEditingGigId(null);
      setTitle('');
      setDescription('');
      setPrice('');
      setDeliveryDays('');
      setRevisionLimit(1);
      setThumbnailUrl('');
      setTags([]);
      
    } catch (err) {
      alert(err.message);
    }
  };

  const handleEditClick = (gig) => {
    setEditingGigId(gig.gig_id);
    setTitle(gig.title);
    setDescription(gig.description);
    setCategory(gig.category);
    setPrice(gig.price);
    setDeliveryDays(gig.delivery_days);
    setRevisionLimit(gig.revision_limit);
    setThumbnailUrl(gig.thumbnail_url || '');
    // Tags are tricky as we need to fetch them for the gig
    // For now we just reset tags or let user re-select
    setTags([]); 
    setShowForm(true);
    window.scrollTo({ top: 0, behavior: 'smooth' });
  };

  return (
    <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8 w-full">
      <div className="flex flex-col md:flex-row justify-between items-start md:items-center mb-10 gap-4">
        <div className="relative">
          <h1 className="brand-page-title text-4xl font-black font-spline text-[#0f172a] rotate-[-1deg]">Seller Dashboard</h1>
          <div className="absolute -bottom-2 left-0 w-full h-3 bg-[#fef08a] -z-10 opacity-60"></div>
          <div className="flex gap-4 mt-2">
            <p className="text-[#50616b] font-medium italic">Manage your active services and listings.</p>
            <button onClick={() => navigate('/reports')} className="text-xs font-bold text-[#1689ca] hover:underline">View Analytics & Reports →</button>
          </div>
        </div>
        <button 
          onClick={() => setShowForm(!showForm)}
          className="brand-button-primary rounded-xl px-6 py-3 font-bold transition shadow-md hover:-translate-y-1 active:translate-y-0"
        >
          {showForm ? 'Cancel' : '+ Create New Gig'}
        </button>
      </div>

      {/* Create Gig Form */}
      {showForm && (
        <div className="brand-surface mb-8 p-6">
          <h2 className="mb-4 text-xl font-semibold text-slate-800">{editingGigId ? 'Edit Your Service' : 'Create a New Service (Gig)'}</h2>
          <form onSubmit={handleCreateGig} className="space-y-4">
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              <div className="md:col-span-2">
                <label className="mb-1 block text-sm font-medium text-slate-700">Gig Title</label>
                <input required type="text" value={title} onChange={e=>setTitle(e.target.value)} className="brand-input" placeholder="I will build a fullstack React application..." />
              </div>
              <div className="md:col-span-2">
                <label className="mb-1 block text-sm font-medium text-slate-700">Thumbnail Image URL (Direct Link)</label>
                <input type="url" value={thumbnailUrl} onChange={e=>setThumbnailUrl(e.target.value)} className="brand-input" placeholder="https://images.unsplash.com/photo-..." />
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
              <div className="md:col-span-2">
                <label className="mb-1 block text-sm font-medium text-slate-700">Select Tags</label>
                <div className="flex flex-wrap gap-3 mt-2">
                  {availableTags.length === 0 ? (
                    <p className="text-sm text-slate-500">No tags available (Admins can add tags).</p>
                  ) : (
                    availableTags.map((tag) => (
                      <label key={tag.tag_id} className="flex items-center gap-2 text-sm text-slate-700 bg-white border border-slate-200 px-3 py-1.5 rounded-full cursor-pointer hover:bg-slate-50">
                        <input 
                          type="checkbox" 
                          value={tag.name}
                          checked={tags.includes(tag.name)}
                          onChange={(e) => {
                            if (e.target.checked) setTags([...tags, tag.name]);
                            else setTags(tags.filter(t => t !== tag.name));
                          }}
                          className="h-4 w-4 rounded border-slate-300 text-[#0f699e] focus:ring-[#0f699e]"
                        />
                        {tag.name}
                      </label>
                    ))
                  )}
                </div>
              </div>
            </div>
            <div className="pt-4 flex justify-end">
              <button type="submit" className="brand-button-primary rounded-xl px-6 py-2.5 font-medium transition shadow-sm">
                {editingGigId ? 'Save Changes' : 'Publish Gig'}
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
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-8">
            {gigs.map(gig => (
              <div key={gig.gig_id} className="brand-card-sticky group" onClick={() => navigate(`/gigs/${gig.gig_id}`)}>
                <div className="relative h-48 mb-4 overflow-hidden border-2 border-[#0f172a]" style={{ borderRadius: '15px 225px 15px 255px / 255px 15px 225px 15px' }}>
                  <img src={gig.thumbnail_url || 'https://via.placeholder.com/400x300?text=No+Image'} alt={gig.title} className="w-full h-full object-cover transition-transform duration-500 group-hover:scale-110" />
                  <div className="absolute top-2 right-2 bg-white border-2 border-[#0f172a] px-2 py-0.5 text-[10px] font-bold uppercase rotate-[2deg]">
                    {gig.is_active ? 'Active' : 'Paused'}
                  </div>
                </div>
                
                <div className="flex-grow flex flex-col">
                  <div className="flex justify-between items-start mb-3">
                    <span className="bg-[#e0f2fe] border-2 border-[#0f172a] px-3 py-1 text-xs font-black uppercase tracking-tighter shadow-[2px_2px_0px_#0f172a]">
                      {gig.category}
                    </span>
                  </div>
                  
                  <h3 className="mb-3 line-clamp-2 text-xl font-bold font-spline text-[#0f172a] leading-tight hover:underline decoration-[#fef08a] decoration-4 cursor-pointer" onClick={() => navigate(`/gigs/${gig.gig_id}`)}>
                    {gig.title}
                  </h3>

                  <button
                    onClick={(e) => {
                      e.stopPropagation();
                      handleEditClick(gig);
                    }}
                    className="mb-4 self-start brand-button-neutral py-1 px-3 text-[10px] font-black uppercase tracking-widest bg-white border-2 border-[#0f172a] shadow-[2px_2px_0px_#0f172a] hover:bg-[#fef08a] transition-all"
                  >
                    Edit Gig
                  </button>
                  
                  <div className="mt-auto pt-6 flex items-center justify-between border-t-2 border-[#0f172a] border-dashed">
                    <span className="text-xs font-bold text-[#50616b] uppercase italic" onClick={() => navigate(`/gigs/${gig.gig_id}`)}>Delivery: {gig.delivery_days} days</span>
                    <div className="relative">
                      <span className="absolute -inset-1 bg-[#fef08a] rounded-sm rotate-[-2deg]"></span>
                      <span className="relative text-2xl font-black text-[#0f172a] italic">${gig.price}</span>
                    </div>
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
