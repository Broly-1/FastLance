-- ================================================================
-- FREELANCE PLATFORM - SQL SERVER SCHEMA (T-SQL)
-- Converted from MySQL. Run this file to create all tables/views.
-- ================================================================

-- Create the database (run this once, then connect to it)
-- CREATE DATABASE freelance_db;
-- GO
-- USE freelance_db;
-- GO

-- Existing local database upgrade note:
-- If Order_Submissions already exists from an earlier version,
-- run this once before testing revision requests:
-- ALTER TABLE Order_Submissions ALTER COLUMN file_url NVARCHAR(255) NULL;

-- ================================================================
-- TABLES
-- ================================================================

-- 1. USERS
CREATE TABLE Users (
    user_id         INT PRIMARY KEY IDENTITY(1,1),
    username        NVARCHAR(50)  UNIQUE NOT NULL,
    email           NVARCHAR(100) UNIQUE NOT NULL,
    password_hash   NVARCHAR(255) NOT NULL,
    role            NVARCHAR(10)  NOT NULL DEFAULT 'Buyer'
                        CHECK (role IN ('Buyer','Seller','Both','Admin')),
    bio             NVARCHAR(MAX),
    profile_pic_url NVARCHAR(255),
    wallet_balance  DECIMAL(12,2) DEFAULT 0.00,
    is_active       BIT           DEFAULT 1,
    created_at      DATETIME2     DEFAULT GETDATE(),
    updated_at      DATETIME2     DEFAULT GETDATE()
);
GO

-- 2. GIGS
CREATE TABLE Gigs (
    gig_id          INT PRIMARY KEY IDENTITY(1,1),
    seller_id       INT NOT NULL,
    title           NVARCHAR(150) NOT NULL,
    description     NVARCHAR(MAX) NOT NULL,
    category        NVARCHAR(20)  NOT NULL
                        CHECK (category IN ('Graphics','Programming','Writing','Video','Marketing')),
    price           DECIMAL(10,2) NOT NULL,
    delivery_days   INT NOT NULL,
    revision_limit  INT NOT NULL DEFAULT 1,
    thumbnail_url   NVARCHAR(255),
    is_active       BIT           DEFAULT 1,
    created_at      DATETIME2     DEFAULT GETDATE(),
    updated_at      DATETIME2     DEFAULT GETDATE(),
    CONSTRAINT fk_gig_seller FOREIGN KEY (seller_id)
        REFERENCES Users(user_id) ON DELETE CASCADE
);
GO

-- 2a. GIG IMAGES
CREATE TABLE Gig_Images (
    image_id   INT PRIMARY KEY IDENTITY(1,1),
    gig_id     INT NOT NULL,
    image_url  NVARCHAR(255) NOT NULL,
    sort_order TINYINT DEFAULT 0,
    CONSTRAINT fk_gi_gig FOREIGN KEY (gig_id)
        REFERENCES Gigs(gig_id) ON DELETE CASCADE
);
GO

-- 2b. TAGS
CREATE TABLE Tags (
    tag_id INT PRIMARY KEY IDENTITY(1,1),
    name   NVARCHAR(50) UNIQUE NOT NULL
);
GO

-- 2c. GIG_TAGS
CREATE TABLE Gig_Tags (
    gig_id INT NOT NULL,
    tag_id INT NOT NULL,
    PRIMARY KEY (gig_id, tag_id),
    CONSTRAINT fk_gt_gig FOREIGN KEY (gig_id) REFERENCES Gigs(gig_id)  ON DELETE CASCADE,
    CONSTRAINT fk_gt_tag FOREIGN KEY (tag_id) REFERENCES Tags(tag_id)  ON DELETE CASCADE
);
GO

-- 3. ORDERS
CREATE TABLE Orders (
    order_id        INT PRIMARY KEY IDENTITY(1,1),
    gig_id          INT NOT NULL,
    buyer_id        INT NOT NULL,
    seller_id       INT NOT NULL,
    total_price     DECIMAL(10,2) NOT NULL,
    status          NVARCHAR(20) DEFAULT 'Pending'
                        CHECK (status IN ('Pending','In Progress','Delivered','Completed','Cancelled','Disputed')),
    revision_number TINYINT DEFAULT 0,
    order_date      DATETIME2    DEFAULT GETDATE(),
    deadline        DATETIME2,
    updated_at      DATETIME2    DEFAULT GETDATE(),
    CONSTRAINT fk_order_gig    FOREIGN KEY (gig_id)    REFERENCES Gigs(gig_id)   ON DELETE NO ACTION,
    CONSTRAINT fk_order_buyer  FOREIGN KEY (buyer_id)  REFERENCES Users(user_id) ON DELETE NO ACTION,
    CONSTRAINT fk_order_seller FOREIGN KEY (seller_id) REFERENCES Users(user_id) ON DELETE NO ACTION
);
GO

-- 4. ORDER_SUBMISSIONS
CREATE TABLE Order_Submissions (
    submission_id INT PRIMARY KEY IDENTITY(1,1),
    order_id      INT NOT NULL,
    submitted_by  INT NOT NULL,
    file_url      NVARCHAR(255) NULL,
    message       NVARCHAR(MAX),
    is_revision   BIT       DEFAULT 0,
    submitted_at  DATETIME2 DEFAULT GETDATE(),
    CONSTRAINT fk_submission_order     FOREIGN KEY (order_id)     REFERENCES Orders(order_id) ON DELETE CASCADE,
    CONSTRAINT fk_submission_submitter FOREIGN KEY (submitted_by) REFERENCES Users(user_id)  ON DELETE NO ACTION
);
GO

-- 5. REVIEWS
CREATE TABLE Reviews (
    review_id    INT PRIMARY KEY IDENTITY(1,1),
    order_id     INT UNIQUE NOT NULL,
    reviewer_id  INT NOT NULL,
    rating       TINYINT CHECK (rating BETWEEN 1 AND 5),
    comment      NVARCHAR(MAX),
    seller_reply NVARCHAR(MAX),
    created_at   DATETIME2 DEFAULT GETDATE(),
    updated_at   DATETIME2 DEFAULT GETDATE(),
    CONSTRAINT fk_review_order    FOREIGN KEY (order_id)    REFERENCES Orders(order_id) ON DELETE CASCADE,
    CONSTRAINT fk_review_reviewer FOREIGN KEY (reviewer_id) REFERENCES Users(user_id)  ON DELETE NO ACTION
);
GO

-- 6. MESSAGES
CREATE TABLE Messages (
    message_id   INT PRIMARY KEY IDENTITY(1,1),
    sender_id    INT NOT NULL,
    receiver_id  INT NOT NULL,
    order_id     INT,
    content      NVARCHAR(MAX) NOT NULL,
    message_type NVARCHAR(10) DEFAULT 'Text'
                     CHECK (message_type IN ('Text','File','System')),
    sent_at      DATETIME2 DEFAULT GETDATE(),
    is_read      BIT DEFAULT 0,
    CONSTRAINT fk_msg_sender   FOREIGN KEY (sender_id)   REFERENCES Users(user_id)   ON DELETE NO ACTION,
    CONSTRAINT fk_msg_receiver FOREIGN KEY (receiver_id) REFERENCES Users(user_id)   ON DELETE NO ACTION,
    CONSTRAINT fk_msg_order    FOREIGN KEY (order_id)    REFERENCES Orders(order_id) ON DELETE SET NULL
);
GO

-- 7. MILESTONES
CREATE TABLE Milestones (
    milestone_id     INT PRIMARY KEY IDENTITY(1,1),
    order_id         INT NOT NULL,
    title            NVARCHAR(150) NOT NULL,
    description      NVARCHAR(MAX),
    deadline         DATETIME2 NOT NULL,
    amount           DECIMAL(10,2),
    status           NVARCHAR(20) DEFAULT 'Pending'
                         CHECK (status IN ('Pending','In Progress','Completed','Overdue')),
    is_critical_path BIT DEFAULT 0,
    completed_at     DATETIME2,
    CONSTRAINT fk_milestone_order FOREIGN KEY (order_id)
        REFERENCES Orders(order_id) ON DELETE CASCADE
);
GO

-- 8. INVOICES
CREATE TABLE Invoices (
    invoice_id   INT PRIMARY KEY IDENTITY(1,1),
    order_id     INT NOT NULL,
    milestone_id INT,
    amount       DECIMAL(10,2) NOT NULL,
    status       NVARCHAR(10) DEFAULT 'Pending'
                     CHECK (status IN ('Pending','Paid','Overdue')),
    issued_date  DATE     NOT NULL DEFAULT CAST(GETDATE() AS DATE),
    due_date     DATE     NOT NULL,
    paid_at      DATETIME2 NULL,
    CONSTRAINT fk_inv_order     FOREIGN KEY (order_id)     REFERENCES Orders(order_id)         ON DELETE CASCADE,
    CONSTRAINT fk_inv_milestone FOREIGN KEY (milestone_id) REFERENCES Milestones(milestone_id) ON DELETE NO ACTION
);
GO

-- 9. WALLET_TRANSACTIONS
CREATE TABLE Wallet_Transactions (
    txn_id      INT PRIMARY KEY IDENTITY(1,1),
    user_id     INT NOT NULL,
    order_id    INT,
    amount      DECIMAL(12,2) NOT NULL,
    type        NVARCHAR(20) NOT NULL
                    CHECK (type IN ('TopUp','OrderPayment','Refund','Withdrawal','Earning')),
    description NVARCHAR(255),
    created_at  DATETIME2 DEFAULT GETDATE(),
    CONSTRAINT fk_wt_user  FOREIGN KEY (user_id)  REFERENCES Users(user_id)   ON DELETE CASCADE,
    CONSTRAINT fk_wt_order FOREIGN KEY (order_id) REFERENCES Orders(order_id) ON DELETE SET NULL
);
GO

-- 10. DISPUTES
CREATE TABLE Disputes (
    dispute_id  INT PRIMARY KEY IDENTITY(1,1),
    order_id    INT NOT NULL,
    raised_by   INT NOT NULL,
    reason      NVARCHAR(MAX) NOT NULL,
    status      NVARCHAR(20) DEFAULT 'Open'
                    CHECK (status IN ('Open','Under Review','Resolved','Escalated')),
    resolution  NVARCHAR(MAX),
    created_at  DATETIME2 DEFAULT GETDATE(),
    resolved_at DATETIME2 NULL,
    CONSTRAINT fk_dispute_order  FOREIGN KEY (order_id)  REFERENCES Orders(order_id) ON DELETE CASCADE,
    CONSTRAINT fk_dispute_raiser FOREIGN KEY (raised_by) REFERENCES Users(user_id)  ON DELETE NO ACTION
);
GO

-- 11. NOTIFICATIONS
CREATE TABLE Notifications (
    notification_id INT PRIMARY KEY IDENTITY(1,1),
    user_id         INT NOT NULL,
    type            NVARCHAR(20) NOT NULL
                        CHECK (type IN ('Order','Message','Review','Payment','Dispute','System')),
    title           NVARCHAR(150) NOT NULL,
    body            NVARCHAR(MAX),
    is_read         BIT DEFAULT 0,
    created_at      DATETIME2 DEFAULT GETDATE(),
    CONSTRAINT fk_notif_user FOREIGN KEY (user_id) REFERENCES Users(user_id) ON DELETE CASCADE
);
GO

-- ================================================================
-- INDEXES
-- ================================================================
CREATE INDEX idx_gigs_seller       ON Gigs(seller_id);
CREATE INDEX idx_gigs_category     ON Gigs(category);
CREATE INDEX idx_orders_buyer      ON Orders(buyer_id);
CREATE INDEX idx_orders_seller     ON Orders(seller_id);
CREATE INDEX idx_orders_status     ON Orders(status);
CREATE INDEX idx_messages_sender   ON Messages(sender_id);
CREATE INDEX idx_messages_receiver ON Messages(receiver_id);
CREATE INDEX idx_notif_user        ON Notifications(user_id, is_read);
CREATE INDEX idx_wt_user           ON Wallet_Transactions(user_id);
CREATE INDEX idx_reviews_reviewer  ON Reviews(reviewer_id);
GO

-- ================================================================
-- VIEWS
-- ================================================================

-- Profitability report view
CREATE OR ALTER VIEW Profitability_Report AS
SELECT
    o.order_id,
    o.order_date,
    o.status,
    g.title           AS gig_title,
    g.category,
    seller.username   AS seller,
    buyer.username    AS client,
    o.total_price     AS contract_value,
    COALESCE(
        (SELECT SUM(amount) FROM Invoices WHERE order_id = o.order_id AND status = 'Paid'),
        0.00
    )                 AS revenue_collected,
    o.total_price - COALESCE(
        (SELECT SUM(amount) FROM Invoices WHERE order_id = o.order_id AND status = 'Paid'),
        0.00
    )                 AS outstanding_balance,
    AVG(r.rating)     AS avg_rating
FROM Orders o
JOIN Gigs  g      ON o.gig_id    = g.gig_id
JOIN Users seller ON o.seller_id = seller.user_id
JOIN Users buyer  ON o.buyer_id  = buyer.user_id
LEFT JOIN Reviews r ON r.order_id = o.order_id
WHERE o.status != 'Cancelled'
GROUP BY
    o.order_id, o.order_date, o.status,
    g.title, g.category,
    seller.username, buyer.username,
    o.total_price;
GO

-- Top sellers view
CREATE OR ALTER VIEW Top_Sellers AS
SELECT TOP 5
    u.user_id, u.username, u.profile_pic_url,
    COUNT(DISTINCT o.order_id) AS total_orders,
    ROUND(AVG(CAST(r.rating AS FLOAT)), 2) AS avg_rating,
    COUNT(r.review_id) AS total_reviews
FROM Users u
JOIN Orders o  ON u.user_id   = o.seller_id
JOIN Reviews r ON r.order_id  = o.order_id
WHERE o.status = 'Completed'
GROUP BY u.user_id, u.username, u.profile_pic_url
HAVING COUNT(r.review_id) >= 1
ORDER BY avg_rating DESC, total_reviews DESC;
GO

-- Category stats view
CREATE OR ALTER VIEW Category_Stats AS
SELECT
    category,
    COUNT(*)              AS gig_count,
    ROUND(AVG(price), 2)  AS avg_price,
    MIN(price)            AS min_price,
    MAX(price)            AS max_price
FROM Gigs
WHERE is_active = 1
GROUP BY category;
GO

-- Monthly revenue view
CREATE OR ALTER VIEW Monthly_Revenue AS
SELECT
    YEAR(paid_at)  AS year,
    MONTH(paid_at) AS month,
    COUNT(*)       AS invoices_paid,
    SUM(amount)    AS total_revenue
FROM Invoices
WHERE status = 'Paid' AND paid_at IS NOT NULL
GROUP BY YEAR(paid_at), MONTH(paid_at);
GO
