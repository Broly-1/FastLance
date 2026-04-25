import React, { useState, useEffect } from 'react';
import { useAuth } from '../context/useAuth';
import { Link } from 'react-router-dom';

export default function BuyerOrders() {
  const { user } = useAuth();
  const [orders, setOrders] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);

  useEffect(() => {
    const fetchOrders = async () => {
      try {
        const response = await fetch(`http://localhost:3000/api/orders/buyer/${user.id}`);
        if (!response.ok) throw new Error('Failed to fetch orders');
        const data = await response.json();
        setOrders(data);
      } catch (err) {
        setError(err.message);
      } finally {
        setLoading(false);
      }
    };
    fetchOrders();
  }, [user.id]);

  if (loading) return <div className="py-20 text-center text-slate-500">Loading orders...</div>;
  if (error) return <div className="text-center py-20 text-red-500">{error}</div>;

  const getStatusClasses = (status) => {
    if (status === 'Pending') return 'brand-status brand-status-pending';
    if (status === 'In Progress') return 'brand-status brand-status-progress';
    if (status === 'Delivered') return 'brand-status brand-status-delivered';
    if (status === 'Completed') return 'brand-status brand-status-completed';
    if (status === 'Cancelled') return 'brand-status brand-status-cancelled';
    return 'brand-status border-slate-200 bg-slate-100 text-slate-700';
  };

  return (
    <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-10">
      <div className="brand-hero mb-8 px-6 py-7 sm:px-8">
        <h1 className="brand-page-title text-3xl font-extrabold">My Purchases</h1>
        <p className="brand-page-subtitle mt-1 text-sm">Track every order in one place.</p>
      </div>
      
      {orders.length === 0 ? (
        <div className="brand-surface p-10 text-center">
          <p className="mb-4 text-lg text-slate-500">You haven't placed any orders yet.</p>
          <Link to="/buyer" className="brand-link font-bold hover:underline">Browse Gigs</Link>
        </div>
      ) : (
        <div className="brand-surface overflow-x-auto">
          <table className="min-w-full divide-y divide-[#e4eef6]">
            <thead className="bg-[#f8fcff]">
              <tr>
                <th className="px-6 py-3 text-left text-xs font-medium uppercase tracking-wider text-slate-500">Order ID</th>
                <th className="px-6 py-3 text-left text-xs font-medium uppercase tracking-wider text-slate-500">Gig Title</th>
                <th className="px-6 py-3 text-left text-xs font-medium uppercase tracking-wider text-slate-500">Seller</th>
                <th className="px-6 py-3 text-left text-xs font-medium uppercase tracking-wider text-slate-500">Total Price</th>
                <th className="px-6 py-3 text-left text-xs font-medium uppercase tracking-wider text-slate-500">Status</th>
                <th className="px-6 py-3 text-left text-xs font-medium uppercase tracking-wider text-slate-500">Date Placed</th>
                <th className="px-6 py-3 text-left text-xs font-medium uppercase tracking-wider text-slate-500">Actions</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-[#e8f1f7] bg-white/80">
              {orders.map((order) => (
                <tr key={order.order_id} className="transition-colors hover:bg-[#f8fcff]">
                  <td className="px-6 py-4 whitespace-nowrap text-sm font-medium text-slate-900">
                    <Link to={`/orders/${order.order_id}`} className="brand-link hover:underline">
                      #{order.order_id}
                    </Link>
                  </td>
                  <td className="max-w-xs truncate px-6 py-4 whitespace-nowrap text-sm text-slate-700">
                    <Link to={`/gigs/${order.gig_id}`} className="brand-link hover:underline">
                      {order.gig_title}
                    </Link>
                  </td>
                  <td className="px-6 py-4 whitespace-nowrap text-sm text-slate-500">
                    {order.seller_name}
                  </td>
                  <td className="px-6 py-4 whitespace-nowrap text-sm font-bold text-slate-900">
                    ${order.total_price}
                  </td>
                  <td className="px-6 py-4 whitespace-nowrap text-sm">
                    <span className={getStatusClasses(order.status)}>
                      {order.status || 'Pending'}
                    </span>
                  </td>
                  <td className="px-6 py-4 whitespace-nowrap text-sm text-slate-500">
                    {new Date(order.created_at || order.order_date).toLocaleDateString()}
                  </td>
                  <td className="px-6 py-4 whitespace-nowrap text-sm">
                    <Link
                      to={`/orders/${order.order_id}`}
                      className="brand-button-neutral inline-flex items-center rounded-lg px-3 py-1.5 text-xs font-semibold transition"
                    >
                      View Details
                    </Link>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}
    </div>
  );
}
