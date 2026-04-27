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

// GET all invoices
exports.getAll = async (req, res) => {
  try {
    const [rows] = await pool.query(
      `SELECT i.*, o.status AS order_status, g.title AS gig_title
       FROM Invoices i
       JOIN Orders o ON i.order_id = o.order_id
       JOIN Gigs g ON o.gig_id = g.gig_id
       ORDER BY i.due_date DESC`
    );
    res.json(rows);
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
};

// GET invoice by ID
exports.getById = async (req, res) => {
  try {
    const [rows] = await pool.query(
      `SELECT i.*, o.status AS order_status, g.title AS gig_title,
              b.username AS buyer_name, s.username AS seller_name
       FROM Invoices i
       JOIN Orders o ON i.order_id = o.order_id
       JOIN Gigs g ON o.gig_id = g.gig_id
       JOIN Users b ON o.buyer_id = b.user_id
       JOIN Users s ON o.seller_id = s.user_id
       WHERE i.invoice_id = ?`,
      [req.params.id]
    );
    if (rows.length === 0) return res.status(404).json({ error: 'Invoice not found' });
    res.json(rows[0]);
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
};

// GET invoices by order
exports.getByOrder = async (req, res) => {
  try {
    const [rows] = await pool.query(
      'SELECT * FROM Invoices WHERE order_id = ? ORDER BY due_date ASC',
      [req.params.orderId]
    );
    res.json(rows);
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
};

// POST create invoice
exports.create = async (req, res) => {
  try {
    const { order_id, milestone_id, amount, due_date } = req.body;
    const [result] = await pool.query(
      'INSERT INTO Invoices (order_id, milestone_id, amount, due_date) OUTPUT INSERTED.invoice_id VALUES (?, ?, ?, ?)',
      [order_id, milestone_id || null, amount, due_date]
    );

    // Notify buyer
    const [orderRows] = await pool.query(
      'SELECT o.buyer_id, g.title FROM Orders o JOIN Gigs g ON o.gig_id = g.gig_id WHERE o.order_id = ?',
      [order_id]
    );
    if (orderRows.length > 0) {
      notify(orderRows[0].buyer_id, 'Payment', 'Invoice Issued', `A new invoice for $${amount} has been issued for Order #${order_id} ("${orderRows[0].title}").`);
    }

    res.status(201).json({ message: 'Invoice created', invoice_id: result.insertId });
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
};

// PUT update invoice
exports.update = async (req, res) => {
  try {
    const { amount, status, due_date, milestone_id } = req.body;
    const [result] = await pool.query(
      `UPDATE Invoices SET amount = COALESCE(?, amount), status = COALESCE(?, status),
       due_date = COALESCE(?, due_date), milestone_id = COALESCE(?, milestone_id)
       WHERE invoice_id = ?`,
      [amount, status, due_date, milestone_id, req.params.id]
    );
    if (result.affectedRows === 0) return res.status(404).json({ error: 'Invoice not found' });
    res.json({ message: 'Invoice updated' });
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
};

// PATCH mark invoice as paid
exports.markPaid = async (req, res) => {
  try {
    const [result] = await pool.query(
      "UPDATE Invoices SET status = 'Paid', paid_at = GETDATE() WHERE invoice_id = ?",
      [req.params.id]
    );
    if (result.affectedRows === 0) return res.status(404).json({ error: 'Invoice not found' });

    // Notify seller
    const [invRows] = await pool.query(
      `SELECT i.order_id, i.amount, g.title 
       FROM Invoices i 
       JOIN Orders o ON i.order_id = o.order_id
       JOIN Gigs g ON o.gig_id = g.gig_id
       WHERE i.invoice_id = ?`,
      [req.params.id]
    );
    if (invRows.length > 0) {
      const [orderRows] = await pool.query('SELECT seller_id FROM Orders WHERE order_id = ?', [invRows[0].order_id]);
      if (orderRows.length > 0) {
        notify(orderRows[0].seller_id, 'Payment', 'Invoice Paid', `The invoice for $${invRows[0].amount} for Order #${invRows[0].order_id} ("${invRows[0].title}") has been paid.`);
      }
    }

    res.json({ message: 'Invoice marked as paid' });
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
};

// DELETE invoice
exports.remove = async (req, res) => {
  try {
    const [result] = await pool.query('DELETE FROM Invoices WHERE invoice_id = ?', [req.params.id]);
    if (result.affectedRows === 0) return res.status(404).json({ error: 'Invoice not found' });
    res.json({ message: 'Invoice deleted' });
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
};
