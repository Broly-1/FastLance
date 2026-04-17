const pool = require('../db');

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
    // Fetch gig to get seller_id, price, delivery_days
    const [gigs] = await pool.query('SELECT seller_id, price, delivery_days FROM Gigs WHERE gig_id = ?', [gig_id]);
    if (gigs.length === 0) return res.status(404).json({ error: 'Gig not found' });

    const gig = gigs[0];
    const deadline = new Date();
    deadline.setDate(deadline.getDate() + gig.delivery_days);

    const [result] = await pool.query(
      'INSERT INTO Orders (gig_id, buyer_id, seller_id, total_price, deadline) OUTPUT INSERTED.order_id VALUES (?, ?, ?, ?, ?)',
      [gig_id, buyer_id, gig.seller_id, gig.price, deadline]
    );
    res.status(201).json({ message: 'Order created', order_id: result.insertId });
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
};

// PATCH update order status
exports.updateStatus = async (req, res) => {
  try {
    const { status } = req.body;
    const [result] = await pool.query(
      'UPDATE Orders SET status = ? WHERE order_id = ?',
      [status, req.params.id]
    );
    if (result.affectedRows === 0) return res.status(404).json({ error: 'Order not found' });
    res.json({ message: 'Order status updated' });
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
};

// PUT update order
exports.update = async (req, res) => {
  try {
    const { total_price, status, deadline, revision_number } = req.body;
    const [result] = await pool.query(
      `UPDATE Orders SET total_price = COALESCE(?, total_price), status = COALESCE(?, status),
       deadline = COALESCE(?, deadline), revision_number = COALESCE(?, revision_number)
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
