const pool = require('../db');

// GET conversation between two users
exports.getConversation = async (req, res) => {
  try {
    const { userId1, userId2 } = req.params;
    const [rows] = await pool.query(
      `SELECT m.*, s.username AS sender_name, r.username AS receiver_name
       FROM Messages m
       JOIN Users s ON m.sender_id = s.user_id
       JOIN Users r ON m.receiver_id = r.user_id
       WHERE (m.sender_id = ? AND m.receiver_id = ?)
          OR (m.sender_id = ? AND m.receiver_id = ?)
       ORDER BY m.sent_at ASC`,
      [userId1, userId2, userId2, userId1]
    );
    res.json(rows);
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
};

// GET all conversations for a user (latest message per thread)
exports.getInbox = async (req, res) => {
  try {
    const userId = req.params.userId;
    const [rows] = await pool.query(
      `SELECT m.*, s.username AS sender_name, r.username AS receiver_name
       FROM Messages m
       JOIN Users s ON m.sender_id = s.user_id
       JOIN Users r ON m.receiver_id = r.user_id
       WHERE m.message_id IN (
         SELECT MAX(message_id) FROM Messages
         WHERE sender_id = ? OR receiver_id = ?
         GROUP BY
           CASE WHEN sender_id < receiver_id THEN sender_id ELSE receiver_id END,
           CASE WHEN sender_id < receiver_id THEN receiver_id ELSE sender_id END
       )
       ORDER BY m.sent_at DESC`,
      [userId, userId]
    );
    res.json(rows);
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
};

// POST send message
exports.create = async (req, res) => {
  try {
    const { sender_id, receiver_id, order_id, content, message_type } = req.body;
    const [result] = await pool.query(
      'INSERT INTO Messages (sender_id, receiver_id, order_id, content, message_type) OUTPUT INSERTED.message_id VALUES (?, ?, ?, ?, ?)',
      [sender_id, receiver_id, order_id || null, content, message_type || 'Text']
    );
    res.status(201).json({ message: 'Message sent', message_id: result.insertId });
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
};

// PATCH mark message as read
exports.markRead = async (req, res) => {
  try {
    const [result] = await pool.query(
      'UPDATE Messages SET is_read = 1 WHERE message_id = ?',
      [req.params.id]
    );
    if (result.affectedRows === 0) return res.status(404).json({ error: 'Message not found' });
    res.json({ message: 'Message marked as read' });
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
};

// DELETE message
exports.remove = async (req, res) => {
  try {
    const [result] = await pool.query('DELETE FROM Messages WHERE message_id = ?', [req.params.id]);
    if (result.affectedRows === 0) return res.status(404).json({ error: 'Message not found' });
    res.json({ message: 'Message deleted' });
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
};
