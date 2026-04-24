import React, { useEffect, useState } from 'react';
import { useNavigate, useParams } from 'react-router-dom';
import { useAuth } from '../context/useAuth';

const API_BASE_URL = 'http://localhost:3000';

function getStatusClasses(status) {
  if (status === 'Pending') return 'brand-status brand-status-pending';
  if (status === 'In Progress') return 'brand-status brand-status-progress';
  if (status === 'Delivered') return 'brand-status brand-status-delivered';
  if (status === 'Completed') return 'brand-status brand-status-completed';
  if (status === 'Cancelled') return 'brand-status brand-status-cancelled';
  return 'brand-status border-slate-200 bg-slate-100 text-slate-700';
}

async function readJsonResponse(response, fallbackMessage) {
  let data = null;

  try {
    data = await response.json();
  } catch {
    data = null;
  }

  if (!response.ok) {
    throw new Error(data?.error || fallbackMessage);
  }

  return data;
}

async function fetchOrderPageData(orderId) {
  const [orderResponse, submissionsResponse] = await Promise.all([
    fetch(`${API_BASE_URL}/api/orders/${orderId}`),
    fetch(`${API_BASE_URL}/api/submissions/order/${orderId}`),
  ]);

  const orderData = await readJsonResponse(orderResponse, 'Order not found');
  const submissionsData = await readJsonResponse(
    submissionsResponse,
    'Failed to load order activity'
  );

  return {
    order: orderData,
    submissions: Array.isArray(submissionsData) ? submissionsData : [],
  };
}

function OrderDetails() {
  const { orderId } = useParams();
  const { user } = useAuth();
  const navigate = useNavigate();

  const [order, setOrder] = useState(null);
  const [submissions, setSubmissions] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);

  const [deliveryMessage, setDeliveryMessage] = useState('');
  const [fileUrl, setFileUrl] = useState('');
  const [deliverySubmitting, setDeliverySubmitting] = useState(false);

  const [showRevisionForm, setShowRevisionForm] = useState(false);
  const [revisionMessage, setRevisionMessage] = useState('');
  const [revisionSubmitting, setRevisionSubmitting] = useState(false);

  const [statusUpdating, setStatusUpdating] = useState(false);
  const [actionError, setActionError] = useState(null);
  const [actionSuccess, setActionSuccess] = useState(null);

  useEffect(() => {
    let cancelled = false;

    const loadOrderPage = async () => {
      try {
        setLoading(true);
        setError(null);

        const data = await fetchOrderPageData(orderId);
        if (cancelled) {
          return;
        }

        setOrder(data.order);
        setSubmissions(data.submissions);
      } catch (err) {
        if (!cancelled) {
          setError(err.message);
        }
      } finally {
        if (!cancelled) {
          setLoading(false);
        }
      }
    };

    loadOrderPage();

    return () => {
      cancelled = true;
    };
  }, [orderId]);

  const refreshOrderPage = async () => {
    const data = await fetchOrderPageData(orderId);
    setOrder(data.order);
    setSubmissions(data.submissions);
  };

  const resetFeedback = () => {
    setActionError(null);
    setActionSuccess(null);
  };

  const handleStatusChange = async (nextStatus, successMessage) => {
    try {
      setStatusUpdating(true);
      resetFeedback();

      const response = await fetch(`${API_BASE_URL}/api/orders/${orderId}/status`, {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ status: nextStatus }),
      });

      await readJsonResponse(response, 'Failed to update order status');
      await refreshOrderPage();
      setActionSuccess(successMessage);
    } catch (err) {
      setActionError(err.message);
    } finally {
      setStatusUpdating(false);
    }
  };

  const handleDeliverySubmit = async (event) => {
    event.preventDefault();

    const trimmedMessage = deliveryMessage.trim();
    const trimmedFileUrl = fileUrl.trim();

    if (!trimmedMessage && !trimmedFileUrl) {
      setActionError('Add a delivery message or file URL before submitting.');
      setActionSuccess(null);
      return;
    }

    try {
      setDeliverySubmitting(true);
      resetFeedback();

      const response = await fetch(`${API_BASE_URL}/api/submissions`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          order_id: Number(orderId),
          submitted_by: user.id,
          file_url: trimmedFileUrl || null,
          message: trimmedMessage || null,
          is_revision: false,
        }),
      });

      await readJsonResponse(response, 'Failed to submit delivery');

      setDeliveryMessage('');
      setFileUrl('');
      await refreshOrderPage();
      setActionSuccess('Work delivered successfully.');
    } catch (err) {
      setActionError(err.message);
    } finally {
      setDeliverySubmitting(false);
    }
  };

  const handleAcceptDelivery = async () => {
    if (!window.confirm('Are you sure you want to approve this delivery and complete the order?')) {
      return;
    }

    await handleStatusChange('Completed', 'Order completed successfully.');
  };

  const handleRequestRevision = async (event) => {
    event.preventDefault();

    const trimmedMessage = revisionMessage.trim();
    if (!trimmedMessage) {
      setActionError('Please describe what needs to be revised.');
      setActionSuccess(null);
      return;
    }

    try {
      setRevisionSubmitting(true);
      resetFeedback();

      const response = await fetch(`${API_BASE_URL}/api/submissions`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          order_id: Number(orderId),
          submitted_by: user.id,
          file_url: null,
          message: trimmedMessage,
          is_revision: true,
        }),
      });

      await readJsonResponse(response, 'Failed to request a revision');

      setRevisionMessage('');
      setShowRevisionForm(false);
      await refreshOrderPage();
      setActionSuccess('Revision request sent to the seller.');
    } catch (err) {
      setActionError(err.message);
    } finally {
      setRevisionSubmitting(false);
    }
  };

  if (loading) {
    return <div className="p-8 text-center text-slate-500">Loading order details...</div>;
  }

  if (error) {
    return <div className="p-8 text-center text-red-500">{error}</div>;
  }

  if (!order) {
    return null;
  }

  const isSeller = user?.id === order.seller_id;
  const isBuyer = user?.id === order.buyer_id;
  const isParticipant = isSeller || isBuyer;

  if (!isParticipant) {
    return (
      <div className="max-w-3xl mx-auto w-full p-4 sm:p-6 lg:p-8">
        <div className="rounded-2xl border border-amber-200 bg-amber-50 p-8 text-center shadow-sm">
          <h1 className="text-2xl font-bold text-amber-900">Access denied</h1>
          <p className="mt-3 text-sm text-amber-800">
            You can only view order details for orders where you are the buyer or seller.
          </p>
          <div className="mt-6 flex justify-center gap-3">
            <button
              type="button"
              onClick={() => navigate(-1)}
              className="brand-button-neutral rounded-lg px-4 py-2 text-sm font-semibold transition"
            >
              Go Back
            </button>
            <button
              type="button"
              onClick={() => navigate(user?.role === 'Admin' ? '/admin' : '/')}
              className="brand-button-primary rounded-lg px-4 py-2 text-sm font-semibold transition"
            >
              Return to Dashboard
            </button>
          </div>
        </div>
      </div>
    );
  }

  return (
    <div className="max-w-4xl mx-auto w-full p-4 sm:p-6 lg:p-8">
      <div className="brand-hero mb-8 flex flex-col justify-between gap-4 px-6 py-7 sm:flex-row sm:items-center sm:px-8">
        <div>
          <button
            type="button"
            onClick={() => navigate(-1)}
            className="brand-link mb-2 flex items-center text-sm font-medium"
          >
            &larr; Back to Orders
          </button>
          <h1 className="text-2xl font-bold text-slate-900">Order #{order.order_id}</h1>
          <p className="mt-1 text-slate-500">
            Gig: <span className="font-medium text-slate-800">{order.gig_title}</span>
          </p>
        </div>
        <div className="mt-4 sm:mt-0 flex flex-col items-start sm:items-end">
          <span className={getStatusClasses(order.status)}>
            {order.status}
          </span>
          <span className="mt-2 text-sm font-bold text-slate-700">${Number(order.total_price).toFixed(2)}</span>
        </div>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-3 gap-8">
        <div className="md:col-span-2 space-y-6">
          <h2 className="text-xl font-bold text-slate-900">Timeline & Submissions</h2>

          {submissions.length === 0 ? (
            <div className="brand-surface p-6 text-center text-slate-500">
              No submissions yet.
            </div>
          ) : (
            <div className="space-y-4">
              {submissions.map((submission) => {
                const isBuyerRevision = Boolean(submission.is_revision) && submission.submitted_by === order.buyer_id;

                return (
                  <div
                    key={submission.submission_id}
                    className={`rounded-lg border p-5 shadow-sm ${
                      isBuyerRevision ? 'border-[#f0db82] bg-[#fff8d9]' : 'brand-surface'
                    }`}
                  >
                    <div className="flex justify-between items-start gap-4 mb-2">
                      <div>
                        <span className="font-semibold text-slate-900">{submission.submitted_by_name}</span>
                        {isBuyerRevision && (
                          <span className="ml-2 rounded-full border border-[#f0db82] bg-[#fffdf4] px-2 py-0.5 text-xs font-semibold text-[#936600]">
                            Revision Request
                          </span>
                        )}
                      </div>
                      <span className="text-xs text-slate-500">
                        {new Date(submission.submitted_at).toLocaleString()}
                      </span>
                    </div>

                    {submission.message && (
                      <p className="mt-2 whitespace-pre-wrap text-slate-700">{submission.message}</p>
                    )}

                    {submission.file_url && (
                      <div className="mt-4">
                        <a
                          href={submission.file_url}
                          target="_blank"
                          rel="noopener noreferrer"
                          className="brand-button-neutral inline-flex items-center rounded-md px-4 py-2 text-sm font-medium transition"
                        >
                          <svg className="mr-2 h-5 w-5 text-[#2da8ed]" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M15.172 7l-6.586 6.586a2 2 0 102.828 2.828l6.414-6.586a4 4 0 00-5.656-5.656l-6.415 6.585a6 6 0 108.486 8.486L20.5 13" />
                          </svg>
                          View Attachment
                        </a>
                      </div>
                    )}
                  </div>
                );
              })}
            </div>
          )}
        </div>

        <div className="space-y-6">
          {(actionError || actionSuccess) && (
            <div
              className={`rounded-lg border px-4 py-3 text-sm ${
                actionError
                  ? 'border-red-200 bg-red-50 text-red-700'
                  : 'border-[#c6ebff] bg-[#eef9ff] text-[#0f699e]'
              }`}
            >
              {actionError || actionSuccess}
            </div>
          )}

          <div className="brand-surface p-5">
            <h3 className="mb-4 font-bold text-slate-900">Order Info</h3>
            <div className="space-y-3 text-sm">
              <div className="flex justify-between">
                <span className="text-slate-500">Buyer</span>
                <span className="font-medium">{order.buyer_name}</span>
              </div>
              <div className="flex justify-between">
                <span className="text-slate-500">Seller</span>
                <span className="font-medium">{order.seller_name}</span>
              </div>
              <div className="flex justify-between">
                <span className="text-slate-500">Revision Count</span>
                <span className="font-medium">{order.revision_number}</span>
              </div>
              <div className="mt-2 flex justify-between border-t border-[#edf5fb] pt-2">
                <span className="text-slate-500">Ordered</span>
                <span>{new Date(order.order_date).toLocaleDateString()}</span>
              </div>
              <div className="flex justify-between">
                <span className="text-slate-500">Deadline</span>
                <span className="font-medium text-[#0f699e]">{new Date(order.deadline).toLocaleDateString()}</span>
              </div>
            </div>
          </div>

          {isSeller && ['Pending', 'In Progress'].includes(order.status) && (
            <div className="brand-surface p-5">
              <h3 className="mb-3 font-bold text-slate-900">Order Actions</h3>
              <div className="flex flex-wrap gap-3">
                {order.status === 'Pending' && (
                  <button
                    type="button"
                    onClick={() => handleStatusChange('In Progress', 'Order moved to In Progress.')}
                    disabled={statusUpdating}
                    className="brand-button-primary rounded-md px-4 py-2 text-sm font-semibold transition disabled:cursor-not-allowed disabled:opacity-60"
                  >
                    Start Order
                  </button>
                )}
                <button
                  type="button"
                  onClick={() => handleStatusChange('Cancelled', 'Order cancelled.')}
                  disabled={statusUpdating}
                  className="rounded-md border border-red-200 bg-white px-4 py-2 text-sm font-semibold text-red-700 transition hover:bg-red-50 disabled:cursor-not-allowed disabled:text-red-300"
                >
                  Cancel Order
                </button>
              </div>
            </div>
          )}

          {isSeller && ['Pending', 'In Progress'].includes(order.status) && (
            <div className="brand-surface p-5">
              <h3 className="mb-3 font-bold text-slate-900">Submit Delivery</h3>
              <form onSubmit={handleDeliverySubmit} className="space-y-4">
                <div>
                  <label className="mb-1 block text-sm font-medium text-slate-700">Message</label>
                  <textarea
                    rows="3"
                    className="brand-input"
                    placeholder="Describe your delivery..."
                    value={deliveryMessage}
                    onChange={(event) => setDeliveryMessage(event.target.value)}
                  />
                </div>
                <div>
                  <label className="mb-1 block text-sm font-medium text-slate-700">
                    File URL (Google Drive, Dropbox, etc.)
                  </label>
                  <input
                    type="url"
                    className="brand-input"
                    placeholder="https://..."
                    value={fileUrl}
                    onChange={(event) => setFileUrl(event.target.value)}
                  />
                </div>
                <button
                  type="submit"
                  disabled={deliverySubmitting || statusUpdating}
                  className="brand-button-primary w-full rounded-md px-4 py-2 text-sm font-semibold transition disabled:cursor-not-allowed disabled:opacity-60"
                >
                  {deliverySubmitting ? 'Submitting...' : 'Deliver Work'}
                </button>
              </form>
            </div>
          )}

          {isBuyer && order.status === 'Delivered' && (
            <div className="rounded-lg border border-[#f0db82] bg-[#fff8d9] p-5 shadow-sm">
              <h3 className="mb-3 font-bold text-[#936600]">Review Delivery</h3>
              <p className="mb-4 text-sm text-[#936600]">
                The seller has delivered their work. Approve it to complete the order, or request revisions with specific feedback.
              </p>
              <div className="space-y-3">
                <button
                  type="button"
                  onClick={handleAcceptDelivery}
                  disabled={statusUpdating || revisionSubmitting}
                  className="brand-button-primary w-full rounded-md px-4 py-2 text-sm font-semibold transition disabled:cursor-not-allowed disabled:opacity-60"
                >
                  {statusUpdating ? 'Completing...' : 'Approve & Complete Order'}
                </button>

                {!showRevisionForm ? (
                  <button
                    type="button"
                    onClick={() => {
                      resetFeedback();
                      setShowRevisionForm(true);
                    }}
                    disabled={statusUpdating}
                    className="brand-button-secondary w-full rounded-md px-4 py-2 text-sm font-semibold transition disabled:cursor-not-allowed disabled:opacity-60"
                  >
                    Request Revision
                  </button>
                ) : (
                  <form onSubmit={handleRequestRevision} className="space-y-3 rounded-lg border border-[#f0db82] bg-white p-4">
                    <div>
                      <label className="mb-1 block text-sm font-medium text-slate-700">
                        What should be revised?
                      </label>
                      <textarea
                        rows="4"
                        className="brand-input"
                        placeholder="Describe the changes you need from the seller..."
                        value={revisionMessage}
                        onChange={(event) => setRevisionMessage(event.target.value)}
                      />
                    </div>
                    <div className="flex gap-3">
                      <button
                        type="submit"
                        disabled={revisionSubmitting}
                        className="brand-button-primary flex-1 rounded-md px-4 py-2 text-sm font-semibold transition disabled:cursor-not-allowed disabled:opacity-60"
                      >
                        {revisionSubmitting ? 'Sending...' : 'Send Revision Request'}
                      </button>
                      <button
                        type="button"
                        onClick={() => {
                          setShowRevisionForm(false);
                          setRevisionMessage('');
                          resetFeedback();
                        }}
                        className="brand-button-neutral rounded-md px-4 py-2 text-sm font-semibold transition"
                      >
                        Cancel
                      </button>
                    </div>
                  </form>
                )}
              </div>
            </div>
          )}

          {order.status === 'Completed' && (
            <div className="brand-surface p-5 text-center">
              <span className="brand-status brand-status-completed">Completed</span>
              <h3 className="mb-1 mt-3 font-bold text-slate-900">Order Completed</h3>
              <p className="text-sm text-slate-600">This order has been successfully finalized.</p>
            </div>
          )}

          {order.status === 'Cancelled' && (
            <div className="bg-red-50 p-5 rounded-lg shadow-sm border border-red-100 text-center">
              <h3 className="font-bold text-red-900 mb-1">Order Cancelled</h3>
              <p className="text-sm text-red-800">This order is no longer active.</p>
            </div>
          )}
        </div>
      </div>
    </div>
  );
}

export default OrderDetails;
