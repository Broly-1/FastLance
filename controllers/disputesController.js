const pool = require('../db');

async function notify(userId, type, title, body) {
  try {
    await pool.query(
      'INSERT INTO Notifications (user_id, type, title, body) OUTPUT INSERTED.notification_id VALUES (?, ?, ?, ?)',
      [userId, type, title, body || null]
    );
  } catch (_) {}
}


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

    // Notify the other party
    const [orderRows] = await pool.query(
      'SELECT o.buyer_id, o.seller_id, g.title FROM Orders o JOIN Gigs g ON o.gig_id = g.gig_id WHERE o.order_id = ?',
      [order_id]
    );
    if (orderRows.length > 0) {
      const o = orderRows[0];
      const otherId = Number(raised_by) === Number(o.buyer_id) ? o.seller_id : o.buyer_id;
      notify(otherId, 'Dispute', 'Dispute Opened', `A dispute has been raised on Order #${order_id} ("${o.title}"). An admin will review it.`);
    }
    res.status(201).json({ message: 'Dispute opened', dispute_id: result.insertId });
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
};

// PUT update/resolve dispute
exports.update = async (req, res) => {
  try {
    const { status, resolution, order_action } = req.body;
    const userRole = req.headers['x-user-role'];

    if (userRole !== 'Admin') {
      return res.status(403).json({ error: 'Only admins can resolve disputes' });
    }

    const resolved_at = status === 'Resolved' ? new Date() : null;

    // Fetch the dispute's linked order
    const [disputes] = await pool.query(
      'SELECT dispute_id, order_id FROM Disputes WHERE dispute_id = ?',
      [req.params.id]
    );
    if (disputes.length === 0) return res.status(404).json({ error: 'Dispute not found' });
    const { order_id } = disputes[0];

    // When resolving with an order action, run everything atomically
    if (status === 'Resolved' && order_action) {
      const conn = await pool.getConnection();
      try {
        await conn.beginTransaction();

        // 1. Resolve the dispute record
        await conn.query(
          `UPDATE Disputes SET status = ?, resolution = COALESCE(?, resolution), resolved_at = ? WHERE dispute_id = ?`,
          [status, resolution || null, resolved_at, req.params.id]
        );

        // 2. Fetch the order details for wallet operations
        const [orders] = await conn.query(
          'SELECT order_id, buyer_id, seller_id, total_price FROM Orders WHERE order_id = ?',
          [order_id]
        );

        if (orders.length > 0) {
          const order = orders[0];
          const amount = Number(order.total_price);

          if (order_action === 'cancel') {
            // Cancel order → refund buyer (they paid at creation)
            await conn.query(
              "UPDATE Orders SET status = 'Cancelled', updated_at = GETDATE() WHERE order_id = ?",
              [order_id]
            );
            await conn.query(
              'INSERT INTO Wallet_Transactions (user_id, order_id, amount, type, description) OUTPUT INSERTED.txn_id VALUES (?, ?, ?, ?, ?)',
              [order.buyer_id, order_id, amount, 'Refund', `Dispute resolution refund for Order #${order_id}`]
            );
            await conn.query(
              'UPDATE Users SET wallet_balance = wallet_balance + ? WHERE user_id = ?',
              [amount, order.buyer_id]
            );
          } else if (order_action === 'complete') {
            // Complete order → credit seller
            await conn.query(
              "UPDATE Orders SET status = 'Completed', updated_at = GETDATE() WHERE order_id = ?",
              [order_id]
            );
            await conn.query(
              'INSERT INTO Wallet_Transactions (user_id, order_id, amount, type, description) OUTPUT INSERTED.txn_id VALUES (?, ?, ?, ?, ?)',
              [order.seller_id, order_id, amount, 'Earning', `Dispute resolution earning for Order #${order_id}`]
            );
            await conn.query(
              'UPDATE Users SET wallet_balance = wallet_balance + ? WHERE user_id = ?',
              [amount, order.seller_id]
            );
          }
        }

        await conn.commit();
        return res.json({ message: 'Dispute resolved' });
      } catch (err) {
        await conn.rollback();
        throw err;
      } finally {
        conn.release();
      }
    }

    // Simple status update (no order action required)
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
