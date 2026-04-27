const pool = require('../db');

// GET transactions by user
exports.getByUser = async (req, res) => {
  try {
    const [rows] = await pool.query(
      'SELECT * FROM Wallet_Transactions WHERE user_id = ? ORDER BY created_at DESC',
      [req.params.userId]
    );
    res.json(rows);
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
};

// GET user wallet balance
exports.getBalance = async (req, res) => {
  try {
    const [rows] = await pool.query(
      'SELECT wallet_balance FROM Users WHERE user_id = ?',
      [req.params.userId]
    );
    if (rows.length === 0) return res.status(404).json({ error: 'User not found' });
    res.json({ user_id: parseInt(req.params.userId), wallet_balance: rows[0].wallet_balance });
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
};

// POST create wallet transaction (top-up, withdrawal, etc.)
exports.create = async (req, res) => {
  try {
    const { user_id, order_id, amount, type, description } = req.body;
    const conn = await pool.getConnection();
    try {
      await conn.beginTransaction();
      // Insert transaction record
      const [result] = await conn.query(
        'INSERT INTO Wallet_Transactions (user_id, order_id, amount, type, description) OUTPUT INSERTED.txn_id VALUES (?, ?, ?, ?, ?)',
        [user_id, order_id || null, amount, type, description || null]
      );
      // Update user wallet balance
      await conn.query(
        'UPDATE Users SET wallet_balance = wallet_balance + ? WHERE user_id = ?',
        [amount, user_id]
      );
      await conn.commit();
      res.status(201).json({ message: 'Transaction recorded', txn_id: result.insertId });
    } catch (err) {
      await conn.rollback();
      throw err;
    } finally {
      conn.release();
    }
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
};

// POST manual refund for an order (Admin)
exports.refund = async (req, res) => {
  try {
    const { order_id, amount, description } = req.body;
    if (!order_id || !amount) {
      return res.status(400).json({ error: 'order_id and amount are required' });
    }

    const conn = await pool.getConnection();
    try {
      await conn.beginTransaction();

      // Find the buyer ID for the refund
      const [orders] = await conn.query('SELECT buyer_id FROM Orders WHERE order_id = ?', [order_id]);
      if (orders.length === 0) {
         await conn.rollback();
         return res.status(404).json({ error: 'Order not found' });
      }
      const buyerId = orders[0].buyer_id;

      // Insert refund transaction
      const [result] = await conn.query(
        'INSERT INTO Wallet_Transactions (user_id, order_id, amount, type, description) OUTPUT INSERTED.txn_id VALUES (?, ?, ?, ?, ?)',
        [buyerId, order_id, amount, 'Refund', description || 'Admin manual refund']
      );

      // Refund buyer balance
      await conn.query(
        'UPDATE Users SET wallet_balance = wallet_balance + ? WHERE user_id = ?',
        [amount, buyerId]
      );

      await conn.commit();
      res.status(200).json({ message: 'Refund successful', txn_id: result.insertId });
    } catch (err) {
      await conn.rollback();
      throw err;
    } finally {
      conn.release();
    }
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
};
