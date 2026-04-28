const pool = require('../db');

// Fire-and-forget notification helper
async function notify(userId, type, title, body) {
  try {
    await pool.query(
      'INSERT INTO Notifications (user_id, type, title, body) OUTPUT INSERTED.notification_id VALUES (?, ?, ?, ?)',
      [userId, type, title, body || null]
    );
  } catch (_) {}
}

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

    // Notify buyer that a milestone was created
    const [orderRows] = await pool.query(
      'SELECT o.buyer_id, g.title FROM Orders o JOIN Gigs g ON o.gig_id = g.gig_id WHERE o.order_id = ?',
      [order_id]
    );
    if (orderRows.length > 0) {
      notify(orderRows[0].buyer_id, 'Order', 'Milestone Created', `A new milestone "${title}" has been added to Order #${order_id} ("${orderRows[0].title}").`);
    }

    res.status(201).json({ message: 'Milestone created', milestone_id: result.insertId });
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
};

// PUT update milestone
exports.update = async (req, res) => {
  const { title, description, deadline, amount, status, is_critical_path, completed_at } = req.body;
  const conn = await pool.getConnection();

  try {
    await conn.beginTransaction();

    // Fetch old status to check for completion and fetch order info for payment
    const [oldRows] = await conn.query(
      `SELECT m.order_id, m.title, m.status, m.amount, o.seller_id, g.title as gig_title 
       FROM Milestones m
       JOIN Orders o ON m.order_id = o.order_id
       JOIN Gigs g ON o.gig_id = g.gig_id
       WHERE m.milestone_id = ?`, 
      [req.params.id]
    );

    if (oldRows.length === 0) {
      await conn.rollback();
      return res.status(404).json({ error: 'Milestone not found' });
    }
    const oldMilestone = oldRows[0];

    // 1. Update the milestone record
    const [result] = await conn.query(
      `UPDATE Milestones SET title = COALESCE(?, title), description = COALESCE(?, description),
       deadline = COALESCE(?, deadline), amount = COALESCE(?, amount),
       status = COALESCE(?, status), is_critical_path = COALESCE(?, is_critical_path),
       completed_at = COALESCE(?, completed_at)
       WHERE milestone_id = ?`,
      [title, description, deadline, amount, status, is_critical_path, completed_at, req.params.id]
    );

    if (result.affectedRows === 0) {
      await conn.rollback();
      return res.status(404).json({ error: 'Milestone not found' });
    }

    // 2. Handle Payment: Release funds to seller if status flipped to 'Completed'
    if (status === 'Completed' && oldMilestone.status !== 'Completed') {
      const payAmount = Number(oldMilestone.amount);
      if (payAmount > 0) {
        // Record earning for the seller
        await conn.query(
          'INSERT INTO Wallet_Transactions (user_id, order_id, amount, type, description) OUTPUT INSERTED.txn_id VALUES (?, ?, ?, ?, ?)',
          [oldMilestone.seller_id, oldMilestone.order_id, payAmount, 'Earning', `Earning for milestone "${oldMilestone.title}" (Order #${oldMilestone.order_id})`]
        );
        // Credit seller wallet
        await conn.query(
          'UPDATE Users SET wallet_balance = wallet_balance + ? WHERE user_id = ?',
          [payAmount, oldMilestone.seller_id]
        );
      }

      // Notify both parties of approval
      notify(oldMilestone.buyer_id, 'Order', 'Milestone Approved', `The milestone "${oldMilestone.title}" for "${oldMilestone.gig_title}" has been approved and completed.`);
      notify(oldMilestone.seller_id, 'Order', 'Milestone Approved', `Your milestone "${oldMilestone.title}" for "${oldMilestone.gig_title}" has been approved. Funds released.`);
    }

    // 3. Notify of Delivery
    if (status === 'Delivered' && oldMilestone.status !== 'Delivered') {
      notify(oldMilestone.buyer_id, 'Order', 'Milestone Delivered', `The milestone "${oldMilestone.title}" for "${oldMilestone.gig_title}" has been delivered and is awaiting your approval.`);
    }

    await conn.commit();
    res.json({ message: 'Milestone updated' });

  } catch (err) {
    await conn.rollback();
    res.status(500).json({ error: err.message });
  } finally {
    conn.release();
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
