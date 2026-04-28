-- 1. USERS: One table for both Buyers and Sellers
CREATE TABLE Users (
    user_id       INT PRIMARY KEY AUTO_INCREMENT,
    username      VARCHAR(50) UNIQUE NOT NULL,
    email         VARCHAR(100) UNIQUE NOT NULL,
    password_hash VARCHAR(255) NOT NULL,
    role          ENUM('Buyer', 'Seller', 'Both') NOT NULL DEFAULT 'Buyer',
    bio           TEXT,
    profile_pic_url VARCHAR(255),
    wallet_balance  DECIMAL(12, 2) DEFAULT 0.00,
    is_active     BOOLEAN DEFAULT TRUE,
    created_at    TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    updated_at    TIMESTAMP DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP
);

-- 2. GIGS: Services offered by Sellers
CREATE TABLE Gigs (
    gig_id        INT PRIMARY KEY AUTO_INCREMENT,
    seller_id     INT NOT NULL,
    title         VARCHAR(150) NOT NULL,
    description   TEXT NOT NULL,
    category      ENUM('Graphics', 'Programming', 'Writing', 'Video', 'Marketing') NOT NULL,
    price         DECIMAL(10, 2) NOT NULL,
    delivery_days INT NOT NULL,
    revision_limit INT NOT NULL DEFAULT 1,       -- max free revisions included
    thumbnail_url VARCHAR(255),
    is_active     BOOLEAN DEFAULT TRUE,
    created_at    TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    updated_at    TIMESTAMP DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
    CONSTRAINT fk_gig_seller FOREIGN KEY (seller_id)
        REFERENCES Users(user_id) ON DELETE CASCADE
);

-- 2a. GIG_IMAGES: Multiple showcase images per gig
CREATE TABLE Gig_Images (
    image_id  INT PRIMARY KEY AUTO_INCREMENT,
    gig_id    INT NOT NULL,
    image_url VARCHAR(255) NOT NULL,
    sort_order TINYINT DEFAULT 0,
    CONSTRAINT fk_gi_gig FOREIGN KEY (gig_id)
        REFERENCES Gigs(gig_id) ON DELETE CASCADE
);

-- 2b. TAGS + GIG_TAGS: Flexible keyword tagging for search
CREATE TABLE Tags (
    tag_id INT PRIMARY KEY AUTO_INCREMENT,
    name   VARCHAR(50) UNIQUE NOT NULL
);

CREATE TABLE Gig_Tags (
    gig_id INT NOT NULL,
    tag_id INT NOT NULL,
    PRIMARY KEY (gig_id, tag_id),
    CONSTRAINT fk_gt_gig FOREIGN KEY (gig_id) REFERENCES Gigs(gig_id) ON DELETE CASCADE,
    CONSTRAINT fk_gt_tag FOREIGN KEY (tag_id) REFERENCES Tags(tag_id)  ON DELETE CASCADE
);

-- 3. ORDERS: Transactions between Buyers and Gigs
CREATE TABLE Orders (
    order_id        INT PRIMARY KEY AUTO_INCREMENT,
    gig_id          INT NOT NULL,
    buyer_id        INT NOT NULL,
    seller_id       INT NOT NULL,               -- denormalized for fast seller-side queries
    total_price     DECIMAL(10, 2) NOT NULL,
    status          ENUM('Pending', 'In Progress', 'Delivered', 'Completed', 'Cancelled', 'Disputed') DEFAULT 'Pending',
    revision_number TINYINT DEFAULT 0,           -- tracks how many revisions have been requested
    order_date      TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    deadline        DATETIME,
    updated_at      TIMESTAMP DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
    CONSTRAINT fk_order_gig    FOREIGN KEY (gig_id)    REFERENCES Gigs(gig_id)   ON DELETE RESTRICT,
    CONSTRAINT fk_order_buyer  FOREIGN KEY (buyer_id)  REFERENCES Users(user_id) ON DELETE RESTRICT,
    CONSTRAINT fk_order_seller FOREIGN KEY (seller_id) REFERENCES Users(user_id) ON DELETE RESTRICT
);

-- 4. ORDER_SUBMISSIONS: File uploads/deliveries for an order
CREATE TABLE Order_Submissions (
    submission_id INT PRIMARY KEY AUTO_INCREMENT,
    order_id      INT NOT NULL,
    submitted_by  INT NOT NULL,                  -- seller who submitted the work
    file_url      VARCHAR(255) NOT NULL,
    message       TEXT,
    is_revision   BOOLEAN DEFAULT FALSE,         -- TRUE if this is a revision delivery
    submitted_at  TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    CONSTRAINT fk_submission_order     FOREIGN KEY (order_id)     REFERENCES Orders(order_id) ON DELETE CASCADE,
    CONSTRAINT fk_submission_submitter FOREIGN KEY (submitted_by) REFERENCES Users(user_id)  ON DELETE RESTRICT
);

-- 5. REVIEWS: Feedback loop (1 review per order)
CREATE TABLE Reviews (
    review_id   INT PRIMARY KEY AUTO_INCREMENT,
    order_id    INT UNIQUE NOT NULL,
    reviewer_id INT NOT NULL,
    rating      TINYINT CHECK (rating BETWEEN 1 AND 5),
    comment     TEXT,
    seller_reply TEXT,                           -- seller's public response to the review
    created_at  TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    updated_at  TIMESTAMP DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
    CONSTRAINT fk_review_order    FOREIGN KEY (order_id)    REFERENCES Orders(order_id) ON DELETE CASCADE,
    CONSTRAINT fk_review_reviewer FOREIGN KEY (reviewer_id) REFERENCES Users(user_id)  ON DELETE CASCADE
);

-- 6. MESSAGES: 1-on-1 communication
CREATE TABLE Messages (
    message_id   INT PRIMARY KEY AUTO_INCREMENT,
    sender_id    INT NOT NULL,
    receiver_id  INT NOT NULL,
    order_id     INT,                            -- optional: tie conversation to an order
    content      TEXT NOT NULL,
    message_type ENUM('Text', 'File', 'System') DEFAULT 'Text',
    sent_at      TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    is_read      BOOLEAN DEFAULT FALSE,
    CONSTRAINT fk_msg_sender   FOREIGN KEY (sender_id)   REFERENCES Users(user_id)   ON DELETE CASCADE,
    CONSTRAINT fk_msg_receiver FOREIGN KEY (receiver_id) REFERENCES Users(user_id)   ON DELETE CASCADE,
    CONSTRAINT fk_msg_order    FOREIGN KEY (order_id)    REFERENCES Orders(order_id) ON DELETE SET NULL
);

-- 7. MILESTONES: Breakdown of order progress
CREATE TABLE Milestones (
    milestone_id     INT PRIMARY KEY AUTO_INCREMENT,
    order_id         INT NOT NULL,
    title            VARCHAR(150) NOT NULL,
    description      TEXT,
    deadline         DATETIME NOT NULL,
    amount           DECIMAL(10, 2),             -- payment tied to this milestone
    status           ENUM('Pending', 'In Progress', 'Delivered', 'Completed', 'Overdue') DEFAULT 'Pending',
    is_critical_path BOOLEAN DEFAULT FALSE,
    completed_at     DATETIME,
    CONSTRAINT fk_milestone_order FOREIGN KEY (order_id)
        REFERENCES Orders(order_id) ON DELETE CASCADE
);

-- 8. INVOICES: Professional financial tracking
CREATE TABLE Invoices (
    invoice_id   INT PRIMARY KEY AUTO_INCREMENT,
    order_id     INT NOT NULL,
    milestone_id INT,
    amount       DECIMAL(10, 2) NOT NULL,
    status       ENUM('Pending', 'Paid', 'Overdue') DEFAULT 'Pending',
    issued_date  DATE NOT NULL DEFAULT (CURRENT_DATE),
    due_date     DATE NOT NULL,
    paid_at      TIMESTAMP NULL,                -- populated when status flips to 'Paid'
    CONSTRAINT fk_inv_order     FOREIGN KEY (order_id)     REFERENCES Orders(order_id)          ON DELETE CASCADE,
    CONSTRAINT fk_inv_milestone FOREIGN KEY (milestone_id) REFERENCES Milestones(milestone_id) ON DELETE SET NULL
);

-- 9. WALLET_TRANSACTIONS: Immutable ledger for every wallet movement
CREATE TABLE Wallet_Transactions (
    txn_id      INT PRIMARY KEY AUTO_INCREMENT,
    user_id     INT NOT NULL,
    order_id    INT,
    amount      DECIMAL(12, 2) NOT NULL,         -- positive = credit, negative = debit
    type        ENUM('TopUp', 'OrderPayment', 'Refund', 'Withdrawal', 'Earning') NOT NULL,
    description VARCHAR(255),
    created_at  TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    CONSTRAINT fk_wt_user  FOREIGN KEY (user_id)  REFERENCES Users(user_id)   ON DELETE CASCADE,
    CONSTRAINT fk_wt_order FOREIGN KEY (order_id) REFERENCES Orders(order_id) ON DELETE SET NULL
);

-- 10. DISPUTES: Formal conflict resolution between buyers and sellers
CREATE TABLE Disputes (
    dispute_id  INT PRIMARY KEY AUTO_INCREMENT,
    order_id    INT NOT NULL,
    raised_by   INT NOT NULL,
    reason      TEXT NOT NULL,
    status      ENUM('Open', 'Under Review', 'Resolved', 'Escalated') DEFAULT 'Open',
    resolution  TEXT,
    created_at  TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    resolved_at TIMESTAMP NULL,
    CONSTRAINT fk_dispute_order    FOREIGN KEY (order_id)  REFERENCES Orders(order_id) ON DELETE CASCADE,
    CONSTRAINT fk_dispute_raiser   FOREIGN KEY (raised_by) REFERENCES Users(user_id)  ON DELETE CASCADE
);

-- 11. NOTIFICATIONS: In-app alerts for users
CREATE TABLE Notifications (
    notification_id INT PRIMARY KEY AUTO_INCREMENT,
    user_id         INT NOT NULL,
    type            ENUM('Order', 'Message', 'Review', 'Payment', 'Dispute', 'System') NOT NULL,
    title           VARCHAR(150) NOT NULL,
    body            TEXT,
    is_read         BOOLEAN DEFAULT FALSE,
    created_at      TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    CONSTRAINT fk_notif_user FOREIGN KEY (user_id) REFERENCES Users(user_id) ON DELETE CASCADE
);

-- 12. INDEXES: Improve query performance on common lookups
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

-- 13. REPORTING: Summary report & profitability
CREATE VIEW Profitability_Report AS
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