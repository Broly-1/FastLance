const pool = require('../db');

// GET submissions by order
exports.getByOrder = async (req, res) => {
  try {
    const [rows] = await pool.query(
      `SELECT s.*, u.username AS submitted_by_name
       FROM Order_Submissions s
       JOIN Users u ON s.submitted_by = u.user_id
       WHERE s.order_id = ?
       ORDER BY s.submitted_at DESC`,
      [req.params.orderId]
    );
    res.json(rows);
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
};

// POST create submission
exports.create = async (req, res) => {
  try {
    const { order_id, submitted_by, file_url, message, is_revision } = req.body;
    const [result] = await pool.query(
      'INSERT INTO Order_Submissions (order_id, submitted_by, file_url, message, is_revision) OUTPUT INSERTED.submission_id VALUES (?, ?, ?, ?, ?)',
      [order_id, submitted_by, file_url, message || null, is_revision ? 1 : 0]
    );
    // Update order status to Delivered
    await pool.query("UPDATE Orders SET status = 'Delivered' WHERE order_id = ?", [order_id]);
    res.status(201).json({ message: 'Submission created', submission_id: result.insertId });
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
};

// DELETE submission
exports.remove = async (req, res) => {
  try {
    const [result] = await pool.query('DELETE FROM Order_Submissions WHERE submission_id = ?', [req.params.id]);
    if (result.affectedRows === 0) return res.status(404).json({ error: 'Submission not found' });
    res.json({ message: 'Submission deleted' });
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
};
