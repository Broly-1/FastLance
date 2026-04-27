const pool = require('../db');

// 1. Top 5 sellers by average rating
exports.topSellers = async (req, res) => {
  try {
    const [rows] = await pool.query(
      `SELECT TOP 5 u.user_id, u.username, u.profile_pic_url,
              COUNT(DISTINCT o.order_id) AS total_orders,
              COALESCE(ROUND(AVG(CAST(r.rating AS FLOAT)), 2), 0) AS avg_rating,
              COUNT(r.review_id) AS total_reviews
       FROM Users u
       JOIN Orders o ON u.user_id = o.seller_id
       LEFT JOIN Reviews r ON r.order_id = o.order_id
       WHERE o.status = 'Completed'
       GROUP BY u.user_id, u.username, u.profile_pic_url
       ORDER BY total_orders DESC, avg_rating DESC, total_reviews DESC`
    );
    res.json(rows);
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
};

// 2. Top 5 highest-rated gigs
exports.topGigs = async (req, res) => {
  try {
    const [rows] = await pool.query(
      `SELECT TOP 5 g.gig_id, g.title, g.category, g.price, u.username AS seller_name,
              ROUND(AVG(CAST(r.rating AS FLOAT)), 2) AS avg_rating,
              COUNT(r.review_id) AS total_reviews
       FROM Gigs g
       JOIN Orders o ON g.gig_id = o.gig_id
       JOIN Reviews r ON r.order_id = o.order_id
       JOIN Users u ON g.seller_id = u.user_id
       WHERE g.is_active = 1
       GROUP BY g.gig_id, g.title, g.category, g.price, u.username
       ORDER BY avg_rating DESC, total_reviews DESC`
    );
    res.json(rows);
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
};

// 3. Top 5 trending gigs (most orders in last 30 days)
exports.trendingGigs = async (req, res) => {
  try {
    const [rows] = await pool.query(
      `SELECT TOP 5 g.gig_id, g.title, g.category, g.price, u.username AS seller_name,
              COUNT(o.order_id) AS order_count
       FROM Gigs g
       JOIN Orders o ON g.gig_id = o.gig_id
       JOIN Users u ON g.seller_id = u.user_id
       WHERE o.order_date >= DATEADD(DAY, -30, GETDATE())
       GROUP BY g.gig_id, g.title, g.category, g.price, u.username
       ORDER BY order_count DESC`
    );
    res.json(rows);
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
};

// 4. Category statistics (gig count + avg price per category)
exports.categoryStats = async (req, res) => {
  try {
    const [rows] = await pool.query(
      `SELECT category,
              COUNT(*) AS gig_count,
              ROUND(AVG(price), 2) AS avg_price,
              MIN(price) AS min_price,
              MAX(price) AS max_price
       FROM Gigs
       WHERE is_active = 1
       GROUP BY category
       ORDER BY gig_count DESC`
    );
    res.json(rows);
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
};

// 5. Seller earnings
exports.sellerEarnings = async (req, res) => {
  try {
    const [rows] = await pool.query(
      `SELECT u.user_id, u.username, u.wallet_balance,
              COALESCE(SUM(CASE WHEN wt.type = 'Earning' THEN wt.amount ELSE 0 END), 0) AS total_earnings,
              COALESCE(SUM(CASE WHEN wt.type = 'Withdrawal' THEN ABS(wt.amount) ELSE 0 END), 0) AS total_withdrawn
       FROM Users u
       LEFT JOIN Wallet_Transactions wt ON u.user_id = wt.user_id
       WHERE u.user_id = ?
       GROUP BY u.user_id, u.username, u.wallet_balance`,
      [req.params.id]
    );
    if (rows.length === 0) return res.status(404).json({ error: 'Seller not found' });
    res.json(rows[0]);
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
};

// 6. Seller dashboard (orders summary + rating)
exports.sellerDashboard = async (req, res) => {
  try {
    const sellerId = req.params.id;
    const [[stats], [ratingData], [recentOrders]] = await Promise.all([
      pool.query(
        `SELECT
           COUNT(*) AS total_orders,
           SUM(CASE WHEN status = 'Completed' THEN 1 ELSE 0 END) AS completed_orders,
           SUM(CASE WHEN status = 'In Progress' THEN 1 ELSE 0 END) AS active_orders,
           SUM(CASE WHEN status = 'Cancelled' THEN 1 ELSE 0 END) AS cancelled_orders,
           SUM(CASE WHEN status = 'Completed' THEN total_price ELSE 0 END) AS total_revenue
         FROM Orders WHERE seller_id = ?`,
        [sellerId]
      ),
      pool.query(
        `SELECT ROUND(AVG(r.rating), 2) AS avg_rating, COUNT(r.review_id) AS total_reviews
         FROM Reviews r JOIN Orders o ON r.order_id = o.order_id
         WHERE o.seller_id = ?`,
        [sellerId]
      ),
      pool.query(
        `SELECT o.order_id, o.status, o.total_price, o.order_date, g.title AS gig_title, b.username AS buyer_name
         FROM Orders o
         JOIN Gigs g ON o.gig_id = g.gig_id
         JOIN Users b ON o.buyer_id = b.user_id
         WHERE o.seller_id = ?
         ORDER BY o.order_date DESC
         OFFSET 0 ROWS FETCH NEXT 5 ROWS ONLY`,
        [sellerId]
      ),
    ]);
    res.json({
      ...stats[0],
      ...ratingData[0],
      recent_orders: recentOrders,
    });
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
};

// 7. Buyer order history
exports.buyerHistory = async (req, res) => {
  try {
    const [rows] = await pool.query(
      `SELECT o.order_id, o.status, o.total_price, o.order_date, o.deadline,
              g.title AS gig_title, g.category,
              s.username AS seller_name,
              r.rating, r.comment AS review_comment
       FROM Orders o
       JOIN Gigs g ON o.gig_id = g.gig_id
       JOIN Users s ON o.seller_id = s.user_id
       LEFT JOIN Reviews r ON r.order_id = o.order_id
       WHERE o.buyer_id = ?
       ORDER BY o.order_date DESC`,
      [req.params.id]
    );
    res.json(rows);
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
};

// 8. Profitability report (from the view)
exports.profitability = async (req, res) => {
  try {
    const [rows] = await pool.query('SELECT * FROM Profitability_Report');
    res.json(rows);
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
};

// 9. Revenue by month
exports.revenueByMonth = async (req, res) => {
  try {
    const [rows] = await pool.query(
      `SELECT
         YEAR(updated_at) AS year,
         MONTH(updated_at) AS month,
         COUNT(*) AS invoices_paid,
         SUM(total_price) AS total_revenue
       FROM Orders
       WHERE status = 'Completed'
       GROUP BY YEAR(updated_at), MONTH(updated_at)
       ORDER BY year DESC, month DESC`
    );
    res.json(rows);
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
};

// 10. Overdue milestones
exports.overdueMilestones = async (req, res) => {
  try {
    const [rows] = await pool.query(
      `SELECT m.*, o.order_id, g.title AS gig_title,
              s.username AS seller_name, b.username AS buyer_name
       FROM Milestones m
       JOIN Orders o ON m.order_id = o.order_id
       JOIN Gigs g ON o.gig_id = g.gig_id
       JOIN Users s ON o.seller_id = s.user_id
       JOIN Users b ON o.buyer_id = b.user_id
       WHERE m.deadline < GETDATE() AND m.status != 'Completed'
       ORDER BY m.deadline ASC`
    );
    res.json(rows);
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
};

// 11. Platform-wide summary
exports.platformSummary = async (req, res) => {
  try {
    const [[users], [gigs], [orders], [revenue], [rating]] = await Promise.all([
      pool.query('SELECT COUNT(*) AS total_users FROM Users WHERE is_active = 1'),
      pool.query('SELECT COUNT(*) AS total_gigs FROM Gigs WHERE is_active = 1'),
      pool.query(
        `SELECT COUNT(*) AS total_orders,
                SUM(CASE WHEN status = 'Completed' THEN 1 ELSE 0 END) AS completed_orders
         FROM Orders`
      ),
      pool.query("SELECT COALESCE(SUM(total_price), 0) AS total_revenue FROM Orders WHERE status = 'Completed'"),
      pool.query('SELECT ROUND(AVG(rating), 2) AS platform_avg_rating FROM Reviews'),
    ]);
    res.json({
      ...users[0],
      ...gigs[0],
      ...orders[0],
      ...revenue[0],
      ...rating[0],
    });
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
};

// 12. User feedback (all reviews received by a seller)
exports.userFeedback = async (req, res) => {
  try {
    const [rows] = await pool.query(
      `SELECT r.review_id, r.rating, r.comment, r.seller_reply, r.created_at,
              u.username AS reviewer_name,
              g.title AS gig_title, o.order_id
       FROM Reviews r
       JOIN Orders o ON r.order_id = o.order_id
       JOIN Users u ON r.reviewer_id = u.user_id
       JOIN Gigs g ON o.gig_id = g.gig_id
       WHERE o.seller_id = ?
       ORDER BY r.created_at DESC`,
      [req.params.id]
    );
    res.json(rows);
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
};

// Admin Export Data
exports.exportAnalytics = async (req, res) => {
  try {
        const [users] = await pool.query("SELECT user_id, username, email, role, created_at, wallet_balance, is_active FROM Users");
        const [gigs] = await pool.query("SELECT gig_id, seller_id, title, category, price, created_at, is_active FROM Gigs");
        const [orders] = await pool.query("SELECT order_id, buyer_id, gig_id, total_price as amount, status, order_date FROM Orders");
    
    // If only one row returned by pool.query, actually we need the whole array
    // pool.query returns [rows, fields]
    res.json({ users, gigs, orders });
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
};
