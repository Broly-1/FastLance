const pool = require('../db');

function normalizeOptionalText(value) {
  if (typeof value !== 'string') {
    return null;
  }

  const trimmed = value.trim();
  return trimmed ? trimmed : null;
}

function parseInteger(value) {
  const parsed = Number.parseInt(value, 10);
  return Number.isInteger(parsed) ? parsed : null;
}

function parseRating(value) {
  const parsed = Number(value);
  return Number.isInteger(parsed) && parsed >= 1 && parsed <= 5 ? parsed : null;
}

// GET reviews for a gig
exports.getByGig = async (req, res) => {
  try {
    const [rows] = await pool.query(
      `SELECT r.*, u.username AS reviewer_name
       FROM Reviews r
       JOIN Users u ON r.reviewer_id = u.user_id
       JOIN Orders o ON r.order_id = o.order_id
       WHERE o.gig_id = ?
       ORDER BY r.created_at DESC`,
      [req.params.gigId]
    );
    res.json(rows);
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
};

// GET review by order
exports.getByOrder = async (req, res) => {
  try {
    const [rows] = await pool.query(
      `SELECT r.*, u.username AS reviewer_name
       FROM Reviews r JOIN Users u ON r.reviewer_id = u.user_id
       WHERE r.order_id = ?`,
      [req.params.orderId]
    );
    if (rows.length === 0) return res.status(404).json({ error: 'Review not found' });
    res.json(rows[0]);
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
};

// POST create review
exports.create = async (req, res) => {
  try {
    const { order_id, reviewer_id, rating, comment } = req.body;
    const orderId = parseInteger(order_id);
    const reviewerId = parseInteger(reviewer_id);
    const ratingValue = parseRating(rating);
    const normalizedComment = normalizeOptionalText(comment);

    if (!orderId || !reviewerId || !ratingValue) {
      return res.status(400).json({ error: 'order_id, reviewer_id, and a 1-5 rating are required' });
    }

    const [orders] = await pool.query(
      `SELECT order_id, buyer_id, seller_id, status
       FROM Orders
       WHERE order_id = ?`,
      [orderId]
    );

    if (orders.length === 0) {
      return res.status(404).json({ error: 'Order not found' });
    }

    const order = orders[0];

    if (order.status !== 'Completed') {
      return res.status(400).json({ error: 'Reviews can only be created for completed orders' });
    }

    if (order.buyer_id !== reviewerId) {
      return res.status(403).json({ error: 'Only the buyer for this order can leave a review' });
    }

    const [existingReviews] = await pool.query(
      'SELECT review_id FROM Reviews WHERE order_id = ?',
      [orderId]
    );

    if (existingReviews.length > 0) {
      return res.status(409).json({ error: 'A review already exists for this order' });
    }

    const [result] = await pool.query(
      'INSERT INTO Reviews (order_id, reviewer_id, rating, comment) OUTPUT INSERTED.review_id VALUES (?, ?, ?, ?)',
      [orderId, reviewerId, ratingValue, normalizedComment]
    );
    res.status(201).json({ message: 'Review created', review_id: result.insertId });
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
};

// PUT update review (seller reply)
exports.update = async (req, res) => {
  try {
    const { seller_id, seller_reply } = req.body;
    const sellerId = parseInteger(seller_id);
    const normalizedSellerReply = normalizeOptionalText(seller_reply);

    if (!sellerId || !normalizedSellerReply) {
      return res.status(400).json({ error: 'seller_id and seller_reply are required' });
    }

    const [reviews] = await pool.query(
      `SELECT r.review_id, r.order_id, o.seller_id
       FROM Reviews r
       JOIN Orders o ON r.order_id = o.order_id
       WHERE r.review_id = ?`,
      [req.params.id]
    );

    if (reviews.length === 0) {
      return res.status(404).json({ error: 'Review not found' });
    }

    const review = reviews[0];
    if (review.seller_id !== sellerId) {
      return res.status(403).json({ error: 'Only the seller for this order can reply to the review' });
    }

    const [result] = await pool.query(
      `UPDATE Reviews
       SET seller_reply = ?, updated_at = GETDATE()
       WHERE review_id = ?`,
      [normalizedSellerReply, req.params.id]
    );

    if (result.affectedRows === 0) return res.status(404).json({ error: 'Review not found' });
    res.json({ message: 'Review updated' });
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
};

// DELETE review
exports.remove = async (req, res) => {
  try {
    const [result] = await pool.query('DELETE FROM Reviews WHERE review_id = ?', [req.params.id]);
    if (result.affectedRows === 0) return res.status(404).json({ error: 'Review not found' });
    res.json({ message: 'Review deleted' });
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
};
