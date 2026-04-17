const pool = require('../db');

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
    const [result] = await pool.query(
      'INSERT INTO Reviews (order_id, reviewer_id, rating, comment) OUTPUT INSERTED.review_id VALUES (?, ?, ?, ?)',
      [order_id, reviewer_id, rating, comment || null]
    );
    res.status(201).json({ message: 'Review created', review_id: result.insertId });
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
};

// PUT update review (seller reply)
exports.update = async (req, res) => {
  try {
    const { comment, rating, seller_reply } = req.body;
    const [result] = await pool.query(
      `UPDATE Reviews SET comment = COALESCE(?, comment), rating = COALESCE(?, rating),
       seller_reply = COALESCE(?, seller_reply) WHERE review_id = ?`,
      [comment, rating, seller_reply, req.params.id]
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
