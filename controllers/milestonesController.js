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
  try {
    const { title, description, deadline, amount, status, is_critical_path, completed_at } = req.body;
    
    // Fetch old status to check for completion
    const [oldRows] = await pool.query('SELECT order_id, title, status FROM Milestones WHERE milestone_id = ?', [req.params.id]);
    if (oldRows.length === 0) return res.status(404).json({ error: 'Milestone not found' });
    const oldMilestone = oldRows[0];

    const [result] = await pool.query(
      `UPDATE Milestones SET title = COALESCE(?, title), description = COALESCE(?, description),
       deadline = COALESCE(?, deadline), amount = COALESCE(?, amount),
       status = COALESCE(?, status), is_critical_path = COALESCE(?, is_critical_path),
       completed_at = COALESCE(?, completed_at)
       WHERE milestone_id = ?`,
      [title, description, deadline, amount, status, is_critical_path, completed_at, req.params.id]
    );

    if (result.affectedRows === 0) return res.status(404).json({ error: 'Milestone not found' });

    // Notify if status changed to Completed
    if (status === 'Completed' && oldMilestone.status !== 'Completed') {
        const [orderRows] = await pool.query(
          'SELECT o.buyer_id, o.seller_id, g.title FROM Orders o JOIN Gigs g ON o.gig_id = g.gig_id WHERE o.order_id = ?',
          [oldMilestone.order_id]
        );
        if (orderRows.length > 0) {
            notify(orderRows[0].buyer_id, 'Order', 'Milestone Approved', `The milestone "${oldMilestone.title}" for "${orderRows[0].title}" has been approved and completed.`);
            notify(orderRows[0].seller_id, 'Order', 'Milestone Approved', `Your milestone "${oldMilestone.title}" for "${orderRows[0].title}" has been approved.`);
        }
    }

    // Notify if status changed to Delivered
    if (status === 'Delivered' && oldMilestone.status !== 'Delivered') {
      const [orderRows] = await pool.query(
        'SELECT o.buyer_id, g.title FROM Orders o JOIN Gigs g ON o.gig_id = g.gig_id WHERE o.order_id = ?',
        [oldMilestone.order_id]
      );
      if (orderRows.length > 0) {
          notify(orderRows[0].buyer_id, 'Order', 'Milestone Delivered', `The milestone "${oldMilestone.title}" for "${orderRows[0].title}" has been delivered and is awaiting your approval.`);
      }
    }

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
