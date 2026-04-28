import React, { useEffect, useState } from 'react';
import { useNavigate, useParams, Link } from 'react-router-dom';
import { useAuth } from '../context/useAuth';

const API_BASE_URL = 'http://localhost:3000';

function StarRating({ rating, size = 'small' }) {
  const iconClass = size === 'large' ? 'h-5 w-5' : 'h-4 w-4';

  return (
    <div className="flex items-center gap-1 text-[#695f02]">
      {[1, 2, 3, 4, 5].map((value) => (
        <svg
          key={value}
          className={iconClass}
          viewBox="0 0 20 20"
          fill={value <= rating ? '#fef08a' : 'none'}
          stroke="currentColor"
          strokeWidth="2"
          aria-hidden="true"
        >
          <path d="M10 2.5l2.32 4.7 5.18.75-3.75 3.66.88 5.16L10 14.4 5.37 16.77l.88-5.16L2.5 7.95l5.18-.75L10 2.5z" />
        </svg>
      ))}
    </div>
  );
}

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

async function fetchOptionalReviewByOrder(orderId) {
  const response = await fetch(`${API_BASE_URL}/api/reviews/order/${orderId}`);

  if (response.status === 404) {
    return null;
  }

  return readJsonResponse(response, 'Failed to load review');
}

async function fetchOrderPageData(orderId) {
  const [orderResponse, submissionsResponse, review, disputesResponse, milestonesResponse, invoicesResponse] = await Promise.all([
    fetch(`${API_BASE_URL}/api/orders/${orderId}`),
    fetch(`${API_BASE_URL}/api/submissions/order/${orderId}`),
    fetchOptionalReviewByOrder(orderId),
    fetch(`${API_BASE_URL}/api/disputes/order/${orderId}`),
    fetch(`${API_BASE_URL}/api/milestones/order/${orderId}`),
    fetch(`${API_BASE_URL}/api/invoices/order/${orderId}`),
  ]);

  const orderData       = await readJsonResponse(orderResponse, 'Order not found');
  const submissionsData = await readJsonResponse(submissionsResponse, 'Failed to load order activity');
  const disputesData    = await readJsonResponse(disputesResponse, 'Failed to load disputes');
  const milestonesData  = await readJsonResponse(milestonesResponse, 'Failed to load milestones');
  const invoicesData    = await readJsonResponse(invoicesResponse, 'Failed to load invoices');

  return {
    order:       orderData,
    submissions: Array.isArray(submissionsData) ? submissionsData : [],
    review,
    disputes:    Array.isArray(disputesData)   ? disputesData   : [],
    milestones:  Array.isArray(milestonesData) ? milestonesData : [],
    invoices:    Array.isArray(invoicesData)   ? invoicesData   : [],
  };
}


function OrderDetails() {
  const { orderId } = useParams();
  const { user } = useAuth();
  const navigate = useNavigate();

  const [order, setOrder] = useState(null);
  const [submissions, setSubmissions] = useState([]);
  const [review, setReview] = useState(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);

  const [deliveryMessage, setDeliveryMessage] = useState('');
  const [fileUrl, setFileUrl] = useState('');
  const [deliverySubmitting, setDeliverySubmitting] = useState(false);

  const [showRevisionForm, setShowRevisionForm] = useState(false);
  const [revisionMessage, setRevisionMessage] = useState('');
  const [revisionSubmitting, setRevisionSubmitting] = useState(false);

  const [reviewRating, setReviewRating] = useState('5');
  const [reviewComment, setReviewComment] = useState('');
  const [reviewSubmitting, setReviewSubmitting] = useState(false);

  const [sellerReplyDraft, setSellerReplyDraft] = useState('');
  const [replySubmitting, setReplySubmitting] = useState(false);

  const [statusUpdating, setStatusUpdating] = useState(false);
  const [actionError, setActionError] = useState(null);
  const [actionSuccess, setActionSuccess] = useState(null);

  const [disputes, setDisputes] = useState([]);
  const [showDisputeForm, setShowDisputeForm] = useState(false);
  const [disputeReason, setDisputeReason] = useState('');
  const [disputeSubmitting, setDisputeSubmitting] = useState(false);

  // Milestones
  const [milestones, setMilestones] = useState([]);
  const [showMilestoneForm, setShowMilestoneForm] = useState(false);
  const [milestoneTitle, setMilestoneTitle] = useState('');
  const [milestoneDesc, setMilestoneDesc] = useState('');
  const [milestoneDeadline, setMilestoneDeadline] = useState('');
  const [milestoneAmount, setMilestoneAmount] = useState('');
  const [milestoneCritical, setMilestoneCritical] = useState(false);
  const [milestoneSubmitting, setMilestoneSubmitting] = useState(false);

  // Invoices
  const [invoices, setInvoices] = useState([]);
  const [showInvoiceForm, setShowInvoiceForm] = useState(false);
  const [invoiceAmount, setInvoiceAmount] = useState('');
  const [invoiceDueDate, setInvoiceDueDate] = useState('');
  const [invoiceSubmitting, setInvoiceSubmitting] = useState(false);

  const applyPageData = (data) => {
    setOrder(data.order);
    setSubmissions(data.submissions);
    setReview(data.review);
    setSellerReplyDraft(data.review?.seller_reply || '');
    setDisputes(data.disputes ?? []);
    setMilestones(data.milestones ?? []);
    setInvoices(data.invoices ?? []);
  };

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

        applyPageData(data);
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
    applyPageData(data);
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

  const handleReviewSubmit = async (event) => {
    event.preventDefault();

    try {
      setReviewSubmitting(true);
      resetFeedback();

      const response = await fetch(`${API_BASE_URL}/api/reviews`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          order_id: Number(orderId),
          reviewer_id: user.id,
          rating: Number(reviewRating),
          comment: reviewComment.trim() || null,
        }),
      });

      await readJsonResponse(response, 'Failed to submit review');

      setReviewRating('5');
      setReviewComment('');
      await refreshOrderPage();
      setActionSuccess('Your review has been published.');
    } catch (err) {
      setActionError(err.message);
    } finally {
      setReviewSubmitting(false);
    }
  };

  const handleSellerReplySubmit = async (event) => {
    event.preventDefault();

    const trimmedReply = sellerReplyDraft.trim();
    if (!trimmedReply || !review) {
      setActionError('Please add a reply before saving.');
      setActionSuccess(null);
      return;
    }

    try {
      setReplySubmitting(true);
      resetFeedback();

      const response = await fetch(`${API_BASE_URL}/api/reviews/${review.review_id}`, {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          seller_id: user.id,
          seller_reply: trimmedReply,
        }),
      });

      await readJsonResponse(response, 'Failed to save seller reply');

      await refreshOrderPage();
      setActionSuccess(review.seller_reply ? 'Seller reply updated.' : 'Seller reply published.');
    } catch (err) {
      setActionError(err.message);
    } finally {
      setReplySubmitting(false);
    }
  };

  const handleRaiseDispute = async (event) => {
    event.preventDefault();
    const trimmed = disputeReason.trim();
    if (!trimmed) {
      setActionError('Please describe the issue before submitting.');
      setActionSuccess(null);
      return;
    }
    try {
      setDisputeSubmitting(true);
      resetFeedback();
      const response = await fetch(`${API_BASE_URL}/api/disputes`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          order_id: Number(orderId),
          raised_by: user.id,
          reason: trimmed,
        }),
      });
      await readJsonResponse(response, 'Failed to open dispute');
      setDisputeReason('');
      setShowDisputeForm(false);
      await refreshOrderPage();
      setActionSuccess('Dispute raised. An admin will review it shortly.');
    } catch (err) {
      setActionError(err.message);
    } finally {
      setDisputeSubmitting(false);
    }
  };

  const handleCreateMilestone = async (event) => {
    event.preventDefault();
    if (!milestoneTitle.trim() || !milestoneDeadline) {
      setActionError('Title and deadline are required for milestones.');
      return;
    }
    try {
      setMilestoneSubmitting(true);
      resetFeedback();
      const response = await fetch(`${API_BASE_URL}/api/milestones`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          order_id: Number(orderId),
          title: milestoneTitle.trim(),
          description: milestoneDesc.trim(),
          deadline: milestoneDeadline,
          amount: parseFloat(milestoneAmount) || null,
          is_critical_path: milestoneCritical
        }),
      });
      await readJsonResponse(response, 'Failed to create milestone');
      setMilestoneTitle('');
      setMilestoneDesc('');
      setMilestoneDeadline('');
      setMilestoneAmount('');
      setMilestoneCritical(false);
      setShowMilestoneForm(false);
      await refreshOrderPage();
      setActionSuccess('Milestone created.');
    } catch (err) {
      setActionError(err.message);
    } finally {
      setMilestoneSubmitting(false);
    }
  };

  const handleCompleteMilestone = async (milestoneId) => {
    try {
      resetFeedback();
      const response = await fetch(`${API_BASE_URL}/api/milestones/${milestoneId}`, {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          status: 'Completed',
          completed_at: new Date().toISOString()
        }),
      });
      await readJsonResponse(response, 'Failed to complete milestone');
      await refreshOrderPage();
      setActionSuccess('Milestone marked as completed.');
    } catch (err) {
      setActionError(err.message);
    }
  };

  const handleDeliverMilestone = async (milestoneId) => {
    try {
      resetFeedback();
      const response = await fetch(`${API_BASE_URL}/api/milestones/${milestoneId}`, {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          status: 'Delivered',
        }),
      });
      await readJsonResponse(response, 'Failed to deliver milestone');
      await refreshOrderPage();
      setActionSuccess('Milestone delivered. Awaiting buyer approval.');
    } catch (err) {
      setActionError(err.message);
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
    <div className="max-w-6xl mx-auto w-full p-4 sm:p-6 lg:p-8">
      {/* Header Section */}
      <div className="brand-hero mb-10 flex flex-col justify-between gap-6 px-8 py-8 sm:flex-row sm:items-center relative">
        <div className="absolute -top-4 -left-4 bg-[#fef08a] border-2 border-[#0f172a] px-3 py-1 rotate-[-3deg] shadow-sm font-black text-xs uppercase tracking-widest">
          Order Workspace
        </div>
        <div>
          <button
            type="button"
            onClick={() => navigate(-1)}
            className="group mb-4 flex items-center text-xs font-black uppercase tracking-widest text-[#50616b] hover:text-[#0f172a] transition-colors"
          >
            <span className="mr-2 transform group-hover:-translate-x-1 transition-transform">←</span> Back to Dashboard
          </button>
          <h1 className="text-4xl font-black font-spline text-[#0f172a] italic tracking-tight">Order #{order.order_id}</h1>
          <p className="mt-2 text-[#50616b] font-bold text-sm">
            Gig: <span className="text-[#0f172a] underline decoration-[#fef08a] decoration-4 underline-offset-4">{order.gig_title}</span>
          </p>
        </div>
        <div className="flex flex-col items-start sm:items-end gap-3">
          <span className={`${getStatusClasses(order.status)} scale-110`}>{order.status}</span>
          <div className="bg-[#0f172a] text-white px-4 py-2 font-black text-xl rotate-[1deg] shadow-md">
            ${Number(order.total_price).toFixed(2)}
          </div>
        </div>
      </div>

      <div className="grid grid-cols-1 gap-10 lg:grid-cols-12 items-start">
        {/* ── LEFT COLUMN: WORKSPACE ── */}
        <div className="lg:col-span-8 space-y-10">
          
          {(actionError || actionSuccess) && (
            <div
              className={`brand-surface p-5 font-bold text-sm rotate-[0.5deg] ${
                actionError
                  ? 'border-red-400 bg-red-50 text-red-700'
                  : 'border-[#c6ebff] bg-[#eef9ff] text-[#0f699e]'
              }`}
            >
              {actionError ? `⚠️ ERROR: ${actionError}` : `✨ SUCCESS: ${actionSuccess}`}
            </div>
          )}

          {/* ── Deliverables & Milestones ── */}
          <section className="space-y-6">
            <div className="flex items-center gap-4 mb-2">
              <h2 className="text-2xl font-black text-[#0f172a] uppercase italic">Milestones</h2>
              <div className="h-0.5 flex-1 bg-[#0f172a] opacity-10"></div>
            </div>
            
            <div className="space-y-6 relative pl-6">
              <div className="absolute left-[3px] top-4 bottom-4 w-1 border-l-4 border-dotted border-[#0f172a] opacity-20"></div>
              
              {milestones.length > 0 ? (
                milestones.map((m) => (
                  <div key={m.milestone_id} className="brand-surface p-6 relative group bg-white hover:bg-[#fcfdfd]">
                    <div className="absolute -left-[31px] top-8 w-5 h-5 rounded-full border-4 border-[#0f172a] bg-[#fef08a] z-10 shadow-sm"></div>
                    <div className="flex justify-between items-start mb-4">
                      <div>
                        <h4 className="font-black text-lg text-[#0f172a] uppercase tracking-tight">{m.title}</h4>
                        {m.description && <p className="text-sm text-[#50616b] font-medium mt-1">"{m.description}"</p>}
                      </div>
                      <span className={getStatusClasses(m.status)}>
                        {m.status}
                      </span>
                    </div>
                    <div className="flex flex-wrap justify-between items-center gap-4 pt-4 border-t-2 border-[#0f172a]/5">
                      <div className="flex gap-6 text-[10px] font-black text-[#0f172a]/40 uppercase tracking-widest">
                        <div className="flex items-center gap-1">📅 {new Date(m.deadline).toLocaleDateString()}</div>
                        {m.amount && <div className="flex items-center gap-1">💰 ${m.amount}</div>}
                        {m.is_critical_path && <div className="text-amber-600 bg-amber-50 px-2 py-0.5 rounded">🔥 CRITICAL</div>}
                      </div>
                      <div className="flex gap-2">
                        {isSeller && m.status === 'Pending' && (
                          <button
                            onClick={() => handleDeliverMilestone(m.milestone_id)}
                            className="brand-button-primary text-xs py-2 px-6"
                          >
                            Deliver Phase
                          </button>
                        )}
                        {isBuyer && m.status === 'Delivered' && (
                          <button
                            onClick={() => handleCompleteMilestone(m.milestone_id)}
                            className="brand-button-primary text-xs py-2 px-6 bg-[#22c55e] border-[#166534] shadow-[#166534]"
                          >
                            Approve Phase
                          </button>
                        )}
                      </div>
                    </div>
                  </div>
                ))
              ) : (
                <div className="brand-surface p-8 text-center text-[#50616b] font-bold italic bg-[#f8fafc]/50">
                  No specific milestones defined for this order.
                </div>
              )}

              {isSeller && ['Pending', 'In Progress'].includes(order.status) && (
                <div className="mt-4">
                  {!showMilestoneForm ? (
                    <button
                      type="button"
                      onClick={() => { resetFeedback(); setShowMilestoneForm(true); }}
                      className="brand-button-neutral w-full py-4 text-xs tracking-widest uppercase"
                    >
                      + Add New Milestone
                    </button>
                  ) : (
                    <form onSubmit={handleCreateMilestone} className="brand-surface p-8 space-y-6 mt-2 bg-[#fef08a]/10 rotate-[0.5deg]">
                      <div className="flex items-center justify-between mb-2">
                        <h4 className="font-black text-[#0f172a] uppercase italic">Define Phase</h4>
                        <span className="text-[10px] font-bold opacity-30">NEW MILESTONE</span>
                      </div>
                      <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                        <div className="space-y-2">
                          <label className="block text-[10px] font-black text-[#0f172a] uppercase tracking-widest">Title</label>
                          <input type="text" required value={milestoneTitle} onChange={e=>setMilestoneTitle(e.target.value)} className="brand-input" placeholder="e.g. Initial Draft" />
                        </div>
                        <div className="space-y-2">
                          <label className="block text-[10px] font-black text-[#0f172a] uppercase tracking-widest">Deadline</label>
                          <input type="date" required value={milestoneDeadline} onChange={e=>setMilestoneDeadline(e.target.value)} className="brand-input" />
                        </div>
                        <div className="space-y-2">
                          <label className="block text-[10px] font-black text-[#0f172a] uppercase tracking-widest">Amount ($)</label>
                          <input type="number" step="0.01" value={milestoneAmount} onChange={e=>setMilestoneAmount(e.target.value)} className="brand-input" placeholder="Optional" />
                        </div>
                        <div className="flex items-center gap-3 pt-6">
                          <input type="checkbox" id="criticalBox" checked={milestoneCritical} onChange={e=>setMilestoneCritical(e.target.checked)} className="h-5 w-5 border-2 border-[#0f172a] rounded checked:bg-[#fef08a]" />
                          <label htmlFor="criticalBox" className="text-xs font-bold text-[#0f172a]">Critical Path (Blocks completion)</label>
                        </div>
                      </div>
                      <div className="space-y-2">
                        <label className="block text-[10px] font-black text-[#0f172a] uppercase tracking-widest">Description</label>
                        <textarea rows="3" value={milestoneDesc} onChange={e=>setMilestoneDesc(e.target.value)} className="brand-input" placeholder="What will be delivered in this phase?"></textarea>
                      </div>
                      <div className="flex gap-4 pt-4">
                        <button type="submit" disabled={milestoneSubmitting} className="brand-button-primary flex-1 py-3">
                          {milestoneSubmitting ? 'Saving...' : 'Save Phase'}
                        </button>
                        <button type="button" onClick={() => setShowMilestoneForm(false)} className="brand-button-neutral px-8">
                          Cancel
                        </button>
                      </div>
                    </form>
                  )}
                </div>
              )}
            </div>
          </section>

          {/* ── Active Actions: Delivery / Revision ── */}
          {(isSeller && ['Pending', 'In Progress'].includes(order.status)) || (isBuyer && order.status === 'Delivered') ? (
            <section className="space-y-6">
              <div className="flex items-center gap-4 mb-2">
                <h2 className="text-2xl font-black text-[#0f172a] uppercase italic">Active Work</h2>
                <div className="h-0.5 flex-1 bg-[#0f172a] opacity-10"></div>
              </div>

              {isSeller && ['Pending', 'In Progress'].includes(order.status) && (
                <div className="brand-surface p-8 bg-white rotate-[-0.5deg]">
                  <h3 className="mb-6 font-black text-[#0f172a] uppercase tracking-widest flex items-center gap-3">
                    <span className="bg-[#fef08a] p-2 rounded-lg border-2 border-[#0f172a]">🚀</span>
                    Submit Final Delivery
                  </h3>
                  <form onSubmit={handleDeliverySubmit} className="space-y-6">
                    <div className="space-y-2">
                      <label className="block text-[10px] font-black text-[#0f172a] uppercase tracking-widest">Delivery Message</label>
                      <textarea
                        rows="4"
                        className="brand-input"
                        placeholder="Explain the work you've done..."
                        value={deliveryMessage}
                        onChange={(event) => setDeliveryMessage(event.target.value)}
                      />
                    </div>
                    <div className="space-y-2">
                      <label className="block text-[10px] font-black text-[#0f172a] uppercase tracking-widest">
                        File URL (Cloud storage links)
                      </label>
                      <input
                        type="url"
                        className="brand-input"
                        placeholder="https://drive.google.com/..."
                        value={fileUrl}
                        onChange={(event) => setFileUrl(event.target.value)}
                      />
                    </div>
                    <button
                      type="submit"
                      disabled={deliverySubmitting || statusUpdating}
                      className="brand-button-primary w-full py-4 text-lg"
                    >
                      {deliverySubmitting ? 'Submitting Work...' : '🚀 Deliver Work'}
                    </button>
                  </form>
                </div>
              )}

              {isBuyer && order.status === 'Delivered' && (
                <div className="brand-surface p-8 bg-[#fef08a]/20 border-amber-400 rotate-[0.5deg]">
                  <h3 className="mb-4 font-black text-[#936600] uppercase tracking-widest">Review Delivery</h3>
                  <p className="mb-8 text-sm font-medium text-[#936600]/80 italic">
                    The seller has delivered their work. Inspect it carefully before approving.
                  </p>
                  <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                    <button
                      type="button"
                      onClick={handleAcceptDelivery}
                      disabled={statusUpdating || revisionSubmitting}
                      className="brand-button-primary py-4 text-base bg-[#22c55e] border-[#166534] shadow-[#166534]"
                    >
                      {statusUpdating ? 'Processing...' : '✅ Approve & Complete'}
                    </button>

                    {!showRevisionForm ? (
                      <button
                        type="button"
                        onClick={() => {
                          resetFeedback();
                          setShowRevisionForm(true);
                        }}
                        disabled={statusUpdating}
                        className="brand-button-neutral py-4 text-base"
                      >
                        🔄 Request Revision
                      </button>
                    ) : (
                      <div className="md:col-span-2">
                        <form onSubmit={handleRequestRevision} className="space-y-4 brand-surface p-6 bg-white mt-4">
                          <div className="space-y-2">
                            <label className="block text-[10px] font-black text-[#0f172a] uppercase tracking-widest">
                              Revision Instructions
                            </label>
                            <textarea
                              rows="4"
                              className="brand-input"
                              placeholder="Be specific about what needs to change..."
                              value={revisionMessage}
                              onChange={(event) => setRevisionMessage(event.target.value)}
                            />
                          </div>
                          <div className="flex gap-4">
                            <button
                              type="submit"
                              disabled={revisionSubmitting}
                              className="brand-button-primary flex-1 py-3"
                            >
                              {revisionSubmitting ? 'Sending...' : 'Send Request'}
                            </button>
                            <button
                              type="button"
                              onClick={() => {
                                setShowRevisionForm(false);
                                setRevisionMessage('');
                                resetFeedback();
                              }}
                              className="brand-button-neutral px-8"
                            >
                              Cancel
                            </button>
                          </div>
                        </form>
                      </div>
                    )}
                  </div>
                </div>
              )}
            </section>
          ) : null}

          {/* ── Activity Timeline ── */}
          <section className="space-y-6">
            <div className="flex items-center gap-4 mb-2">
              <h2 className="text-2xl font-black text-[#0f172a] uppercase italic">Submissions Timeline</h2>
              <div className="h-0.5 flex-1 bg-[#0f172a] opacity-10"></div>
            </div>

            {submissions.length === 0 ? (
              <div className="brand-surface p-12 text-center text-[#50616b] font-bold italic bg-white/50 border-dashed">
                No activity has been recorded yet.
              </div>
            ) : (
              <div className="space-y-6">
                {submissions.map((submission) => {
                  const isBuyerRevision = Boolean(submission.is_revision) && submission.submitted_by === order.buyer_id;

                  return (
                    <div
                      key={submission.submission_id}
                      className={`brand-surface p-6 relative transition-all ${
                        isBuyerRevision ? 'bg-[#fff8d9] border-[#f0db82] -rotate-[0.5deg]' : 'bg-white rotate-[0.5deg]'
                      }`}
                    >
                      <div className="mb-4 flex items-center justify-between">
                        <div className="flex items-center gap-3">
                          <div className="h-10 w-10 brand-surface flex items-center justify-center font-black bg-[#fef08a] text-xs">
                            {submission.submitted_by_name.charAt(0).toUpperCase()}
                          </div>
                          <div>
                            <p className="font-black text-[#0f172a] uppercase text-sm tracking-tight">{submission.submitted_by_name}</p>
                            <p className="text-[10px] font-black text-[#0f172a]/30 uppercase tracking-widest mt-0.5">
                              {new Date(submission.submitted_at).toLocaleString()}
                            </p>
                          </div>
                        </div>
                        {isBuyerRevision && (
                          <span className="bg-[#fef08a] px-3 py-1 border-2 border-[#0f172a] text-[10px] font-black uppercase rotate-[2deg] shadow-sm">
                            Revision Req.
                          </span>
                        )}
                      </div>

                      {submission.message && (
                        <div className="p-4 bg-black/5 rounded-lg border-l-4 border-[#0f172a] mb-4">
                          <p className="whitespace-pre-wrap text-sm font-medium leading-relaxed text-[#0f172a]">{submission.message}</p>
                        </div>
                      )}

                      {submission.file_url && (
                        <div className="pt-2">
                          <a
                            href={submission.file_url}
                            target="_blank"
                            rel="noopener noreferrer"
                            className="brand-button-neutral inline-flex items-center gap-2 py-2 text-xs"
                          >
                            <svg className="h-4 w-4" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M12 10v6m0 0l-3-3m3 3l3-3m2 8H7a2 2 0 01-2-2V5a2 2 0 012-2h5.586a1 1 0 01.707.293l5.414 5.414a1 1 0 01.293.707V19a2 2 0 01-2 2z" />
                            </svg>
                            View Delivery Files
                          </a>
                        </div>
                      )}
                    </div>
                  );
                })}
              </div>
            )}
          </section>
        </div>

        {/* ── RIGHT COLUMN: SIDEBAR ── */}
        <aside className="lg:col-span-4 space-y-8">
          
          {/* Order Info Card */}
          <div className="brand-surface p-8 bg-white shadow-[6px_6px_0px_#0f172a]">
            <h3 className="mb-6 font-black text-[#0f172a] uppercase italic tracking-widest border-b-2 border-[#0f172a]/10 pb-2">Order Details</h3>
            <div className="space-y-4 text-xs font-bold uppercase tracking-widest text-[#0f172a]">
              <div className="flex justify-between border-b border-[#0f172a]/5 pb-2">
                <span className="opacity-40">Buyer</span>
                <span>{order.buyer_name}</span>
              </div>
              <div className="flex justify-between border-b border-[#0f172a]/5 pb-2">
                <span className="opacity-40">Seller</span>
                <span>{order.seller_name}</span>
              </div>
              <div className="flex justify-between border-b border-[#0f172a]/5 pb-2">
                <span className="opacity-40">Revisions</span>
                <span>{order.revision_number} used</span>
              </div>
              <div className="flex justify-between border-b border-[#0f172a]/5 pb-2">
                <span className="opacity-40">Placed</span>
                <span className="opacity-60">{new Date(order.order_date).toLocaleDateString()}</span>
              </div>
              <div className="flex justify-between pt-2">
                <span className="opacity-40">Deadline</span>
                <span className={`${
                  ['Pending', 'In Progress', 'Delivered'].includes(order.status) && new Date(order.deadline) < new Date()
                    ? 'text-red-600 animate-pulse'
                    : 'text-[#0f699e]'
                }`}>
                  {new Date(order.deadline).toLocaleDateString()}
                  {['Pending', 'In Progress', 'Delivered'].includes(order.status) && new Date(order.deadline) < new Date() && ' !!!'}
                </span>
              </div>
            </div>

            {isParticipant && (
              <Link
                to={`/messages?with=${
                  isBuyer ? order.seller_id : order.buyer_id
                }&name=${encodeURIComponent(
                  isBuyer ? order.seller_name : order.buyer_name
                )}&orderId=${orderId}`}
                className="brand-button-neutral mt-8 flex w-full items-center justify-center gap-3 py-3"
              >
                <svg className="h-5 w-5" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M8 10h.01M12 10h.01M16 10h.01M9 16H5a2 2 0 01-2-2V6a2 2 0 012-2h14a2 2 0 012 2v8a2 2 0 01-2 2h-5l-5 5v-5z" />
                </svg>
                Chat with {isBuyer ? 'Seller' : 'Buyer'}
              </Link>
            )}
          </div>

          {/* Review Section */}
          {review ? (
            <div className="brand-surface p-6 bg-[#fef08a] rotate-[1deg] shadow-[4px_4px_0px_#0f172a]">
              <h3 className="mb-4 font-black text-[#0f172a] uppercase italic text-sm">Customer Feedback</h3>
              <div className="mb-4 flex items-center justify-between bg-white/40 p-2 border border-[#0f172a] rounded">
                <StarRating rating={review.rating} size="small" />
                <span className="font-black text-xs">{review.rating}/5</span>
              </div>
              <div className="p-4 bg-white border-2 border-[#0f172a] rounded-xl shadow-inner mb-4">
                <p className="text-sm font-medium italic leading-relaxed text-[#0f172a]">
                  "{review.comment || 'No comment provided.'}"
                </p>
              </div>
              {review.seller_reply && (
                <div className="mt-4 p-4 bg-[#0f172a] text-white rounded-xl shadow-md rotate-[-2deg]">
                  <p className="text-[10px] font-black uppercase tracking-widest opacity-60 mb-2">My Reply</p>
                  <p className="text-sm font-bold italic">"{review.seller_reply}"</p>
                </div>
              )}
              {isSeller && !review.seller_reply && (
                <form onSubmit={handleSellerReplySubmit} className="mt-6 space-y-3">
                  <textarea
                    rows="3"
                    value={sellerReplyDraft}
                    onChange={(event) => setSellerReplyDraft(event.target.value)}
                    className="brand-input text-xs"
                    placeholder="Write your public reply..."
                  />
                  <button type="submit" disabled={replySubmitting} className="brand-button-primary w-full text-xs py-2">
                    {replySubmitting ? 'Saving...' : 'Publish Reply'}
                  </button>
                </form>
              )}
            </div>
          ) : (
            isBuyer && order.status === 'Completed' && (
              <div className="brand-surface p-8 bg-[#fef08a] rotate-[-1deg]">
                <h3 className="mb-4 font-black text-[#0f172a] uppercase italic tracking-widest">Rate the Seller</h3>
                <form onSubmit={handleReviewSubmit} className="space-y-6">
                  <div className="space-y-2">
                    <label className="block text-[10px] font-black text-[#0f172a] uppercase">Rating</label>
                    <select
                      value={reviewRating}
                      onChange={(event) => setReviewRating(event.target.value)}
                      className="brand-input font-black"
                    >
                      <option value="5">⭐⭐⭐⭐⭐ Excellent</option>
                      <option value="4">⭐⭐⭐⭐ Very Good</option>
                      <option value="3">⭐⭐⭐ Good</option>
                      <option value="2">⭐⭐ Fair</option>
                      <option value="1">⭐ Poor</option>
                    </select>
                  </div>
                  <div className="space-y-2">
                    <label className="block text-[10px] font-black text-[#0f172a] uppercase">Comment</label>
                    <textarea
                      rows="4"
                      value={reviewComment}
                      onChange={(event) => setReviewComment(event.target.value)}
                      className="brand-input"
                      placeholder="Share your experience..."
                    />
                  </div>
                  <button
                    type="submit"
                    disabled={reviewSubmitting}
                    className="brand-button-primary w-full py-4 text-base"
                  >
                    {reviewSubmitting ? 'Publishing...' : 'Publish Review'}
                  </button>
                </form>
              </div>
            )
          )}

          {/* Admin / Seller Actions */}
          {isSeller && ['Pending', 'In Progress'].includes(order.status) && (
            <div className="brand-surface p-6 border-red-200">
              <h3 className="mb-4 font-black text-[#0f172a] uppercase italic text-sm">Control Panel</h3>
              <div className="space-y-3">
                {order.status === 'Pending' && (
                  <button
                    type="button"
                    onClick={() => handleStatusChange('In Progress', 'Order started!')}
                    disabled={statusUpdating}
                    className="brand-button-primary w-full"
                  >
                    Start Working
                  </button>
                )}
                <button
                  type="button"
                  onClick={() => handleStatusChange('Cancelled', 'Order cancelled.')}
                  disabled={statusUpdating}
                  className="brand-button-neutral w-full border-red-300 text-red-600 hover:bg-red-50"
                >
                  Cancel Order
                </button>
              </div>
            </div>
          )}

          {/* Dispute Section */}
          <div className="space-y-4">
            {disputes.map((d) => (
              <div key={d.dispute_id} className="brand-surface p-6 bg-red-50 border-red-400 rotate-[-1deg]">
                <div className="mb-4 flex items-center justify-between">
                  <h3 className="font-black text-red-900 uppercase text-xs">⚠️ Dispute Active</h3>
                  <span className="brand-status border-red-400 text-red-700 bg-white">
                    {d.status}
                  </span>
                </div>
                <p className="text-xs font-bold text-red-800 mb-4 italic">"{d.reason}"</p>
                {d.resolution && (
                  <div className="p-3 bg-white border-2 border-red-400 rounded-lg text-xs font-black text-[#0f172a]">
                    RESOLUTION: {d.resolution}
                  </div>
                )}
              </div>
            ))}

            {['In Progress', 'Delivered'].includes(order.status) &&
              !disputes.some((d) => d.status === 'Open') && (
                <div className="brand-surface p-6 bg-white border-dashed">
                  <h3 className="mb-2 font-black text-[#0f172a] uppercase text-xs">Need Help?</h3>
                  <p className="text-[10px] font-bold text-[#50616b] mb-4 uppercase tracking-widest">
                    Open a dispute for admin review if you have issues.
                  </p>
                  {!showDisputeForm ? (
                    <button
                      type="button"
                      onClick={() => { resetFeedback(); setShowDisputeForm(true); }}
                      className="w-full brand-button-neutral py-2 text-xs border-red-200 text-red-600"
                    >
                      Open Dispute Case
                    </button>
                  ) : (
                    <form onSubmit={handleRaiseDispute} className="space-y-4">
                      <textarea
                        rows="3"
                        required
                        className="brand-input text-xs"
                        placeholder="Explain the issue..."
                        value={disputeReason}
                        onChange={(e) => setDisputeReason(e.target.value)}
                      />
                      <div className="flex gap-2">
                        <button
                          type="submit"
                          disabled={disputeSubmitting}
                          className="brand-button-primary flex-1 py-2 text-xs bg-red-600 border-red-900 text-white shadow-red-900"
                        >
                          Submit
                        </button>
                        <button
                          type="button"
                          onClick={() => { setShowDisputeForm(false); setDisputeReason(''); }}
                          className="brand-button-neutral px-4 text-xs"
                        >
                          No
                        </button>
                      </div>
                    </form>
                  )}
                </div>
              )}
          </div>
        </aside>
      </div>
    </div>
  );
}

export default OrderDetails;
