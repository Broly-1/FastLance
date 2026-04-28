import React, { useState, useEffect } from 'react';
import { useNavigate, useSearchParams } from 'react-router-dom';

export default function BuyerDashboard() {
  const navigate = useNavigate();
  const [searchParams, setSearchParams] = useSearchParams();
  
  const [gigs, setGigs] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);

  // Search & Filter State (synced with URL)
  const q = searchParams.get('q') || '';
  const category = searchParams.get('category') || '';
  const minPrice = searchParams.get('minPrice') || '';
  const maxPrice = searchParams.get('maxPrice') || '';
  const sortBy = searchParams.get('sortBy') || 'newest';

  const updateFilters = (updates) => {
    const newParams = new URLSearchParams(searchParams);
    Object.entries(updates).forEach(([key, value]) => {
      if (value) {
        newParams.set(key, value);
      } else {
        newParams.delete(key);
      }
    });
    setSearchParams(newParams);
  };

  // Fetch Gigs based on all filters
  useEffect(() => {
    const fetchGigs = async () => {
      try {
        setLoading(true);
        const params = new URLSearchParams({
          q,
          category,
          minPrice,
          maxPrice,
          sortBy
        });
        
        const response = await fetch(`http://localhost:3000/api/gigs/search?${params.toString()}`);
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
    
    const delayDebounceFn = setTimeout(() => {
      fetchGigs();
    }, 300);

    return () => clearTimeout(delayDebounceFn);
  }, [q, category, minPrice, maxPrice, sortBy]);

  return (
    <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8 w-full">
      <div className="brand-hero mb-8 px-6 py-8 sm:px-8 relative">
        <div className="absolute -top-3 -right-3 bg-[#fef08a] border-2 border-[#0f172a] px-3 py-1 rotate-3 shadow-sm font-black text-xs uppercase tracking-widest z-10">
          Buyer Hub
        </div>
        <h1 className="brand-page-title text-3xl font-bold">Find the best services</h1>
        <p className="brand-page-subtitle mt-1 text-sm italic">Filter by category, price, and more to find your perfect match.</p>
      </div>

      <div className="flex flex-col lg:flex-row gap-8">
        {/* Sidebar Filters */}
        <aside className="lg:w-64 space-y-6 flex-shrink-0">
          <div className="brand-surface p-5 space-y-6">
            <h3 className="font-black uppercase tracking-widest text-xs border-b-2 border-[#0f172a] pb-2">Refine Search</h3>
            
            {/* Keyword Search */}
            <div className="space-y-2">
              <label className="text-[10px] font-black uppercase text-[#50616b]">Keyword</label>
              <input 
                type="text" 
                placeholder="e.g. Logo Design" 
                value={q}
                onChange={(e) => updateFilters({ q: e.target.value })}
                className="brand-input text-xs"
              />
            </div>

            {/* Category */}
            <div className="space-y-2">
              <label className="text-[10px] font-black uppercase text-[#50616b]">Category</label>
              <select 
                value={category}
                onChange={(e) => updateFilters({ category: e.target.value })}
                className="brand-input text-xs"
              >
                <option value="">All Categories</option>
                <option value="Graphics">Graphics & Design</option>
                <option value="Programming">Programming & Tech</option>
                <option value="Writing">Writing & Translation</option>
                <option value="Video">Video & Animation</option>
                <option value="Marketing">Digital Marketing</option>
              </select>
            </div>

            {/* Price Range */}
            <div className="space-y-2">
              <label className="text-[10px] font-black uppercase text-[#50616b]">Price Range</label>
              <div className="flex items-center gap-2">
                <input 
                  type="number" 
                  placeholder="Min" 
                  value={minPrice}
                  onChange={(e) => updateFilters({ minPrice: e.target.value })}
                  className="brand-input text-xs py-1"
                />
                <span className="font-bold">-</span>
                <input 
                  type="number" 
                  placeholder="Max" 
                  value={maxPrice}
                  onChange={(e) => updateFilters({ maxPrice: e.target.value })}
                  className="brand-input text-xs py-1"
                />
              </div>
            </div>

            {/* Sort By */}
            <div className="space-y-2">
              <label className="text-[10px] font-black uppercase text-[#50616b]">Sort By</label>
              <select 
                value={sortBy}
                onChange={(e) => updateFilters({ sortBy: e.target.value })}
                className="brand-input text-xs"
              >
                <option value="newest">Newest First</option>
                <option value="price_low">Price: Low to High</option>
                <option value="price_high">Price: High to Low</option>
                <option value="oldest">Oldest First</option>
              </select>
            </div>

            <button 
              onClick={() => setSearchParams({})}
              className="w-full py-2 text-[10px] font-black uppercase tracking-widest text-[#50616b] hover:text-[#0f172a] transition-colors border-t-2 border-dotted border-[#0f172a]/10 mt-2 pt-4"
            >
              Clear All Filters
            </button>
          </div>
        </aside>

        {/* Gigs List */}
        <div className="flex-grow">
          {loading ? (
            <div className="flex justify-center py-20">
              <div className="h-12 w-12 animate-spin rounded-full border-4 border-dotted border-[#0f172a]"></div>
            </div>
          ) : error ? (
            <div className="brand-surface p-8 text-center border-red-200 bg-red-50">
              <p className="text-red-600 font-bold">Error: {error}</p>
            </div>
          ) : gigs.length === 0 ? (
            <div className="brand-surface p-20 text-center flex flex-col items-center">
              <div className="bg-[#fef08a] p-4 border-2 border-[#0f172a] rotate-3 mb-4">
                <svg className="h-10 w-10 text-[#0f172a]" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M21 21l-6-6m2-5a7 7 0 11-14 0 7 7 0 0114 0z" />
                </svg>
              </div>
              <p className="text-lg font-black text-[#0f172a] uppercase tracking-tight">No services found</p>
              <p className="text-[#50616b] text-sm mt-1">Try adjusting your filters or keyword.</p>
            </div>
          ) : (
            <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-6">
              {gigs.map(gig => (
                <div 
                  key={gig.gig_id} 
                  className="brand-card-sticky group flex cursor-pointer flex-col overflow-hidden transition-all duration-300 hover:-translate-y-1" 
                  onClick={() => navigate(`/gigs/${gig.gig_id}`)}
                >
                  <div className="relative h-44 overflow-hidden border-2 border-[#0f172a]" style={{ borderRadius: '15px 225px 15px 255px / 255px 15px 225px 15px' }}>
                    <img 
                      src={gig.thumbnail_url || 'https://via.placeholder.com/400x300?text=Service'} 
                      alt={gig.title} 
                      className="w-full h-full object-cover transition-transform duration-500 group-hover:scale-110" 
                    />
                    <div className="absolute top-2 left-2 bg-[#fef08a] px-2 py-0.5 border-2 border-[#0f172a] font-black text-[9px] uppercase tracking-tighter z-10 shadow-sm rotate-[-2deg]">
                      {gig.category}
                    </div>
                  </div>
                  
                  <div className="p-4 flex-grow flex flex-col">
                    <h3 className="mb-2 line-clamp-2 text-md font-black leading-tight text-[#0f172a] group-hover:underline decoration-[#fef08a] decoration-4 underline-offset-2 transition">
                      {gig.title}
                    </h3>
                    
                    <div className="mt-3 flex items-center gap-2">
                      <div className="h-7 w-7 border-2 border-[#0f172a] overflow-hidden rounded-full bg-[#fef08a] flex-shrink-0">
                        {gig.seller_profile_pic ? (
                          <img src={gig.seller_profile_pic} alt={gig.seller_name} className="w-full h-full object-cover" />
                        ) : (
                          <span className="flex h-full w-full items-center justify-center text-[10px] font-black">{gig.seller_name?.charAt(0).toUpperCase()}</span>
                        )}
                      </div>
                      <span className="text-[11px] font-bold text-[#50616b] uppercase tracking-wider">{gig.seller_name}</span>
                    </div>
                    
                    <div className="mt-auto flex items-center justify-between border-t-2 border-dotted border-[#0f172a]/10 pt-4 mt-4">
                      <div className="flex items-center gap-1 text-[10px] font-black text-[#50616b] uppercase">
                        <svg className="w-3 h-3" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth="3" d="M12 8v4l3 3m6-3a9 9 0 11-18 0 9 9 0 0118 0z" /></svg>
                        {gig.delivery_days} days
                      </div>
                      <div className="bg-[#0f172a] px-3 py-1 rotate-1 shadow-sm">
                        <span className="text-sm font-black text-white italic tracking-tighter">${gig.price}</span>
                      </div>
                    </div>
                  </div>
                </div>
              ))}
            </div>
          )}
        </div>
      </div>
    </div>
  );
}
