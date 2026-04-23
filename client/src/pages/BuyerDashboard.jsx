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
      <div className="mb-8">
        <h1 className="text-3xl font-bold text-gray-900">Explore Services</h1>
        <p className="mt-1 text-sm text-gray-500">Find the perfect freelance services for your business.</p>
      </div>

      {/* Filters & Search */}
      <div className="flex flex-col sm:flex-row gap-4 mb-8 bg-white p-4 rounded-lg shadow-sm border border-gray-200">
        <div className="flex-grow">
          <input 
            type="text" 
            placeholder="Search for any service..." 
            value={searchTerm}
            onChange={(e) => {
              setSearchTerm(e.target.value);
              if (e.target.value) setCategory(''); // Clear category when searching via text
            }}
            className="w-full border border-gray-300 rounded-md px-4 py-2 focus:ring-blue-500 focus:border-blue-500"
          />
        </div>
        <div className="sm:w-64">
          <select 
            value={category}
            onChange={(e) => {
              setCategory(e.target.value);
              if (e.target.value) setSearchTerm(''); // Clear search when selecting category
            }}
            className="w-full border border-gray-300 rounded-md px-4 py-2 focus:ring-blue-500 focus:border-blue-500"
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
            <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-blue-600"></div>
          </div>
        ) : error ? (
          <p className="text-red-500 bg-red-50 p-4 rounded text-center">Error: {error}</p>
        ) : gigs.length === 0 ? (
          <div className="bg-white p-12 text-center rounded-lg border border-gray-200">
            <p className="text-gray-500 text-lg">No services found matching your criteria.</p>
          </div>
        ) : (
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-6">
            {gigs.filter(gig => gig.is_active).map(gig => (
              <div 
                key={gig.gig_id} 
                className="bg-white rounded-lg shadow-sm border border-gray-200 overflow-hidden flex flex-col cursor-pointer group hover:shadow-xl transition-all duration-200 transform hover:-translate-y-1" 
                onClick={() => navigate(`/gigs/${gig.gig_id}`)}
              >
                <img 
                  src={gig.thumbnail_url || 'https://via.placeholder.com/400x300?text=Service'} 
                  alt={gig.title} 
                  className="w-full h-40 object-cover group-hover:opacity-90 transition" 
                />
                <div className="p-4 flex-grow flex flex-col">
                  <div className="flex justify-between items-start mb-2">
                    <span className="text-xs font-semibold text-blue-600 uppercase tracking-wide">{gig.category}</span>
                  </div>
                  <h3 className="text-base font-medium text-gray-900 mb-1 line-clamp-2 leading-snug group-hover:text-blue-600 transition">{gig.title}</h3>
                  <div className="mt-3 flex items-center">
                    <div className="h-6 w-6 rounded-full bg-gray-200 flex items-center justify-center overflow-hidden">
                      {gig.seller_profile_pic ? (
                        <img src={gig.seller_profile_pic} alt={gig.seller_name} className="w-full h-full object-cover" />
                      ) : (
                        <span className="text-xs text-gray-500 font-bold">{gig.seller_name?.charAt(0).toUpperCase()}</span>
                      )}
                    </div>
                    <span className="ml-2 text-sm text-gray-600">{gig.seller_name}</span>
                  </div>
                  <div className="mt-auto pt-4 flex items-center justify-between border-t border-gray-100">
                    <span className="text-sm text-gray-500">{gig.delivery_days} days</span>
                    <div className="flex flex-col items-end">
                      <span className="text-xs text-gray-400 uppercase tracking-wider">Starting at</span>
                      <span className="text-lg font-bold text-gray-900">${gig.price}</span>
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