const pool = require('../db');

// GET notifications for a user
exports.getByUser = async (req, res) => {
  try {
    const [rows] = await pool.query(
      'SELECT * FROM Notifications WHERE user_id = ? ORDER BY created_at DESC',
      [req.params.userId]
    );
    res.json(rows);
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
};

// GET unread count
exports.getUnreadCount = async (req, res) => {
  try {
    const [rows] = await pool.query(
      'SELECT COUNT(*) AS unread_count FROM Notifications WHERE user_id = ? AND is_read = 0',
      [req.params.userId]
    );
    res.json(rows[0]);
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
};

// POST create notification
exports.create = async (req, res) => {
  try {
    const { user_id, type, title, body } = req.body;
    const [result] = await pool.query(
      'INSERT INTO Notifications (user_id, type, title, body) OUTPUT INSERTED.notification_id VALUES (?, ?, ?, ?)',
      [user_id, type, title, body || null]
    );
    res.status(201).json({ message: 'Notification created', notification_id: result.insertId });
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
};

// PATCH mark single notification as read
exports.markRead = async (req, res) => {
  try {
    const [result] = await pool.query(
      'UPDATE Notifications SET is_read = 1 WHERE notification_id = ?',
      [req.params.id]
    );
    if (result.affectedRows === 0) return res.status(404).json({ error: 'Notification not found' });
    res.json({ message: 'Notification marked as read' });
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
};

// PATCH mark all notifications as read for a user
exports.markAllRead = async (req, res) => {
  try {
    await pool.query(
      'UPDATE Notifications SET is_read = 1 WHERE user_id = ? AND is_read = 0',
      [req.params.userId]
    );
    res.json({ message: 'All notifications marked as read' });
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
};

// DELETE notification
exports.remove = async (req, res) => {
  try {
    const [result] = await pool.query('DELETE FROM Notifications WHERE notification_id = ?', [req.params.id]);
    if (result.affectedRows === 0) return res.status(404).json({ error: 'Notification not found' });
    res.json({ message: 'Notification deleted' });
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
};
