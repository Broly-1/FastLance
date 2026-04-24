import React, { useEffect, useState } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import { useAuth } from '../context/useAuth';

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

export default function GigDetails() {
  const { id } = useParams();
  const { user } = useAuth();
  const navigate = useNavigate();

  const [gig, setGig] = useState(null);
  const [reviews, setReviews] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);
  const [orderProcessing, setOrderProcessing] = useState(false);

  useEffect(() => {
    const fetchGig = async () => {
      try {
        const gigResponse = await fetch(`http://localhost:3000/api/gigs/${id}`);
        if (!gigResponse.ok) {
          throw new Error('Gig not found or failed to load.');
        }

        const gigData = await gigResponse.json();
        setGig(gigData);

        try {
          const reviewsResponse = await fetch(`http://localhost:3000/api/reviews/gig/${id}`);
          if (!reviewsResponse.ok) {
            throw new Error('Failed to load reviews.');
          }

          const reviewsData = await reviewsResponse.json();
          setReviews(Array.isArray(reviewsData) ? reviewsData : []);
        } catch {
          setReviews([]);
        }
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
      alert('You need to login to place an order!');
      return navigate('/login');
    }

    if (user.id === gig.seller_id) {
      return alert('You cannot purchase your own gig.');
    }

    try {
      setOrderProcessing(true);
      const response = await fetch('http://localhost:3000/api/orders', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          gig_id: gig.gig_id,
          buyer_id: user.id,
        }),
      });

      const data = await response.json();

      if (!response.ok) {
        throw new Error(data.error || 'Failed to place order');
      }

      alert('Order placed successfully!');
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

  if (loading) {
    return (
      <div className="flex h-screen items-center justify-center">
        <div className="h-12 w-12 animate-spin rounded-full border-b-2 border-[#2da8ed]"></div>
      </div>
    );
  }

  if (error || !gig) {
    return (
      <div className="h-screen py-20 text-center">
        <p className="mb-4 text-2xl font-bold text-red-500">{error || 'Gig not found'}</p>
        <button onClick={() => navigate(-1)} className="brand-link hover:underline">
          Go Back
        </button>
      </div>
    );
  }

  const reviewCount = reviews.length;
  const averageRating = reviewCount
    ? reviews.reduce((sum, review) => sum + Number(review.rating), 0) / reviewCount
    : null;
  const roundedAverageRating = averageRating ? Math.round(averageRating) : 0;

  return (
    <div className="min-h-screen py-10">
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
        <nav className="mb-6 text-sm text-slate-500">
          <button onClick={() => navigate(-1)} className="brand-link">
            Explore
          </button>{' '}
          &gt;
          <span className="ml-2 text-slate-900">{gig.category}</span>
        </nav>

        <div className="grid grid-cols-1 gap-8 lg:grid-cols-3">
          <div className="space-y-8 lg:col-span-2">
            <h1 className="brand-page-title text-3xl font-extrabold leading-tight sm:text-4xl">
              {gig.title}
            </h1>

            <div className="flex items-center space-x-3">
              <div className="flex h-12 w-12 items-center justify-center rounded-full bg-[#def4ff] text-xl font-bold text-sky-700">
                {gig.seller_name?.charAt(0).toUpperCase()}
              </div>
              <div>
                <p className="text-lg font-medium text-slate-900">{gig.seller_name}</p>
                {averageRating ? (
                  <div className="mt-1 flex items-center gap-2">
                    <StarRating rating={roundedAverageRating} />
                    <span className="text-sm font-semibold text-[#0f699e]">
                      {averageRating.toFixed(1)} / 5
                    </span>
                    <span className="text-sm text-slate-500">
                      from {reviewCount} review{reviewCount === 1 ? '' : 's'}
                    </span>
                  </div>
                ) : (
                  <p className="text-sm text-slate-500">No reviews yet</p>
                )}
              </div>
            </div>

            <div className="brand-surface overflow-hidden">
              <img
                src={gig.thumbnail_url || 'https://via.placeholder.com/800x500?text=Gig+Preview'}
                alt={gig.title}
                className="max-h-[500px] w-full object-cover"
              />
            </div>

            <div className="brand-surface p-6">
              <h2 className="mb-4 text-2xl font-bold text-slate-900">About This Gig</h2>
              <div className="max-w-none whitespace-pre-line text-slate-700">{gig.description}</div>
            </div>

            <div className="brand-surface p-6">
              <div className="mb-5 flex items-center justify-between gap-3">
                <div>
                  <h2 className="text-2xl font-bold text-slate-900">Reviews</h2>
                  <p className="mt-1 text-sm text-slate-500">
                    {reviewCount
                      ? `${reviewCount} review${reviewCount === 1 ? '' : 's'} from completed orders`
                      : 'No reviews have been posted yet.'}
                  </p>
                </div>
                {averageRating && (
                  <div className="rounded-2xl border border-[#c8ecff] bg-[#eef9ff] px-4 py-3 text-right">
                    <div className="flex items-center justify-end gap-2">
                      <StarRating rating={roundedAverageRating} size="large" />
                      <span className="text-xl font-bold text-[#0f699e]">{averageRating.toFixed(1)}</span>
                    </div>
                    <p className="mt-1 text-xs font-semibold uppercase tracking-[0.18em] text-slate-500">
                      Average Rating
                    </p>
                  </div>
                )}
              </div>

              {reviewCount === 0 ? (
                <div className="rounded-2xl border border-dashed border-[#d4e7f3] bg-[#f8fcff] p-8 text-center text-slate-500">
                  This gig does not have buyer feedback yet.
                </div>
              ) : (
                <div className="space-y-4">
                  {reviews.map((review) => (
                    <div key={review.review_id} className="rounded-2xl border border-[#e5eef5] bg-[#fbfdff] p-5">
                      <div className="flex flex-col gap-3 sm:flex-row sm:items-start sm:justify-between">
                        <div>
                          <p className="font-semibold text-slate-900">{review.reviewer_name}</p>
                          <p className="text-xs text-slate-500">
                            {new Date(review.created_at).toLocaleDateString()}
                          </p>
                        </div>
                        <div className="text-left sm:text-right">
                          <StarRating rating={Number(review.rating)} />
                          <p className="mt-1 text-xs font-semibold text-[#0f699e]">{review.rating}/5</p>
                        </div>
                      </div>

                      <p className="mt-4 whitespace-pre-wrap text-sm leading-6 text-slate-700">
                        {review.comment || 'The buyer submitted a rating without a written comment.'}
                      </p>

                      {review.seller_reply && (
                        <div className="mt-4 rounded-xl border border-[#f0db82] bg-[#fff8d9] p-4">
                          <p className="text-xs font-semibold uppercase tracking-[0.2em] text-[#936600]">
                            Seller Reply
                          </p>
                          <p className="mt-2 text-sm leading-6 text-slate-700">{review.seller_reply}</p>
                        </div>
                      )}
                    </div>
                  ))}
                </div>
              )}
            </div>
          </div>

          <div className="lg:col-span-1">
            <div className="brand-surface sticky top-24 p-6">
              <div className="mb-6 flex items-start justify-between">
                <h3 className="text-xl font-bold text-slate-900">Standard Package</h3>
                <span className="text-3xl font-extrabold text-slate-900">${gig.price}</span>
              </div>

              {averageRating && (
                <div className="mb-6 rounded-2xl border border-[#c8ecff] bg-[#eef9ff] p-4">
                  <div className="flex items-center justify-between gap-3">
                    <div>
                      <p className="text-xs font-semibold uppercase tracking-[0.18em] text-slate-500">
                        Buyer Rating
                      </p>
                      <p className="mt-1 text-lg font-bold text-[#0f699e]">{averageRating.toFixed(1)} / 5</p>
                    </div>
                    <StarRating rating={roundedAverageRating} size="large" />
                  </div>
                </div>
              )}

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
                {gig.tags &&
                  gig.tags.map((tag) => (
                    <span
                      key={tag.tag_id}
                      className="mb-2 mr-2 inline-block rounded-full border border-[#f0db82] bg-[#fff8d9] px-3 py-1 text-xs font-medium text-[#936600]"
                    >
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
