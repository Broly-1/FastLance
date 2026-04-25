import React, { useEffect, useState } from 'react';
import { useNavigate, useParams, Link } from 'react-router-dom';
import { useAuth } from '../context/useAuth';

const API_BASE_URL = 'http://localhost:3000';

function StarRating({ rating, size = 'small' }) {
  const iconClass = size === 'large' ? 'h-5 w-5' : 'h-4 w-4';

  return (
    <div className="flex items-center gap-1 text-[#f4be18]">
      {[1, 2, 3, 4, 5].map((value) => (
        <svg
          key={value}
          className={iconClass}
          viewBox="0 0 20 20"
          fill={value <= rating ? 'currentColor' : 'none'}
          stroke="currentColor"
          strokeWidth="1.5"
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
  const [orderResponse, submissionsResponse, review, disputesResponse] = await Promise.all([
    fetch(`${API_BASE_URL}/api/orders/${orderId}`),
    fetch(`${API_BASE_URL}/api/submissions/order/${orderId}`),
    fetchOptionalReviewByOrder(orderId),
    fetch(`${API_BASE_URL}/api/disputes/order/${orderId}`),
  ]);

  const orderData = await readJsonResponse(orderResponse, 'Order not found');
  const submissionsData = await readJsonResponse(
    submissionsResponse,
    'Failed to load order activity'
  );
  const disputesData = await readJsonResponse(disputesResponse, 'Failed to load disputes');

  return {
    order: orderData,
    submissions: Array.isArray(submissionsData) ? submissionsData : [],
    review,
    disputes: Array.isArray(disputesData) ? disputesData : [],
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

  const applyPageData = (data) => {
    setOrder(data.order);
    setSubmissions(data.submissions);
    setReview(data.review);
    setSellerReplyDraft(data.review?.seller_reply || '');
    setDisputes(data.disputes ?? []);
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
        <div className="mt-4 flex flex-col items-start sm:mt-0 sm:items-end">
          <span className={getStatusClasses(order.status)}>{order.status}</span>
          <span className="mt-2 text-sm font-bold text-slate-700">${Number(order.total_price).toFixed(2)}</span>
        </div>
      </div>

      <div className="grid grid-cols-1 gap-8 md:grid-cols-3">
        <div className="space-y-6 md:col-span-2">
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
                    <div className="mb-2 flex items-start justify-between gap-4">
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

            {/* Message counterpart */}
            {isParticipant && (
              <Link
                to={`/messages?with=${
                  isBuyer ? order.seller_id : order.buyer_id
                }&name=${encodeURIComponent(
                  isBuyer ? order.seller_name : order.buyer_name
                )}`}
                className="brand-button-neutral mt-3 flex w-full items-center justify-center gap-2 rounded-xl px-4 py-2.5 text-sm font-semibold transition"
              >
                <svg className="h-4 w-4" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="1.8" d="M8 10h.01M12 10h.01M16 10h.01M9 16H5a2 2 0 01-2-2V6a2 2 0 012-2h14a2 2 0 012 2v8a2 2 0 01-2 2h-5l-5 5v-5z" />
                </svg>
                Message {isBuyer ? order.seller_name : order.buyer_name}
              </Link>
            )}
          </div>

          {review && (
            <div className="brand-surface p-5">
              <h3 className="mb-3 font-bold text-slate-900">Buyer Review</h3>
              <div className="mb-3 flex items-center justify-between gap-3">
                <div>
                  <p className="font-semibold text-slate-900">{review.reviewer_name}</p>
                  <p className="text-xs text-slate-500">
                    {new Date(review.created_at).toLocaleDateString()}
                  </p>
                </div>
                <div className="text-right">
                  <StarRating rating={review.rating} size="small" />
                  <p className="mt-1 text-xs font-semibold text-[#0f699e]">{review.rating}/5</p>
                </div>
              </div>

              <div className="rounded-xl border border-[#e5eef5] bg-[#fbfdff] p-4">
                <p className="text-sm leading-6 text-slate-700">
                  {review.comment || 'No written comment was added with this review.'}
                </p>
              </div>

              {review.seller_reply && (
                <div className="mt-4 rounded-xl border border-[#f0db82] bg-[#fff8d9] p-4">
                  <p className="text-xs font-semibold uppercase tracking-[0.2em] text-[#936600]">
                    Seller Reply
                  </p>
                  <p className="mt-2 text-sm leading-6 text-slate-700">{review.seller_reply}</p>
                </div>
              )}
            </div>
          )}

          {isBuyer && order.status === 'Completed' && !review && (
            <div className="brand-surface p-5">
              <h3 className="mb-3 font-bold text-slate-900">Leave a Review</h3>
              <p className="mb-4 text-sm text-slate-600">
                Share your experience with the seller now that the order is complete.
              </p>
              <form onSubmit={handleReviewSubmit} className="space-y-4">
                <div>
                  <label className="mb-1 block text-sm font-medium text-slate-700">Rating</label>
                  <select
                    value={reviewRating}
                    onChange={(event) => setReviewRating(event.target.value)}
                    className="brand-input"
                  >
                    <option value="5">5 - Excellent</option>
                    <option value="4">4 - Very Good</option>
                    <option value="3">3 - Good</option>
                    <option value="2">2 - Fair</option>
                    <option value="1">1 - Poor</option>
                  </select>
                </div>
                <div>
                  <label className="mb-1 block text-sm font-medium text-slate-700">Comment</label>
                  <textarea
                    rows="4"
                    value={reviewComment}
                    onChange={(event) => setReviewComment(event.target.value)}
                    className="brand-input"
                    placeholder="Tell future buyers what went well..."
                  />
                </div>
                <button
                  type="submit"
                  disabled={reviewSubmitting}
                  className="brand-button-primary w-full rounded-md px-4 py-2 text-sm font-semibold transition disabled:cursor-not-allowed disabled:opacity-60"
                >
                  {reviewSubmitting ? 'Publishing Review...' : 'Publish Review'}
                </button>
              </form>
            </div>
          )}

          {isSeller && order.status === 'Completed' && !review && (
            <div className="brand-surface p-5">
              <h3 className="mb-2 font-bold text-slate-900">Waiting for Buyer Review</h3>
              <p className="text-sm text-slate-600">
                Once the buyer leaves feedback, you will be able to add a public seller reply here.
              </p>
            </div>
          )}

          {isSeller && review && (
            <div className="brand-surface p-5">
              <h3 className="mb-3 font-bold text-slate-900">
                {review.seller_reply ? 'Edit Seller Reply' : 'Add Seller Reply'}
              </h3>
              <form onSubmit={handleSellerReplySubmit} className="space-y-4">
                <div>
                  <label className="mb-1 block text-sm font-medium text-slate-700">Public Reply</label>
                  <textarea
                    rows="4"
                    value={sellerReplyDraft}
                    onChange={(event) => setSellerReplyDraft(event.target.value)}
                    className="brand-input"
                    placeholder="Thank the buyer and respond publicly to the review..."
                  />
                </div>
                <button
                  type="submit"
                  disabled={replySubmitting}
                  className="brand-button-primary w-full rounded-md px-4 py-2 text-sm font-semibold transition disabled:cursor-not-allowed disabled:opacity-60"
                >
                  {replySubmitting ? 'Saving Reply...' : review.seller_reply ? 'Update Reply' : 'Publish Reply'}
                </button>
              </form>
            </div>
          )}

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
            <div className="rounded-lg border border-red-100 bg-red-50 p-5 text-center shadow-sm">
              <h3 className="mb-1 font-bold text-red-900">Order Cancelled</h3>
              <p className="text-sm text-red-800">This order is no longer active.</p>
            </div>
          )}

          {/* ── Dispute Section ── */}
          {isParticipant && (
            <div className="space-y-4">
              {disputes.map((d) => (
                <div key={d.dispute_id} className="brand-surface p-5">
                  <div className="mb-3 flex items-center justify-between gap-3">
                    <h3 className="font-bold text-slate-900">⚠️ Dispute #{d.dispute_id}</h3>
                    <span
                      className={`brand-status ${
                        d.status === 'Open'
                          ? 'border-red-200 bg-red-50 text-red-700'
                          : 'brand-status-completed'
                      }`}
                    >
                      {d.status}
                    </span>
                  </div>
                  <p className="mb-2 text-xs text-slate-500">
                    Raised by <span className="font-semibold text-slate-700">{d.raised_by_name}</span>
                  </p>
                  <div className="rounded-lg border border-red-100 bg-red-50 px-4 py-3 text-sm text-slate-700">
                    {d.reason}
                  </div>
                  {d.resolution && (
                    <div className="mt-2 rounded-lg border border-[#c9e8d5] bg-[#edf9f2] px-4 py-3 text-sm text-slate-700">
                      <span className="font-semibold text-[#1b7850]">Resolution: </span>{d.resolution}
                    </div>
                  )}
                </div>
              ))}

              {['In Progress', 'Delivered'].includes(order.status) &&
                !disputes.some((d) => d.status === 'Open') && (
                  <div className="brand-surface p-5">
                    <h3 className="mb-3 font-bold text-slate-900">Raise a Dispute</h3>
                    <p className="mb-4 text-sm text-slate-600">
                      If there is an issue with this order that cannot be resolved directly, open a dispute for admin review.
                    </p>
                    {!showDisputeForm ? (
                      <button
                        type="button"
                        onClick={() => { resetFeedback(); setShowDisputeForm(true); }}
                        className="w-full rounded-md border border-red-200 bg-white px-4 py-2 text-sm font-semibold text-red-700 transition hover:bg-red-50"
                      >
                        ⚠️ Open Dispute
                      </button>
                    ) : (
                      <form onSubmit={handleRaiseDispute} className="space-y-3">
                        <div>
                          <label className="mb-1 block text-sm font-medium text-slate-700">Reason</label>
                          <textarea
                            rows="4"
                            required
                            className="brand-input"
                            placeholder="Describe the issue clearly..."
                            value={disputeReason}
                            onChange={(e) => setDisputeReason(e.target.value)}
                          />
                        </div>
                        <div className="flex gap-3">
                          <button
                            type="submit"
                            disabled={disputeSubmitting}
                            className="flex-1 rounded-md border border-red-300 bg-red-600 px-4 py-2 text-sm font-semibold text-white transition hover:bg-red-700 disabled:cursor-not-allowed disabled:opacity-60"
                          >
                            {disputeSubmitting ? 'Submitting...' : 'Submit Dispute'}
                          </button>
                          <button
                            type="button"
                            onClick={() => { setShowDisputeForm(false); setDisputeReason(''); }}
                            className="brand-button-neutral rounded-md px-4 py-2 text-sm font-semibold transition"
                          >
                            Cancel
                          </button>
                        </div>
                      </form>
                    )}
                  </div>
                )}
            </div>
          )}
        </div>
      </div>
    </div>
  );
}

export default OrderDetails;
