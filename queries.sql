-- ================================================================
-- FREELANCE PLATFORM - DQL QUERIES & VIEWS
-- All domain-specific SELECT queries for the platform
-- ================================================================

-- ----------------------------------------------------------------
-- 1. TOP 5 SELLERS BY AVERAGE RATING
-- Returns the highest-rated sellers based on completed-order reviews
-- ----------------------------------------------------------------
SELECT u.user_id, u.username, u.profile_pic_url,
       COUNT(DISTINCT o.order_id) AS total_orders,
       ROUND(AVG(r.rating), 2)   AS avg_rating,
       COUNT(r.review_id)        AS total_reviews
FROM Users u
JOIN Orders o  ON u.user_id = o.seller_id
JOIN Reviews r ON r.order_id = o.order_id
WHERE o.status = 'Completed'
GROUP BY u.user_id, u.username, u.profile_pic_url
HAVING total_reviews >= 1
ORDER BY avg_rating DESC, total_reviews DESC
LIMIT 5;

-- ----------------------------------------------------------------
-- 2. TOP 5 HIGHEST-RATED GIGS
-- ----------------------------------------------------------------
SELECT g.gig_id, g.title, g.category, g.price,
       u.username AS seller_name,
       ROUND(AVG(r.rating), 2) AS avg_rating,
       COUNT(r.review_id)      AS total_reviews
FROM Gigs g
JOIN Orders o  ON g.gig_id   = o.gig_id
JOIN Reviews r ON r.order_id  = o.order_id
JOIN Users u   ON g.seller_id = u.user_id
WHERE g.is_active = 1
GROUP BY g.gig_id, g.title, g.category, g.price, u.username
ORDER BY avg_rating DESC, total_reviews DESC
LIMIT 5;

-- ----------------------------------------------------------------
-- 3. TOP 5 TRENDING GIGS (most orders in the last 30 days)
-- ----------------------------------------------------------------
SELECT g.gig_id, g.title, g.category, g.price,
       u.username AS seller_name,
       COUNT(o.order_id) AS order_count
FROM Gigs g
JOIN Orders o ON g.gig_id   = o.gig_id
JOIN Users u  ON g.seller_id = u.user_id
WHERE o.order_date >= DATE_SUB(NOW(), INTERVAL 30 DAY)
GROUP BY g.gig_id, g.title, g.category, g.price, u.username
ORDER BY order_count DESC
LIMIT 5;

-- ----------------------------------------------------------------
-- 4. CATEGORY STATISTICS (gig count, avg / min / max price)
-- ----------------------------------------------------------------
SELECT category,
       COUNT(*)            AS gig_count,
       ROUND(AVG(price), 2) AS avg_price,
       MIN(price)          AS min_price,
       MAX(price)          AS max_price
FROM Gigs
WHERE is_active = 1
GROUP BY category
ORDER BY gig_count DESC;

-- ----------------------------------------------------------------
-- 5. SELLER EARNINGS SUMMARY
-- Replace ? with the seller's user_id
-- ----------------------------------------------------------------
SELECT u.user_id, u.username, u.wallet_balance,
       COALESCE(SUM(CASE WHEN wt.type = 'Earning'    THEN wt.amount       ELSE 0 END), 0) AS total_earnings,
       COALESCE(SUM(CASE WHEN wt.type = 'Withdrawal' THEN ABS(wt.amount)  ELSE 0 END), 0) AS total_withdrawn
FROM Users u
LEFT JOIN Wallet_Transactions wt ON u.user_id = wt.user_id
WHERE u.user_id = ?
GROUP BY u.user_id, u.username, u.wallet_balance;

-- ----------------------------------------------------------------
-- 6. SELLER DASHBOARD - order breakdown
-- Replace ? with the seller's user_id
-- ----------------------------------------------------------------
SELECT
    COUNT(*)                                                     AS total_orders,
    SUM(CASE WHEN status = 'Completed'   THEN 1 ELSE 0 END)     AS completed_orders,
    SUM(CASE WHEN status = 'In Progress' THEN 1 ELSE 0 END)     AS active_orders,
    SUM(CASE WHEN status = 'Cancelled'   THEN 1 ELSE 0 END)     AS cancelled_orders,
    SUM(CASE WHEN status = 'Completed'   THEN total_price ELSE 0 END) AS total_revenue
FROM Orders
WHERE seller_id = ?;

-- Average rating for the seller
SELECT ROUND(AVG(r.rating), 2) AS avg_rating,
       COUNT(r.review_id)      AS total_reviews
FROM Reviews r
JOIN Orders o ON r.order_id = o.order_id
WHERE o.seller_id = ?;

-- Recent 5 orders for the seller
SELECT o.order_id, o.status, o.total_price, o.order_date,
       g.title AS gig_title, b.username AS buyer_name
FROM Orders o
JOIN Gigs g  ON o.gig_id   = g.gig_id
JOIN Users b ON o.buyer_id  = b.user_id
WHERE o.seller_id = ?
ORDER BY o.order_date DESC
LIMIT 5;

-- ----------------------------------------------------------------
-- 7. BUYER ORDER HISTORY (with review details)
-- Replace ? with the buyer's user_id
-- ----------------------------------------------------------------
SELECT o.order_id, o.status, o.total_price, o.order_date, o.deadline,
       g.title AS gig_title, g.category,
       s.username AS seller_name,
       r.rating, r.comment AS review_comment
FROM Orders o
JOIN Gigs g  ON o.gig_id    = g.gig_id
JOIN Users s ON o.seller_id  = s.user_id
LEFT JOIN Reviews r ON r.order_id = o.order_id
WHERE o.buyer_id = ?
ORDER BY o.order_date DESC;

-- ----------------------------------------------------------------
-- 8. PROFITABILITY REPORT (uses the existing view)
-- ----------------------------------------------------------------
SELECT * FROM Profitability_Report;

-- ----------------------------------------------------------------
-- 9. MONTHLY REVENUE TREND
-- ----------------------------------------------------------------
SELECT
    YEAR(paid_at)  AS year,
    MONTH(paid_at) AS month,
    COUNT(*)       AS invoices_paid,
    SUM(amount)    AS total_revenue
FROM Invoices
WHERE status = 'Paid' AND paid_at IS NOT NULL
GROUP BY YEAR(paid_at), MONTH(paid_at)
ORDER BY year DESC, month DESC;

-- ----------------------------------------------------------------
-- 10. OVERDUE MILESTONES
-- ----------------------------------------------------------------
SELECT m.*, o.order_id,
       g.title AS gig_title,
       s.username AS seller_name,
       b.username AS buyer_name
FROM Milestones m
JOIN Orders o ON m.order_id  = o.order_id
JOIN Gigs g   ON o.gig_id   = g.gig_id
JOIN Users s  ON o.seller_id = s.user_id
JOIN Users b  ON o.buyer_id  = b.user_id
WHERE m.deadline < NOW() AND m.status != 'Completed'
ORDER BY m.deadline ASC;

-- ----------------------------------------------------------------
-- 11. PLATFORM-WIDE SUMMARY
-- ----------------------------------------------------------------
SELECT
    (SELECT COUNT(*) FROM Users WHERE is_active = 1) AS total_users,
    (SELECT COUNT(*) FROM Gigs  WHERE is_active = 1) AS total_gigs,
    (SELECT COUNT(*) FROM Orders)                     AS total_orders,
    (SELECT SUM(CASE WHEN status = 'Completed' THEN 1 ELSE 0 END) FROM Orders) AS completed_orders,
    (SELECT COALESCE(SUM(amount), 0) FROM Invoices WHERE status = 'Paid')       AS total_revenue,
    (SELECT ROUND(AVG(rating), 2) FROM Reviews)                                 AS platform_avg_rating;

-- ----------------------------------------------------------------
-- 12. USER FEEDBACK - all reviews received by a seller
-- Replace ? with the seller's user_id
-- ----------------------------------------------------------------
SELECT r.review_id, r.rating, r.comment, r.seller_reply, r.created_at,
       u.username AS reviewer_name,
       g.title AS gig_title, o.order_id
FROM Reviews r
JOIN Orders o ON r.order_id   = o.order_id
JOIN Users u  ON r.reviewer_id = u.user_id
JOIN Gigs g   ON o.gig_id     = g.gig_id
WHERE o.seller_id = ?
ORDER BY r.created_at DESC;


-- ================================================================
-- ADDITIONAL VIEWS
-- ================================================================

-- VIEW: Top sellers (reusable)
CREATE OR REPLACE VIEW Top_Sellers AS
SELECT u.user_id, u.username, u.profile_pic_url,
       COUNT(DISTINCT o.order_id) AS total_orders,
       ROUND(AVG(r.rating), 2)   AS avg_rating,
       COUNT(r.review_id)        AS total_reviews
FROM Users u
JOIN Orders o  ON u.user_id = o.seller_id
JOIN Reviews r ON r.order_id = o.order_id
WHERE o.status = 'Completed'
GROUP BY u.user_id, u.username, u.profile_pic_url
HAVING total_reviews >= 1
ORDER BY avg_rating DESC, total_reviews DESC
LIMIT 5;

-- VIEW: Category statistics
CREATE OR REPLACE VIEW Category_Stats AS
SELECT category,
       COUNT(*)              AS gig_count,
       ROUND(AVG(price), 2)  AS avg_price,
       MIN(price)            AS min_price,
       MAX(price)            AS max_price
FROM Gigs
WHERE is_active = 1
GROUP BY category;

-- VIEW: Monthly revenue
CREATE OR REPLACE VIEW Monthly_Revenue AS
SELECT
    YEAR(paid_at)  AS year,
    MONTH(paid_at) AS month,
    COUNT(*)       AS invoices_paid,
    SUM(amount)    AS total_revenue
FROM Invoices
WHERE status = 'Paid' AND paid_at IS NOT NULL
GROUP BY YEAR(paid_at), MONTH(paid_at)
ORDER BY year DESC, month DESC;
