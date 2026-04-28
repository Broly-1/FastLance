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
                className="brand-card-sticky group flex cursor-pointer flex-col overflow-hidden transition-all duration-300" 
                onClick={() => navigate(`/gigs/${gig.gig_id}`)}
              >
                <div className="relative">
                  <img 
                    src={gig.thumbnail_url || 'https://via.placeholder.com/400x300?text=Service'} 
                    alt={gig.title} 
                    className="w-full h-40 object-cover border-b-2 border-[#0f172a] grayscale-[0.2] group-hover:grayscale-0 transition" 
                  />
                  {/* Tape/Highlighter effect for category */}
                  <div className="absolute -top-1 -left-1 transform -rotate-3 bg-[#fef08a] px-3 py-1 border-2 border-[#0f172a] font-bold text-[10px] uppercase tracking-wider z-10 shadow-sm">
                    {gig.category}
                  </div>
                </div>
                
                <div className="p-4 flex-grow flex flex-col">
                  <h3 className="mb-2 line-clamp-2 text-lg font-bold leading-tight font-spline text-[#0f172a] group-hover:underline decoration-yellow-400 decoration-2 underline-offset-4 transition">
                    {gig.title}
                  </h3>
                  
                  <div className="mt-2 flex items-center">
                    <div className="flex h-8 w-8 items-center justify-center border-2 border-[#0f172a] overflow-hidden rounded-full bg-[#fef08a]">
                      {gig.seller_profile_pic ? (
                        <img src={gig.seller_profile_pic} alt={gig.seller_name} className="w-full h-full object-cover" />
                      ) : (
                        <span className="text-xs font-bold">{gig.seller_name?.charAt(0).toUpperCase()}</span>
                      )}
                    </div>
                    <span className="ml-2 text-sm font-semibold text-[#50616b]">{gig.seller_name}</span>
                  </div>
                  
                  <div className="mt-auto flex items-center justify-between border-t-2 border-[#0f172a] pt-4 mt-4 border-dashed">
                    <div className="flex items-center gap-1 text-sm font-medium text-[#50616b]">
                      <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M12 8v4l3 3m6-3a9 9 0 11-18 0 9 9 0 0118 0z" /></svg>
                      {gig.delivery_days}d
                    </div>
                    <div className="flex items-center gap-2">
                      <div className="bg-[#fef08a] px-2 py-1 border-2 border-[#0f172a] rounded-lg rotate-2 shadow-sm">
                        <span className="text-lg font-black text-[#0f172a]">${gig.price}</span>
                      </div>
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
