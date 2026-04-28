const pool = require('../db');

// Fire-and-forget notification helper
async function notify(userId, type, title, body) {
  try {
    await pool.query(
      'INSERT INTO Notifications (user_id, type, title, body) OUTPUT INSERTED.notification_id VALUES (?, ?, ?, ?)',
      [userId, type, title, body || null]
    );
  } catch (_) { /* never block the main flow */ }
}


const VALID_ORDER_STATUSES = new Set([
  'Pending',
  'In Progress',
  'Delivered',
  'Completed',
  'Cancelled',
  'Disputed',
]);

const ALLOWED_STATUS_TRANSITIONS = {
  Pending: new Set(['In Progress', 'Cancelled']),
  'In Progress': new Set(['Cancelled']),
  Delivered: new Set(['Completed', 'In Progress']),
  Completed: new Set(),
  Cancelled: new Set(),
  Disputed: new Set(),
};

function isAllowedStatusTransition(currentStatus, nextStatus) {
  if (currentStatus === nextStatus) {
    return true;
  }

  return ALLOWED_STATUS_TRANSITIONS[currentStatus]?.has(nextStatus) || false;
}

// GET all orders
exports.getAll = async (req, res) => {
  try {
    const [rows] = await pool.query(
      `SELECT o.*, g.title AS gig_title, b.username AS buyer_name, s.username AS seller_name
       FROM Orders o
       JOIN Gigs g ON o.gig_id = g.gig_id
       JOIN Users b ON o.buyer_id = b.user_id
       JOIN Users s ON o.seller_id = s.user_id
       ORDER BY o.order_date DESC`
    );
    res.json(rows);
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
};

// GET order by ID
exports.getById = async (req, res) => {
  try {
    const [rows] = await pool.query(
      `SELECT o.*, g.title AS gig_title, b.username AS buyer_name, s.username AS seller_name
       FROM Orders o
       JOIN Gigs g ON o.gig_id = g.gig_id
       JOIN Users b ON o.buyer_id = b.user_id
       JOIN Users s ON o.seller_id = s.user_id
       WHERE o.order_id = ?`,
      [req.params.id]
    );
    if (rows.length === 0) return res.status(404).json({ error: 'Order not found' });
    res.json(rows[0]);
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
};

// GET orders by buyer
exports.getByBuyer = async (req, res) => {
  try {
    const [rows] = await pool.query(
      `SELECT o.*, g.title AS gig_title, s.username AS seller_name
       FROM Orders o
       JOIN Gigs g ON o.gig_id = g.gig_id
       JOIN Users s ON o.seller_id = s.user_id
       WHERE o.buyer_id = ?
       ORDER BY o.order_date DESC`,
      [req.params.buyerId]
    );
    res.json(rows);
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
};

// GET orders by seller
exports.getBySeller = async (req, res) => {
  try {
    const [rows] = await pool.query(
      `SELECT o.*, g.title AS gig_title, b.username AS buyer_name
       FROM Orders o
       JOIN Gigs g ON o.gig_id = g.gig_id
       JOIN Users b ON o.buyer_id = b.user_id
       WHERE o.seller_id = ?
       ORDER BY o.order_date DESC`,
      [req.params.sellerId]
    );
    res.json(rows);
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
};

// POST create order
exports.create = async (req, res) => {
  try {
    const { gig_id, buyer_id } = req.body;

    if (!gig_id || !buyer_id) {
      return res.status(400).json({ error: 'gig_id and buyer_id are required' });
    }

    // Fetch gig to get seller_id, price, delivery_days, title
    const [gigs] = await pool.query('SELECT seller_id, price, delivery_days, title FROM Gigs WHERE gig_id = ?', [gig_id]);
    if (gigs.length === 0) return res.status(404).json({ error: 'Gig not found' });

    const gig = gigs[0];

    if (gig.seller_id === Number(buyer_id)) {
      return res.status(400).json({ error: 'You cannot purchase your own gig' });
    }

    // Check buyer has sufficient wallet balance
    const [balRows] = await pool.query('SELECT wallet_balance FROM Users WHERE user_id = ?', [buyer_id]);
    if (balRows.length === 0) return res.status(404).json({ error: 'Buyer not found' });
    const buyerBalance = Number(balRows[0].wallet_balance);
    const price = Number(gig.price);
    if (buyerBalance < price) {
      return res.status(400).json({
        error: `Insufficient wallet balance. You have $${buyerBalance.toFixed(2)} but this gig costs $${price.toFixed(2)}.`,
      });
    }

    const deadline = new Date();
    deadline.setDate(deadline.getDate() + gig.delivery_days);

    // Atomically create the order and deduct from buyer wallet
    const conn = await pool.getConnection();
    try {
      await conn.beginTransaction();

      const [result] = await conn.query(
        'INSERT INTO Orders (gig_id, buyer_id, seller_id, total_price, deadline) OUTPUT INSERTED.order_id VALUES (?, ?, ?, ?, ?)',
        [gig_id, buyer_id, gig.seller_id, price, deadline]
      );
      const orderId = result.insertId;

      // Deduct from buyer wallet
      await conn.query(
        'INSERT INTO Wallet_Transactions (user_id, order_id, amount, type, description) OUTPUT INSERTED.txn_id VALUES (?, ?, ?, ?, ?)',
        [buyer_id, orderId, -price, 'OrderPayment', `Payment for Order #${orderId}`]
      );
      await conn.query(
        'UPDATE Users SET wallet_balance = wallet_balance - ? WHERE user_id = ?',
        [price, buyer_id]
      );

      await conn.commit();
      // Notify seller that a new order arrived
      notify(gig.seller_id, 'Order', 'New Order Received', `You have a new order for "${gig.title || 'your gig'}" (#${orderId}).`);
      res.status(201).json({ message: 'Order created', order_id: orderId });

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


// PATCH update order status
exports.updateStatus = async (req, res) => {
  try {
    const { status } = req.body;

    if (!VALID_ORDER_STATUSES.has(status)) {
      return res.status(400).json({ error: 'Invalid order status' });
    }

    const [rows] = await pool.query(
      `SELECT o.order_id, o.status, o.total_price, o.buyer_id, o.seller_id, g.title AS gig_title
       FROM Orders o 
       JOIN Gigs g ON o.gig_id = g.gig_id
       WHERE o.order_id = ?`,
      [req.params.id]
    );

    if (rows.length === 0) {
      return res.status(404).json({ error: 'Order not found' });
    }

    const order = rows[0];
    const currentStatus = order.status;

    // FEATURE D: Lock Disputed orders
    if (currentStatus === 'Disputed' && status !== 'Disputed') {
      return res.status(400).json({
        error: 'This order is currently under dispute. Standard status transitions are locked until the dispute is resolved by an admin.',
      });
    }

    if (!isAllowedStatusTransition(currentStatus, status)) {
      return res.status(400).json({
        error: `Invalid status transition from ${currentStatus} to ${status}`,
      });
    }

    // FEATURE B: Enforce critical milestones
    if (status === 'Completed') {
      const [criticalRows] = await pool.query(
        "SELECT COUNT(*) AS incomplete_count FROM Milestones WHERE order_id = ? AND is_critical_path = 1 AND status != 'Completed'",
        [req.params.id]
      );
      if (criticalRows[0].incomplete_count > 0) {
        return res.status(400).json({
          error: `Cannot complete order. There are ${criticalRows[0].incomplete_count} incomplete critical milestones that must be finished first.`,
        });
      }
    }

    const amount = Number(order.total_price);
    
    // Calculate how much was already paid via milestones
    const [paidRows] = await pool.query(
      "SELECT COALESCE(SUM(amount), 0) AS already_paid FROM Milestones WHERE order_id = ? AND status = 'Completed'",
      [req.params.id]
    );
    const alreadyPaid = Number(paidRows[0].already_paid);

    // Completing: buyer already paid at order creation — credit the seller the remaining balance
    if (status === 'Completed' && currentStatus !== 'Completed') {
      const conn = await pool.getConnection();
      try {
        await conn.beginTransaction();

        const remainingAmount = Math.max(0, amount - alreadyPaid);

        await conn.query(
          'UPDATE Orders SET status = ?, updated_at = GETDATE() WHERE order_id = ?',
          [status, req.params.id]
        );

        if (remainingAmount > 0) {
          await conn.query(
            'INSERT INTO Wallet_Transactions (user_id, order_id, amount, type, description) OUTPUT INSERTED.txn_id VALUES (?, ?, ?, ?, ?)',
            [order.seller_id, order.order_id, remainingAmount, 'Earning', `Final earning from Order #${order.order_id}`]
          );
          await conn.query(
            'UPDATE Users SET wallet_balance = wallet_balance + ? WHERE user_id = ?',
            [remainingAmount, order.seller_id]
          );
        }
        
        await conn.commit();
        notify(order.buyer_id, 'Order', 'Order Completed', `Order #${order.order_id} ("${order.gig_title}") has been completed. Thank you!`);
        notify(order.seller_id, 'Order', 'Order Completed', `Order #${order.order_id} ("${order.gig_title}") is complete — your final earnings ($${remainingAmount.toFixed(2)}) have been credited.`);
        return res.json({ message: 'Order status updated', status });

      } catch (err) {
        await conn.rollback();
        throw err;
      } finally {
        conn.release();
      }
    }

    // Cancelling: refund the buyer the escrow balance (total price - what was already paid to seller)
    if (status === 'Cancelled' && currentStatus !== 'Cancelled') {
      const conn = await pool.getConnection();
      try {
        await conn.beginTransaction();

        const refundAmount = Math.max(0, amount - alreadyPaid);

        await conn.query(
          'UPDATE Orders SET status = ?, updated_at = GETDATE() WHERE order_id = ?',
          [status, req.params.id]
        );

        if (refundAmount > 0) {
          await conn.query(
            'INSERT INTO Wallet_Transactions (user_id, order_id, amount, type, description) OUTPUT INSERTED.txn_id VALUES (?, ?, ?, ?, ?)',
            [order.buyer_id, order.order_id, refundAmount, 'Refund', `Refund for cancelled Order #${order.order_id} (adjusted for paid milestones)`]
          );
          await conn.query(
            'UPDATE Users SET wallet_balance = wallet_balance + ? WHERE user_id = ?',
            [refundAmount, order.buyer_id]
          );
        }
        
        await conn.commit();
        notify(order.buyer_id, 'Order', 'Order Cancelled & Refunded', `Order #${order.order_id} has been cancelled. Your remaining payment of $${refundAmount.toFixed(2)} has been refunded.`);
        notify(order.seller_id, 'Order', 'Order Cancelled', `Order #${order.order_id} has been cancelled by the buyer.`);
        return res.json({ message: 'Order status updated', status });

      } catch (err) {
        await conn.rollback();
        throw err;
      } finally {
        conn.release();
      }
    }

    // All other transitions (Pending → In Progress, In Progress → Delivered, etc.)
    const [result] = await pool.query(
      'UPDATE Orders SET status = ?, updated_at = GETDATE() WHERE order_id = ?',
      [status, req.params.id]
    );
    if (result.affectedRows === 0) return res.status(404).json({ error: 'Order not found' });
    // Notify parties of status change
    if (status === 'Delivered') {
      notify(order.buyer_id, 'Order', 'Order Delivered', `The seller has delivered your order #${order.order_id} ("${order.gig_title}"). Please review it!`);
      notify(order.seller_id, 'Order', 'Order Delivered', `You have marked Order #${order.order_id} ("${order.gig_title}") as delivered.`);
    } else {
      notify(order.buyer_id, 'System', `Order Update: ${status}`, `Order #${order.order_id} status is now ${status}.`);
      notify(order.seller_id, 'System', `Order Update: ${status}`, `Order #${order.order_id} status is now ${status}.`);
    }
    res.json({ message: 'Order status updated', status });
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
};

// PUT update order
exports.update = async (req, res) => {
  try {
    const { total_price, status, deadline, revision_number } = req.body;

    if (status !== undefined) {
      if (!VALID_ORDER_STATUSES.has(status)) {
        return res.status(400).json({ error: 'Invalid order status' });
      }

      const [rows] = await pool.query(
        'SELECT order_id, status FROM Orders WHERE order_id = ?',
        [req.params.id]
      );

      if (rows.length === 0) {
        return res.status(404).json({ error: 'Order not found' });
      }

      const currentStatus = rows[0].status;
      if (!isAllowedStatusTransition(currentStatus, status)) {
        return res.status(400).json({
          error: `Invalid status transition from ${currentStatus} to ${status}`,
        });
      }
    }

    const [result] = await pool.query(
      `UPDATE Orders SET total_price = COALESCE(?, total_price), status = COALESCE(?, status),
       deadline = COALESCE(?, deadline), revision_number = COALESCE(?, revision_number),
       updated_at = GETDATE()
       WHERE order_id = ?`,
      [total_price, status, deadline, revision_number, req.params.id]
    );
    if (result.affectedRows === 0) return res.status(404).json({ error: 'Order not found' });
    res.json({ message: 'Order updated' });
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
};

// DELETE order
exports.remove = async (req, res) => {
  try {
    const [result] = await pool.query('DELETE FROM Orders WHERE order_id = ?', [req.params.id]);
    if (result.affectedRows === 0) return res.status(404).json({ error: 'Order not found' });
    res.json({ message: 'Order deleted' });
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
};
