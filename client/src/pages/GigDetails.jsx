import React, { useState, useEffect } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import { useAuth } from '../context/AuthContext';

export default function GigDetails() {
  const { id } = useParams();
  const { user } = useAuth();
  const navigate = useNavigate();
  
  const [gig, setGig] = useState(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);
  const [orderProcessing, setOrderProcessing] = useState(false);

  useEffect(() => {
    const fetchGig = async () => {
      try {
        const response = await fetch(`http://localhost:3000/api/gigs/${id}`);
        if (!response.ok) {
          throw new Error('Gig not found or failed to load.');
        }
        const data = await response.json();
        setGig(data);
      } catch (err) {
        setError(err.message);
      } finally {
        setLoading(false);
      }
    };
    fetchGig();
  }, [id]);

  const handlePlaceOrder = async () => {
    if (!user) {
      alert("You need to login to place an order!");
      return navigate('/login');
    }
    
    // Prevent Sellers from buying from themselves just in case 
    if (user.id === gig.seller_id) {
      return alert("You cannot purchase your own gig.");
    }

    try {
      setOrderProcessing(true);
      const response = await fetch('http://localhost:3000/api/orders', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          gig_id: gig.gig_id,
          buyer_id: user.id,
          seller_id: gig.seller_id,
          total_price: gig.price
        })
      });

      const data = await response.json();

      if (!response.ok) {
        throw new Error(data.error || 'Failed to place order');
      }

      alert("Order placed successfully!");
      // Redirect to a placeholder order tracking page
      navigate(`/buyer/orders/${data.order_id || 'recent'}`);
      
    } catch (err) {
      alert(err.message);
    } finally {
      setOrderProcessing(false);
    }
  };

  if (loading) return (
    <div className="flex justify-center items-center h-screen bg-gray-50">
      <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-blue-600"></div>
    </div>
  );

  if (error || !gig) return (
    <div className="text-center py-20 bg-gray-50 h-screen">
      <p className="text-2xl text-red-500 font-bold mb-4">{error || "Gig not found"}</p>
      <button onClick={() => navigate(-1)} className="text-blue-600 hover:underline">Go Back</button>
    </div>
  );

  return (
    <div className="bg-gray-50 min-h-screen py-10">
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
        
        {/* Breadcrumb */}
        <nav className="text-sm text-gray-500 mb-6">
           <button onClick={() => navigate(-1)} className="hover:text-blue-600">Explore</button> &gt; 
           <span className="ml-2 text-gray-900">{gig.category}</span>
        </nav>

        <div className="grid grid-cols-1 lg:grid-cols-3 gap-8">
          
          {/* Main Gig Column */}
          <div className="lg:col-span-2 space-y-8">
            <h1 className="text-3xl sm:text-4xl font-extrabold text-gray-900 leading-tight">
              {gig.title}
            </h1>
            
            {/* Seller Quick Info */}
            <div className="flex items-center space-x-3">
               <div className="h-12 w-12 rounded-full bg-blue-100 flex items-center justify-center text-blue-800 font-bold text-xl">
                 {gig.seller_name?.charAt(0).toUpperCase()}
               </div>
               <div>
                 <p className="text-lg font-medium text-gray-900">{gig.seller_name}</p>
                 <p className="text-sm text-gray-500">Top Rated Seller</p>
               </div>
            </div>

            {/* Main Image */}
            <div className="rounded-xl overflow-hidden shadow-sm bg-white">
              <img 
                src={gig.thumbnail_url || 'https://via.placeholder.com/800x500?text=Gig+Preview'} 
                alt={gig.title} 
                className="w-full h-auto object-cover max-h-[500px]"
              />
            </div>

            {/* About This Gig */}
            <div className="bg-white p-6 rounded-xl shadow-sm border border-gray-100">
              <h2 className="text-2xl font-bold text-gray-900 mb-4">About This Gig</h2>
              <div className="prose prose-blue max-w-none text-gray-700 whitespace-pre-line">
                {gig.description}
              </div>
            </div>

          </div>

          {/* Right Sidebar Checkout */}
          <div className="lg:col-span-1">
            <div className="sticky top-6 bg-white p-6 rounded-xl shadow-md border border-gray-200">
              <div className="flex justify-between items-start mb-6">
                <h3 className="text-xl font-bold text-gray-900">Standard Package</h3>
                <span className="text-3xl font-extrabold text-gray-900">${gig.price}</span>
              </div>
              
              <div className="flex justify-between text-gray-600 mb-6 text-sm font-medium">
                <div className="flex items-center">
                  <svg className="w-5 h-5 mr-2 text-gray-400" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                     <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M12 8v4l3 3m6-3a9 9 0 11-18 0 9 9 0 0118 0z" />
                  </svg>
                  {gig.delivery_days} Days Delivery
                </div>
                <div className="flex items-center">
                  <svg className="w-5 h-5 mr-2 text-gray-400" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M4 4v5h.582m15.356 2A8.001 8.001 0 004.582 9m0 0H9m11 11v-5h-.581m0 0a8.003 8.003 0 01-15.357-2m15.357 2H15" />
                  </svg>
                  {gig.revision_limit} Revisions
                </div>
              </div>

              {(user?.role === 'Buyer' || user?.role === 'Both') ? (
                <button 
                  onClick={handlePlaceOrder}
                  disabled={orderProcessing || user.id === gig.seller_id}
                  className="w-full bg-green-600 hover:bg-green-700 text-white font-bold py-3 px-4 rounded-lg transition duration-200 shadow disabled:bg-gray-400 disabled:cursor-not-allowed"
                >
                  {orderProcessing ? 'Processing...' : 'Continue to Checkout'}
                </button>
              ) : (
                <div className="text-center p-4 bg-gray-50 rounded-lg text-sm text-gray-600">
                  {user?.role === 'Admin' ? 'Admins cannot place orders.' : 'Log in as a Buyer to place an order.'}
                </div>
              )}
              
              <div className="mt-6 border-t border-gray-100 pt-6">
                <p className="text-sm font-medium text-gray-900 mb-2">Category & Tags</p>
                <span className="inline-block bg-blue-50 text-blue-700 text-xs px-3 py-1 rounded-full font-semibold border border-blue-100 mb-2 mr-2">
                  {gig.category}
                </span>
                {gig.tags && gig.tags.map(tag => (
                   <span key={tag.tag_id} className="inline-block bg-gray-100 text-gray-600 text-xs px-3 py-1 rounded-full font-medium border border-gray-200 mb-2 mr-2">
                     {tag.name}
                   </span>
                ))}
              </div>
            </div>
          </div>

        </div>
      </div>
    </div>
  );
}