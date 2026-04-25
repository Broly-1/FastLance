import React, { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';

export default function BuyerDashboard() {
  const navigate = useNavigate();
  const [gigs, setGigs] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);

  // Search & Filter State
  const [searchTerm, setSearchTerm] = useState('');
  const [category, setCategory] = useState('');

  // Fetch All Gigs
  useEffect(() => {
    const fetchGigs = async () => {
      try {
        setLoading(true);
        let url = 'http://localhost:3000/api/gigs';
        if (searchTerm) {
          url = `http://localhost:3000/api/gigs/search?q=${encodeURIComponent(searchTerm)}`;
        } else if (category) {
          url = `http://localhost:3000/api/gigs/category/${encodeURIComponent(category)}`;
        }

        const response = await fetch(url);
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
    
    // Add a tiny delay to debounce search input
    const delayDebounceFn = setTimeout(() => {
      fetchGigs();
    }, 300);

    return () => clearTimeout(delayDebounceFn);
  }, [searchTerm, category]);

  return (
    <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8 w-full">
      <div className="brand-hero mb-8 px-6 py-8 sm:px-8">
        <h1 className="brand-page-title text-3xl font-bold">Explore Services</h1>
        <p className="brand-page-subtitle mt-1 text-sm">Find the perfect freelance services for your business.</p>
      </div>

      {/* Filters & Search */}
      <div className="brand-surface mb-8 flex flex-col gap-4 p-4 sm:flex-row">
        <div className="flex-grow">
          <input 
            type="text" 
            placeholder="Search for any service..." 
            value={searchTerm}
            onChange={(e) => {
              setSearchTerm(e.target.value);
              if (e.target.value) setCategory(''); // Clear category when searching via text
            }}
            className="brand-input"
          />
        </div>
        <div className="sm:w-64">
          <select 
            value={category}
            onChange={(e) => {
              setCategory(e.target.value);
              if (e.target.value) setSearchTerm(''); // Clear search when selecting category
            }}
            className="brand-input"
          >
            <option value="">All Categories</option>
            <option value="Programming">Programming</option>
            <option value="Graphics">Graphics & Design</option>
            <option value="Writing">Writing & Translation</option>
            <option value="Video">Video & Animation</option>
            <option value="Marketing">Digital Marketing</option>
          </select>
        </div>
      </div>

      {/* Gigs List */}
      <div>
        {loading ? (
          <div className="flex justify-center py-10">
            <div className="h-12 w-12 animate-spin rounded-full border-b-2 border-[#2da8ed]"></div>
          </div>
        ) : error ? (
          <p className="rounded-2xl border border-red-200 bg-red-50 p-4 text-center text-red-500">Error: {error}</p>
        ) : gigs.length === 0 ? (
          <div className="brand-surface p-12 text-center">
            <p className="brand-page-subtitle text-lg">No services found matching your criteria.</p>
          </div>
        ) : (
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-6">
            {gigs.filter(gig => gig.is_active).map(gig => (
              <div 
                key={gig.gig_id} 
                className="brand-surface group flex cursor-pointer flex-col overflow-hidden transition-all duration-200 hover:-translate-y-1 hover:shadow-xl" 
                onClick={() => navigate(`/gigs/${gig.gig_id}`)}
              >
                <img 
                  src={gig.thumbnail_url || 'https://via.placeholder.com/400x300?text=Service'} 
                  alt={gig.title} 
                  className="w-full h-40 object-cover group-hover:opacity-90 transition" 
                />
                <div className="p-4 flex-grow flex flex-col">
                  <div className="flex justify-between items-start mb-2">
                    <span className="brand-chip rounded-full px-3 py-1 text-xs font-semibold uppercase tracking-wide">{gig.category}</span>
                  </div>
                  <h3 className="mb-1 line-clamp-2 text-base font-medium leading-snug text-slate-900 transition group-hover:text-sky-700">{gig.title}</h3>
                  <div className="mt-3 flex items-center">
                    <div className="flex h-6 w-6 items-center justify-center overflow-hidden rounded-full bg-[#e6f7ff]">
                      {gig.seller_profile_pic ? (
                        <img src={gig.seller_profile_pic} alt={gig.seller_name} className="w-full h-full object-cover" />
                      ) : (
                        <span className="text-xs font-bold text-sky-700">{gig.seller_name?.charAt(0).toUpperCase()}</span>
                      )}
                    </div>
                    <span className="ml-2 text-sm text-slate-600">{gig.seller_name}</span>
                  </div>
                  <div className="mt-auto flex items-center justify-between border-t border-[#edf5fb] pt-4">
                    <span className="text-sm text-slate-500">{gig.delivery_days} days</span>
                    <div className="flex flex-col items-end">
                      <span className="text-xs uppercase tracking-wider text-[#b38a00]">Starting at</span>
                      <span className="text-lg font-bold text-slate-900">${gig.price}</span>
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
