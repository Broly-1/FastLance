const pool = require('../db');

// GET milestones by order
exports.getByOrder = async (req, res) => {
  try {
    const [rows] = await pool.query(
      'SELECT * FROM Milestones WHERE order_id = ? ORDER BY deadline ASC',
      [req.params.orderId]
    );
    res.json(rows);
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
};

// GET milestone by ID
exports.getById = async (req, res) => {
  try {
    const [rows] = await pool.query('SELECT * FROM Milestones WHERE milestone_id = ?', [req.params.id]);
    if (rows.length === 0) return res.status(404).json({ error: 'Milestone not found' });
    res.json(rows[0]);
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
};

// POST create milestone
exports.create = async (req, res) => {
  try {
    const { order_id, title, description, deadline, amount, is_critical_path } = req.body;
    const [result] = await pool.query(
      'INSERT INTO Milestones (order_id, title, description, deadline, amount, is_critical_path) OUTPUT INSERTED.milestone_id VALUES (?, ?, ?, ?, ?, ?)',
      [order_id, title, description || null, deadline, amount || null, is_critical_path ? 1 : 0]
    );
    res.status(201).json({ message: 'Milestone created', milestone_id: result.insertId });
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
};

// PUT update milestone
exports.update = async (req, res) => {
  try {
    const { title, description, deadline, amount, status, is_critical_path, completed_at } = req.body;
    const [result] = await pool.query(
      `UPDATE Milestones SET title = COALESCE(?, title), description = COALESCE(?, description),
       deadline = COALESCE(?, deadline), amount = COALESCE(?, amount),
       status = COALESCE(?, status), is_critical_path = COALESCE(?, is_critical_path),
       completed_at = COALESCE(?, completed_at)
       WHERE milestone_id = ?`,
      [title, description, deadline, amount, status, is_critical_path, completed_at, req.params.id]
    );
    if (result.affectedRows === 0) return res.status(404).json({ error: 'Milestone not found' });
    res.json({ message: 'Milestone updated' });
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
};

// DELETE milestone
exports.remove = async (req, res) => {
  try {
    const [result] = await pool.query('DELETE FROM Milestones WHERE milestone_id = ?', [req.params.id]);
    if (result.affectedRows === 0) return res.status(404).json({ error: 'Milestone not found' });
    res.json({ message: 'Milestone deleted' });
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
};
