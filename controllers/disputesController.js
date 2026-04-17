const pool = require('../db');

// GET disputes by order
exports.getByOrder = async (req, res) => {
  try {
    const [rows] = await pool.query(
      `SELECT d.*, u.username AS raised_by_name
       FROM Disputes d JOIN Users u ON d.raised_by = u.user_id
       WHERE d.order_id = ?
       ORDER BY d.created_at DESC`,
      [req.params.orderId]
    );
    res.json(rows);
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
};

// GET all disputes
exports.getAll = async (req, res) => {
  try {
    const [rows] = await pool.query(
      `SELECT d.*, u.username AS raised_by_name, g.title AS gig_title
       FROM Disputes d
       JOIN Users u ON d.raised_by = u.user_id
       JOIN Orders o ON d.order_id = o.order_id
       JOIN Gigs g ON o.gig_id = g.gig_id
       ORDER BY d.created_at DESC`
    );
    res.json(rows);
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
};

// POST open dispute
exports.create = async (req, res) => {
  try {
    const { order_id, raised_by, reason } = req.body;
    const [result] = await pool.query(
      'INSERT INTO Disputes (order_id, raised_by, reason) OUTPUT INSERTED.dispute_id VALUES (?, ?, ?)',
      [order_id, raised_by, reason]
    );
    // Update order status to Disputed
    await pool.query("UPDATE Orders SET status = 'Disputed' WHERE order_id = ?", [order_id]);
    res.status(201).json({ message: 'Dispute opened', dispute_id: result.insertId });
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
};

// PUT update/resolve dispute
exports.update = async (req, res) => {
  try {
    const { status, resolution } = req.body;
    const resolved_at = status === 'Resolved' ? new Date() : null;
    const [result] = await pool.query(
      `UPDATE Disputes SET status = COALESCE(?, status), resolution = COALESCE(?, resolution),
       resolved_at = COALESCE(?, resolved_at) WHERE dispute_id = ?`,
      [status, resolution, resolved_at, req.params.id]
    );
    if (result.affectedRows === 0) return res.status(404).json({ error: 'Dispute not found' });
    res.json({ message: 'Dispute updated' });
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
};

// DELETE dispute
exports.remove = async (req, res) => {
  try {
    const [result] = await pool.query('DELETE FROM Disputes WHERE dispute_id = ?', [req.params.id]);
    if (result.affectedRows === 0) return res.status(404).json({ error: 'Dispute not found' });
    res.json({ message: 'Dispute deleted' });
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
};
