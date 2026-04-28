import React, { useState, useEffect, useCallback } from 'react';
import { useAuth } from '../context/useAuth';
import { useNavigate } from 'react-router-dom';

const API = 'http://localhost:3000';

export default function Reports() {
  const { user } = useAuth();
  const navigate = useNavigate();

  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');
  const [tab, setTab] = useState('overview'); // Admin tabs: overview, revenue, market, operations | Seller tabs: earnings, feedback

  // Admin Data
  const [summary, setSummary] = useState(null);
  const [revenueHistory, setRevenueHistory] = useState([]);
  const [topSellers, setTopSellers] = useState([]);
  const [topGigs, setTopGigs] = useState([]);
  const [trendingGigs, setTrendingGigs] = useState([]);
  const [categoryStats, setCategoryStats] = useState([]);
  const [overdueMilestones, setOverdueMilestones] = useState([]);

  // Seller Data
  const [sellerEarnings, setSellerEarnings] = useState(null);
  const [sellerStats, setSellerStats] = useState(null);
  const [userFeedback, setUserFeedback] = useState([]);

  const fetchAdminData = useCallback(async () => {
    try {
      const headers = { 'x-user-role': user?.role || 'Admin' };
      const [summaryRes, revenueRes, sellersRes, gigsRes, trendingRes, catRes, milestonesRes] = await Promise.all([
        fetch(`${API}/api/reports/platform-summary`, { headers }),
        fetch(`${API}/api/reports/revenue-by-month`, { headers }),
        fetch(`${API}/api/reports/top-sellers`, { headers }),
        fetch(`${API}/api/reports/top-gigs`, { headers }),
        fetch(`${API}/api/reports/trending-gigs`, { headers }),
        fetch(`${API}/api/reports/category-stats`, { headers }),
        fetch(`${API}/api/reports/overdue-milestones`, { headers })
      ]);

      if (summaryRes.ok) setSummary(await summaryRes.json());
      if (revenueRes.ok) setRevenueHistory(await revenueRes.json());
      if (sellersRes.ok) setTopSellers(await sellersRes.json());
      if (gigsRes.ok) setTopGigs(await gigsRes.json());
      if (trendingRes.ok) setTrendingGigs(await trendingRes.json());
      if (catRes.ok) setCategoryStats(await catRes.json());
      if (milestonesRes.ok) setOverdueMilestones(await milestonesRes.json());
    } catch (err) {
      setError('Failed to load admin reports.');
    }
  }, [user]);

  const fetchSellerData = useCallback(async () => {
    try {
      const [earningsRes, dashboardRes, feedbackRes] = await Promise.all([
        fetch(`${API}/api/reports/seller/${user.id}/earnings`),
        fetch(`${API}/api/reports/seller/${user.id}/dashboard`),
        fetch(`${API}/api/reports/user-feedback/${user.id}`)
      ]);

      if (earningsRes.ok) setSellerEarnings(await earningsRes.json());
      if (dashboardRes.ok) setSellerStats(await dashboardRes.json());
      if (feedbackRes.ok) setUserFeedback(await feedbackRes.json());
    } catch (err) {
      setError('Failed to load seller reports.');
    }
  }, [user]);

  useEffect(() => {
    const load = async () => {
      setLoading(true);
      if (user?.role === 'Admin') {
        await fetchAdminData();
      } else {
        await fetchSellerData();
        setTab('earnings');
      }
      setLoading(false);
    };
    if (user) load();
  }, [user, fetchAdminData, fetchSellerData]);

  if (loading) {
    return (
      <div className="flex justify-center items-center min-h-[60vh]">
        <div className="h-12 w-12 animate-spin rounded-full border-b-2 border-[#2da8ed]" />
      </div>
    );
  }

  if (error) {
    return (
      <div className="max-w-7xl mx-auto px-4 py-8">
        <div className="brand-surface p-6 text-center text-red-600">{error}</div>
      </div>
    );
  }

  return (
    <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8 w-full">
      {/* Header */}
      <div className="brand-hero mb-8 px-6 py-8 sm:px-10 relative overflow-hidden">
        <div className="relative z-10">
          <h1 className="brand-page-title text-4xl font-black rotate-[-1deg]">Platform Analytics</h1>
          <p className="brand-page-subtitle mt-2 text-lg italic opacity-80">
            {user?.role === 'Admin' ? 'Comprehensive overview of Fastlance health and performance.' : 'Track your growth and service impact.'}
          </p>
        </div>
        <div className="absolute top-[-20px] right-[-20px] h-40 w-40 bg-[#fef08a] opacity-20 rounded-full blur-3xl"></div>
      </div>

      {/* Role-based Tabs */}
      <div className="flex gap-3 mb-8 flex-wrap">
        {user?.role === 'Admin' ? (
          <>
            <TabButton active={tab === 'overview'} onClick={() => setTab('overview')} label="📊 Overview" />
            <TabButton active={tab === 'revenue'} onClick={() => setTab('revenue')} label="💰 Revenue Trends" />
            <TabButton active={tab === 'market'} onClick={() => setTab('market')} label="📈 Market Stats" />
            <TabButton active={tab === 'operations'} onClick={() => setTab('operations')} label="🚨 Operations" />
          </>
        ) : (
          <>
            <TabButton active={tab === 'earnings'} onClick={() => setTab('earnings')} label="💵 My Earnings" />
            <TabButton active={tab === 'feedback'} onClick={() => setTab('feedback')} label="⭐ Customer Feedback" />
          </>
        )}
      </div>

      {/* ADMIN CONTENT */}
      {user?.role === 'Admin' && (
        <div className="space-y-8">
          {tab === 'overview' && (
            <>
              <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-5 gap-6">
                <StatCard label="Active Users" value={summary?.total_users} icon="👥" color="bg-blue-50" />
                <StatCard label="Live Gigs" value={summary?.total_gigs} icon="💼" color="bg-green-50" />
                <StatCard label="Completed Orders" value={summary?.completed_orders} icon="✅" color="bg-purple-50" />
                <StatCard label="Gross Revenue" value={`$${Number(summary?.total_revenue).toLocaleString()}`} icon="💰" color="bg-yellow-50" />
                <StatCard label="Avg. Rating" value={summary?.platform_avg_rating} icon="⭐" color="bg-orange-50" />
              </div>

              <div className="grid grid-cols-1 lg:grid-cols-2 gap-8">
                <ReportSection title="🏆 Top Performing Sellers">
                  <div className="overflow-x-auto">
                    <table className="w-full text-left text-sm">
                      <thead>
                        <tr className="border-b-2 border-[#0f172a] bg-slate-50">
                          <th className="px-4 py-3 font-bold">Seller</th>
                          <th className="px-4 py-3 font-bold text-center">Orders</th>
                          <th className="px-4 py-3 font-bold text-center">Rating</th>
                        </tr>
                      </thead>
                      <tbody className="divide-y divide-slate-200">
                        {topSellers.map(s => (
                          <tr key={s.user_id} className="hover:bg-slate-50 transition-colors">
                            <td className="px-4 py-3 font-semibold">{s.username}</td>
                            <td className="px-4 py-3 text-center">{s.total_orders}</td>
                            <td className="px-4 py-3 text-center">⭐ {Number(s.avg_rating).toFixed(1)}</td>
                          </tr>
                        ))}
                      </tbody>
                    </table>
                  </div>
                </ReportSection>

                <ReportSection title="⭐ Highest Rated Gigs">
                  <div className="overflow-x-auto">
                    <table className="w-full text-left text-sm">
                      <thead>
                        <tr className="border-b-2 border-[#0f172a] bg-slate-50">
                          <th className="px-4 py-3 font-bold">Gig Title</th>
                          <th className="px-4 py-3 font-bold text-center">Rating</th>
                          <th className="px-4 py-3 font-bold text-center">Reviews</th>
                        </tr>
                      </thead>
                      <tbody className="divide-y divide-slate-200">
                        {topGigs.map(g => (
                          <tr key={g.gig_id} className="hover:bg-slate-50 transition-colors">
                            <td className="px-4 py-3 font-semibold truncate max-w-[200px]">{g.title}</td>
                            <td className="px-4 py-3 text-center">⭐ {Number(g.avg_rating).toFixed(1)}</td>
                            <td className="px-4 py-3 text-center">{g.total_reviews}</td>
                          </tr>
                        ))}
                      </tbody>
                    </table>
                  </div>
                </ReportSection>
              </div>
            </>
          )}

          {tab === 'revenue' && (
            <ReportSection title="Monthly Revenue History" subtitle="Gross revenue from completed orders over time.">
              <div className="h-80 flex items-end justify-around pt-10 pb-4 px-4 border-b-2 border-[#0f172a]">
                {revenueHistory.length === 0 ? (
                  <p className="text-slate-400 italic">No revenue data available yet.</p>
                ) : revenueHistory.map((rh, i) => {
                  const maxRevenue = Math.max(...revenueHistory.map(r => Number(r.total_revenue))) || 1;
                  const height = (Number(rh.total_revenue) / maxRevenue) * 100;
                  return (
                    <div key={`${rh.year}-${rh.month}`} className="flex flex-col items-center group w-full max-w-[60px]">
                      <div className="relative w-full">
                         <div className="absolute bottom-full left-1/2 -translate-x-1/2 mb-2 bg-[#0f172a] text-white text-[10px] px-2 py-1 rounded opacity-0 group-hover:opacity-100 transition-opacity whitespace-nowrap z-20">
                           ${Number(rh.total_revenue).toLocaleString()}
                         </div>
                         <div 
                           className="w-full border-2 border-[#0f172a] bg-[#fef08a] transition-all duration-700 shadow-[4px_4px_0px_#0f172a] group-hover:bg-[#fde047] group-hover:-translate-y-1"
                           style={{ height: `${Math.max(height, 5)}%` }}
                         />
                      </div>
                      <span className="mt-4 text-[10px] font-black uppercase tracking-tighter rotate-[-45deg] origin-top">
                        {new Date(rh.year, rh.month - 1).toLocaleString('default', { month: 'short' })} '{rh.year.toString().slice(-2)}
                      </span>
                    </div>
                  );
                })}
              </div>
              <div className="mt-16 grid grid-cols-1 sm:grid-cols-3 gap-6">
                 {revenueHistory.slice(0, 3).map(rh => (
                   <div key={`${rh.year}-${rh.month}-stat`} className="brand-surface p-4 border-dashed">
                      <p className="text-[10px] font-black uppercase text-slate-500">{new Date(rh.year, rh.month - 1).toLocaleString('default', { month: 'long' })} {rh.year}</p>
                      <p className="text-2xl font-black text-[#0f172a]">${Number(rh.total_revenue).toLocaleString()}</p>
                      <p className="text-xs font-bold text-green-600">{rh.invoices_paid} orders completed</p>
                   </div>
                 ))}
              </div>
            </ReportSection>
          )}

          {tab === 'market' && (
            <div className="grid grid-cols-1 lg:grid-cols-2 gap-8">
               <ReportSection title="📁 Category Distribution" subtitle="Active gigs per category.">
                  <div className="space-y-4">
                    {categoryStats.map(cat => {
                      const maxGigs = Math.max(...categoryStats.map(c => c.gig_count)) || 1;
                      const width = (cat.gig_count / maxGigs) * 100;
                      return (
                        <div key={cat.category} className="space-y-1">
                          <div className="flex justify-between text-xs font-bold uppercase tracking-tight">
                            <span>{cat.category}</span>
                            <span>{cat.gig_count} gigs</span>
                          </div>
                          <div className="h-6 w-full bg-slate-100 border-2 border-[#0f172a] overflow-hidden relative shadow-[2px_2px_0px_#0f172a]">
                             <div 
                               className="h-full bg-[#bae6fd] border-r-2 border-[#0f172a] transition-all duration-1000" 
                               style={{ width: `${width}%` }} 
                             />
                             <span className="absolute right-2 top-1/2 -translate-y-1/2 text-[10px] font-black italic text-[#0f172a]">AVG: ${Number(cat.avg_price).toFixed(0)}</span>
                          </div>
                        </div>
                      );
                    })}
                  </div>
               </ReportSection>

               <ReportSection title="🔥 Trending Gigs" subtitle="Most orders in the last 30 days.">
                  <div className="space-y-3">
                    {trendingGigs.length === 0 ? (
                      <p className="text-slate-400 italic">No trending gigs detected.</p>
                    ) : trendingGigs.map(g => (
                      <div key={g.gig_id} className="flex items-center gap-4 p-3 border-2 border-[#0f172a] bg-white rounded-lg hover:bg-[#fff9c4] transition-colors cursor-pointer" onClick={() => navigate(`/gigs/${g.gig_id}`)}>
                         <div className="h-10 w-10 flex-shrink-0 bg-[#fef08a] border-2 border-[#0f172a] flex items-center justify-center font-black text-xs rotate-[-3deg]">
                           {g.order_count}
                         </div>
                         <div className="flex-grow min-w-0">
                           <p className="font-bold text-sm truncate">{g.title}</p>
                           <p className="text-[10px] font-black uppercase text-slate-500">{g.seller_name} • {g.category}</p>
                         </div>
                         <div className="text-right">
                           <p className="font-black text-sm italic">${g.price}</p>
                         </div>
                      </div>
                    ))}
                  </div>
               </ReportSection>
            </div>
          )}

          {tab === 'operations' && (
            <ReportSection title="🚨 Overdue Milestones" subtitle="High-priority milestones that have passed their deadline without completion.">
               <div className="overflow-x-auto">
                 <table className="w-full text-left text-sm">
                   <thead>
                     <tr className="border-b-2 border-[#0f172a] bg-red-50">
                       <th className="px-4 py-3 font-bold">Milestone</th>
                       <th className="px-4 py-3 font-bold">Seller</th>
                       <th className="px-4 py-3 font-bold">Buyer</th>
                       <th className="px-4 py-3 font-bold text-center">Deadline</th>
                       <th className="px-4 py-3 font-bold text-right">Action</th>
                     </tr>
                   </thead>
                   <tbody className="divide-y divide-slate-200">
                     {overdueMilestones.length === 0 ? (
                       <tr><td colSpan="5" className="px-4 py-10 text-center text-slate-400 italic">No overdue milestones at this time.</td></tr>
                     ) : overdueMilestones.map(m => (
                       <tr key={m.milestone_id} className="hover:bg-red-50/30 transition-colors">
                         <td className="px-4 py-3">
                           <p className="font-semibold">{m.title}</p>
                           <p className="text-[10px] text-slate-500 uppercase font-black">Order #{m.order_id}</p>
                         </td>
                         <td className="px-4 py-3 font-medium text-slate-700">{m.seller_name}</td>
                         <td className="px-4 py-3 font-medium text-slate-700">{m.buyer_name}</td>
                         <td className="px-4 py-3 text-center text-red-600 font-bold">
                           {new Date(m.deadline).toLocaleDateString()}
                         </td>
                         <td className="px-4 py-3 text-right">
                           <button 
                             onClick={() => navigate(`/orders/${m.order_id}`)}
                             className="brand-button-neutral py-1 px-3 text-[10px] font-black uppercase tracking-widest bg-white border-2 border-[#0f172a] shadow-[2px_2px_0px_#0f172a] hover:bg-[#fef08a] transition-all"
                           >
                             Inspect Order
                           </button>
                         </td>
                       </tr>
                     ))}
                   </tbody>
                 </table>
               </div>
            </ReportSection>
          )}
        </div>
      )}

      {/* SELLER CONTENT */}
      {user?.role !== 'Admin' && (
        <div className="space-y-8">
           {tab === 'earnings' && (
             <>
               <div className="grid grid-cols-1 md:grid-cols-3 gap-8">
                 <div className="brand-surface p-8 relative overflow-hidden flex flex-col justify-between min-h-[200px]">
                   <div className="relative z-10">
                     <p className="text-[10px] font-black uppercase tracking-widest text-[#50616b] mb-1">Available Balance</p>
                     <h2 className="text-5xl font-black font-spline text-[#0f172a]">${Number(sellerEarnings?.wallet_balance || 0).toLocaleString()}</h2>
                   </div>
                   <button 
                     onClick={() => navigate('/wallet')}
                     className="relative z-10 self-start mt-6 brand-button-primary px-6 py-2 rounded-lg font-bold"
                   >
                     Withdraw Funds
                   </button>
                   <div className="absolute -bottom-6 -right-6 h-32 w-32 bg-[#bae6fd] opacity-20 rotate-12 rounded-xl"></div>
                 </div>

                 <div className="md:col-span-2 grid grid-cols-1 sm:grid-cols-2 gap-6">
                    <div className="brand-surface p-6 border-dashed">
                      <p className="text-[10px] font-black uppercase tracking-widest text-[#50616b] mb-1">Total Lifetime Earnings</p>
                      <h3 className="text-3xl font-black text-green-600">${Number(sellerEarnings?.total_earnings || 0).toLocaleString()}</h3>
                    </div>
                    <div className="brand-surface p-6 border-dashed">
                      <p className="text-[10px] font-black uppercase tracking-widest text-[#50616b] mb-1">Total Withdrawn</p>
                      <h3 className="text-3xl font-black text-orange-600">${Number(sellerEarnings?.total_withdrawn || 0).toLocaleString()}</h3>
                    </div>
                    <div className="brand-surface p-6 border-dashed">
                      <p className="text-[10px] font-black uppercase tracking-widest text-[#50616b] mb-1">Orders Summary</p>
                      <div className="flex gap-4 mt-2">
                        <div className="text-center">
                          <p className="text-xl font-black text-[#0f172a]">{sellerStats?.completed_orders || 0}</p>
                          <p className="text-[9px] font-bold uppercase text-slate-500">Done</p>
                        </div>
                        <div className="text-center">
                          <p className="text-xl font-black text-[#0f172a]">{sellerStats?.active_orders || 0}</p>
                          <p className="text-[9px] font-bold uppercase text-slate-500">Active</p>
                        </div>
                        <div className="text-center">
                          <p className="text-xl font-black text-[#0f172a]">{sellerStats?.cancelled_orders || 0}</p>
                          <p className="text-[9px] font-bold uppercase text-slate-500">Lost</p>
                        </div>
                      </div>
                    </div>
                    <div className="brand-surface p-6 border-dashed bg-[#fef08a]/20">
                      <p className="text-[10px] font-black uppercase tracking-widest text-[#50616b] mb-1">Global Standing</p>
                      <h3 className="text-3xl font-black text-[#0f172a]">⭐ {Number(sellerStats?.avg_rating || 0).toFixed(1)}</h3>
                      <p className="text-xs font-bold text-slate-500 mt-1">From {sellerStats?.total_reviews || 0} customer reviews</p>
                    </div>
                 </div>
               </div>

               <ReportSection title="📦 Recent Order Activity">
                  <div className="overflow-x-auto">
                    <table className="w-full text-left text-sm">
                      <thead>
                        <tr className="border-b-2 border-[#0f172a] bg-slate-50">
                          <th className="px-4 py-3 font-bold">Gig</th>
                          <th className="px-4 py-3 font-bold">Buyer</th>
                          <th className="px-4 py-3 font-bold">Price</th>
                          <th className="px-4 py-3 font-bold text-center">Status</th>
                          <th className="px-4 py-3 font-bold text-right">Date</th>
                        </tr>
                      </thead>
                      <tbody className="divide-y divide-slate-200">
                        {(sellerStats?.recent_orders || []).map(o => (
                          <tr key={o.order_id} className="hover:bg-slate-50 transition-colors">
                            <td className="px-4 py-3 font-semibold truncate max-w-[200px]">{o.gig_title}</td>
                            <td className="px-4 py-3">{o.buyer_name}</td>
                            <td className="px-4 py-3 font-black">${o.total_price}</td>
                            <td className="px-4 py-3 text-center">
                               <span className={`text-[10px] font-black uppercase tracking-tighter border-2 border-[#0f172a] px-2 py-0.5 shadow-[1px_1px_0px_#0f172a] ${
                                 o.status === 'Completed' ? 'bg-green-200' : 
                                 o.status === 'In Progress' ? 'bg-blue-200' : 'bg-slate-200'
                               }`}>
                                 {o.status}
                               </span>
                            </td>
                            <td className="px-4 py-3 text-right text-slate-500 font-medium">
                              {new Date(o.order_date).toLocaleDateString()}
                            </td>
                          </tr>
                        ))}
                      </tbody>
                    </table>
                  </div>
               </ReportSection>
             </>
           )}

           {tab === 'feedback' && (
             <ReportSection title="Customer Reviews" subtitle="What people are saying about your services.">
                <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                  {userFeedback.length === 0 ? (
                    <p className="md:col-span-2 text-center py-20 text-slate-400 italic">No reviews received yet.</p>
                  ) : userFeedback.map(f => (
                    <div key={f.review_id} className="brand-surface p-5 hover:-translate-y-1 transition-transform bg-white relative">
                       <div className="flex justify-between items-start mb-4">
                         <div>
                            <p className="font-bold text-[#0f172a]">{f.reviewer_name}</p>
                            <p className="text-[10px] font-black uppercase text-slate-500">{f.gig_title}</p>
                         </div>
                         <span className="bg-[#fef08a] border-2 border-[#0f172a] px-2 py-1 text-xs font-black rotate-[2deg]">
                           ⭐ {f.rating}
                         </span>
                       </div>
                       <p className="text-sm italic text-slate-700 leading-relaxed">"{f.comment}"</p>
                       <div className="mt-4 pt-4 border-t border-dashed border-slate-200 flex justify-between items-center">
                          <span className="text-[10px] font-bold text-slate-400">{new Date(f.created_at).toLocaleDateString()}</span>
                          <p className="text-[10px] font-black uppercase tracking-tight text-[#2da8ed]">Order #{f.order_id}</p>
                       </div>
                       {f.seller_reply && (
                         <div className="mt-4 bg-slate-50 p-3 border-l-4 border-[#bae6fd] text-xs">
                           <p className="font-bold uppercase text-[9px] mb-1">Your Reply:</p>
                           <p className="italic text-slate-600">{f.seller_reply}</p>
                         </div>
                       )}
                    </div>
                  ))}
                </div>
             </ReportSection>
           )}
        </div>
      )}
    </div>
  );
}

function TabButton({ active, onClick, label }) {
  return (
    <button
      onClick={onClick}
      className={`rounded-xl px-5 py-2.5 text-sm font-bold transition-all border-2 border-[#0f172a] shadow-[3px_3px_0px_#0f172a] active:shadow-none active:translate-x-[2px] active:translate-y-[2px] ${
        active
          ? 'bg-[#1689ca] text-white shadow-none translate-x-[2px] translate-y-[2px]'
          : 'bg-white text-slate-700 hover:bg-[#f1fbff] hover:text-[#1689ca]'
      }`}
    >
      {label}
    </button>
  );
}

function StatCard({ label, value, icon, color }) {
  return (
    <div className={`brand-surface p-5 ${color} flex flex-col items-center text-center group transition-transform hover:-translate-y-1`}>
      <span className="text-3xl mb-3 group-hover:scale-125 transition-transform">{icon}</span>
      <p className="text-[10px] font-black uppercase tracking-widest text-slate-500 mb-1">{label}</p>
      <p className="text-xl font-black text-[#0f172a]">{value || 0}</p>
    </div>
  );
}

function ReportSection({ title, subtitle, children }) {
  return (
    <div className="brand-surface overflow-hidden">
      <div className="px-6 py-5 border-b-2 border-[#0f172a] bg-white">
        <h3 className="brand-page-title text-xl font-bold">{title}</h3>
        {subtitle && <p className="text-xs text-slate-500 font-medium italic mt-0.5">{subtitle}</p>}
      </div>
      <div className="p-6">
        {children}
      </div>
    </div>
  );
}
