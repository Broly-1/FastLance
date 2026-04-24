import React, { useState, useEffect } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import { useAuth } from '../context/useAuth';

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
        })
      });

      const data = await response.json();

      if (!response.ok) {
        throw new Error(data.error || 'Failed to place order');
      }

      alert("Order placed successfully!");
      if (data.order_id) {
        navigate(`/orders/${data.order_id}`);
        return;
      }

      navigate('/buyer/orders');
      
    } catch (err) {
      alert(err.message);
    } finally {
      setOrderProcessing(false);
    }
  };

  if (loading) return (
    <div className="flex h-screen items-center justify-center">
      <div className="h-12 w-12 animate-spin rounded-full border-b-2 border-[#2da8ed]"></div>
    </div>
  );

  if (error || !gig) return (
    <div className="h-screen py-20 text-center">
      <p className="text-2xl text-red-500 font-bold mb-4">{error || "Gig not found"}</p>
      <button onClick={() => navigate(-1)} className="brand-link hover:underline">Go Back</button>
    </div>
  );

  return (
    <div className="min-h-screen py-10">
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
        
        {/* Breadcrumb */}
        <nav className="mb-6 text-sm text-slate-500">
           <button onClick={() => navigate(-1)} className="brand-link">Explore</button> &gt; 
           <span className="ml-2 text-slate-900">{gig.category}</span>
        </nav>

        <div className="grid grid-cols-1 lg:grid-cols-3 gap-8">
          
          {/* Main Gig Column */}
          <div className="lg:col-span-2 space-y-8">
            <h1 className="brand-page-title text-3xl font-extrabold leading-tight sm:text-4xl">
              {gig.title}
            </h1>
            
            {/* Seller Quick Info */}
            <div className="flex items-center space-x-3">
               <div className="flex h-12 w-12 items-center justify-center rounded-full bg-[#def4ff] text-xl font-bold text-sky-700">
                 {gig.seller_name?.charAt(0).toUpperCase()}
               </div>
               <div>
                 <p className="text-lg font-medium text-slate-900">{gig.seller_name}</p>
                 <p className="text-sm text-slate-500">Top Rated Seller</p>
               </div>
            </div>

            {/* Main Image */}
            <div className="brand-surface overflow-hidden">
              <img 
                src={gig.thumbnail_url || 'https://via.placeholder.com/800x500?text=Gig+Preview'} 
                alt={gig.title} 
                className="w-full h-auto object-cover max-h-[500px]"
              />
            </div>

            {/* About This Gig */}
            <div className="brand-surface p-6">
              <h2 className="mb-4 text-2xl font-bold text-slate-900">About This Gig</h2>
              <div className="max-w-none whitespace-pre-line text-slate-700">
                {gig.description}
              </div>
            </div>

          </div>

          {/* Right Sidebar Checkout */}
          <div className="lg:col-span-1">
            <div className="brand-surface sticky top-24 p-6">
              <div className="flex justify-between items-start mb-6">
                <h3 className="text-xl font-bold text-slate-900">Standard Package</h3>
                <span className="text-3xl font-extrabold text-slate-900">${gig.price}</span>
              </div>
              
              <div className="mb-6 flex justify-between text-sm font-medium text-slate-600">
                <div className="flex items-center">
                  <svg className="mr-2 h-5 w-5 text-[#f4be18]" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                     <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M12 8v4l3 3m6-3a9 9 0 11-18 0 9 9 0 0118 0z" />
                  </svg>
                  {gig.delivery_days} Days Delivery
                </div>
                <div className="flex items-center">
                  <svg className="mr-2 h-5 w-5 text-[#2da8ed]" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M4 4v5h.582m15.356 2A8.001 8.001 0 004.582 9m0 0H9m11 11v-5h-.581m0 0a8.003 8.003 0 01-15.357-2m15.357 2H15" />
                  </svg>
                  {gig.revision_limit} Revisions
                </div>
              </div>

              {(user?.role === 'Buyer' || user?.role === 'Both') ? (
                <button 
                  onClick={handlePlaceOrder}
                  disabled={orderProcessing || user.id === gig.seller_id}
                  className="brand-button-primary w-full rounded-xl px-4 py-3 font-bold transition duration-200 disabled:cursor-not-allowed disabled:opacity-60"
                >
                  {orderProcessing ? 'Processing...' : 'Continue to Checkout'}
                </button>
              ) : (
                <div className="rounded-xl bg-[#f8fcff] p-4 text-center text-sm text-slate-600">
                  {user?.role === 'Admin' ? 'Admins cannot place orders.' : 'Log in as a Buyer to place an order.'}
                </div>
              )}
              
              <div className="mt-6 border-t border-[#edf5fb] pt-6">
                <p className="mb-2 text-sm font-medium text-slate-900">Category & Tags</p>
                <span className="brand-chip mb-2 mr-2 inline-block rounded-full px-3 py-1 text-xs font-semibold">
                  {gig.category}
                </span>
                {gig.tags && gig.tags.map(tag => (
                   <span key={tag.tag_id} className="mb-2 mr-2 inline-block rounded-full border border-[#f0db82] bg-[#fff8d9] px-3 py-1 text-xs font-medium text-[#936600]">
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
