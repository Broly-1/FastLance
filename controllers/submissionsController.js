const pool = require('../db');

function normalizeOptionalText(value) {
  if (typeof value !== 'string') {
    return null;
  }

  const trimmed = value.trim();
  return trimmed ? trimmed : null;
}

function toBoolean(value) {
  return value === true || value === 1 || value === '1' || value === 'true';
}

// GET submissions by order
exports.getByOrder = async (req, res) => {
  try {
    const [rows] = await pool.query(
      `SELECT s.*, u.username AS submitted_by_name, u.profile_pic_url
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

    if (!order_id || !submitted_by) {
      return res.status(400).json({ error: 'order_id and submitted_by are required' });
    }

    const normalizedMessage = normalizeOptionalText(message);
    const normalizedFileUrl = normalizeOptionalText(file_url);
    const isRevision = toBoolean(is_revision);

    const [orders] = await pool.query(
      `SELECT o.order_id, o.buyer_id, o.seller_id, o.status, o.revision_number, g.revision_limit
       FROM Orders o
       JOIN Gigs g ON o.gig_id = g.gig_id
       WHERE o.order_id = ?`,
      [order_id]
    );

    if (orders.length === 0) {
      return res.status(404).json({ error: 'Order not found' });
    }

    const order = orders[0];
    const submitterId = Number(submitted_by);
    const isBuyer = order.buyer_id === submitterId;
    const isSeller = order.seller_id === submitterId;

    if (!isBuyer && !isSeller) {
      return res.status(403).json({ error: 'Submitter does not belong to this order' });
    }

    if (isRevision) {
      if (!isBuyer) {
        return res.status(403).json({ error: 'Only the buyer can request a revision' });
      }

      if (order.status !== 'Delivered') {
        return res.status(400).json({ error: 'Revisions can only be requested after delivery' });
      }

      if (order.revision_number >= order.revision_limit) {
        return res.status(400).json({ error: `Revision limit reached (${order.revision_limit}).` });
      }

      if (!normalizedMessage) {
        return res.status(400).json({ error: 'Revision requests require a message' });
      }
    } else {
      if (!isSeller) {
        return res.status(403).json({ error: 'Only the seller can submit a delivery' });
      }

      if (!['Pending', 'In Progress'].includes(order.status)) {
        return res.status(400).json({ error: 'This order cannot be delivered in its current state' });
      }

      if (!normalizedMessage && !normalizedFileUrl) {
        return res.status(400).json({ error: 'Deliveries require a message or file_url' });
      }
    }

    const conn = await pool.getConnection();

    try {
      await conn.beginTransaction();

      const [result] = await conn.query(
        'INSERT INTO Order_Submissions (order_id, submitted_by, file_url, message, is_revision) OUTPUT INSERTED.submission_id VALUES (?, ?, ?, ?, ?)',
        [
          order_id,
          submitterId,
          isRevision ? null : normalizedFileUrl,
          normalizedMessage,
          isRevision ? 1 : 0,
        ]
      );

      if (isRevision) {
        await conn.query(
          "UPDATE Orders SET status = 'In Progress', revision_number = revision_number + 1, updated_at = GETDATE() WHERE order_id = ?",
          [order_id]
        );
      } else {
        await conn.query(
          "UPDATE Orders SET status = 'Delivered', updated_at = GETDATE() WHERE order_id = ?",
          [order_id]
        );
      }

      await conn.commit();
      res.status(201).json({
        message: isRevision ? 'Revision requested' : 'Submission created',
        submission_id: result.insertId,
      });
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
