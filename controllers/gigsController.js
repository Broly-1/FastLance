const pool = require('../db');

// GET all active gigs (with seller name)
exports.getAll = async (req, res) => {
  try {
    const [rows] = await pool.query(
      `SELECT g.*, u.username AS seller_name
       FROM Gigs g JOIN Users u ON g.seller_id = u.user_id
       WHERE g.is_active = 1
       ORDER BY g.created_at DESC`
    );
    res.json(rows);
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
};

// GET gig by ID (includes images and tags)
exports.getById = async (req, res) => {
  try {
    const id = req.params.id;
    const [[gig], [images], [tags]] = await Promise.all([
      pool.query(
        `SELECT g.*, u.username AS seller_name
         FROM Gigs g JOIN Users u ON g.seller_id = u.user_id
         WHERE g.gig_id = ?`, [id]
      ),
      pool.query('SELECT * FROM Gig_Images WHERE gig_id = ? ORDER BY sort_order', [id]),
      pool.query(
        `SELECT t.tag_id, t.name FROM Tags t
         JOIN Gig_Tags gt ON t.tag_id = gt.tag_id
         WHERE gt.gig_id = ?`, [id]
      ),
    ]);
    if (gig.length === 0) return res.status(404).json({ error: 'Gig not found' });
    res.json({ ...gig[0], images, tags });
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
};

// GET gigs by category
exports.getByCategory = async (req, res) => {
  try {
    const [rows] = await pool.query(
      `SELECT g.*, u.username AS seller_name
       FROM Gigs g JOIN Users u ON g.seller_id = u.user_id
       WHERE g.category = ? AND g.is_active = 1`,
      [req.params.category]
    );
    res.json(rows);
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
};

// GET gigs by seller
exports.getBySeller = async (req, res) => {
  try {
    const [rows] = await pool.query(
      'SELECT * FROM Gigs WHERE seller_id = ?',
      [req.params.sellerId]
    );
    res.json(rows);
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
};

// POST create gig
exports.create = async (req, res) => {
  try {
    const { seller_id, title, description, category, price, delivery_days, revision_limit, thumbnail_url } = req.body;
    const [result] = await pool.query(
      'INSERT INTO Gigs (seller_id, title, description, category, price, delivery_days, revision_limit, thumbnail_url) OUTPUT INSERTED.gig_id VALUES (?, ?, ?, ?, ?, ?, ?, ?)',
      [seller_id, title, description, category, price, delivery_days, revision_limit || 1, thumbnail_url || null]
    );
    res.status(201).json({ message: 'Gig created', gig_id: result.insertId });
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
};

// PUT update gig
exports.update = async (req, res) => {
  try {
    const { title, description, category, price, delivery_days, revision_limit, thumbnail_url, is_active } = req.body;
    const [result] = await pool.query(
      `UPDATE Gigs SET title = COALESCE(?, title), description = COALESCE(?, description),
       category = COALESCE(?, category), price = COALESCE(?, price),
       delivery_days = COALESCE(?, delivery_days), revision_limit = COALESCE(?, revision_limit),
       thumbnail_url = COALESCE(?, thumbnail_url), is_active = COALESCE(?, is_active)
       WHERE gig_id = ?`,
      [title, description, category, price, delivery_days, revision_limit, thumbnail_url, is_active, req.params.id]
    );
    if (result.affectedRows === 0) return res.status(404).json({ error: 'Gig not found' });
    res.json({ message: 'Gig updated' });
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
};

// DELETE gig
exports.remove = async (req, res) => {
  try {
    const [result] = await pool.query('DELETE FROM Gigs WHERE gig_id = ?', [req.params.id]);
    if (result.affectedRows === 0) return res.status(404).json({ error: 'Gig not found' });
    res.json({ message: 'Gig deleted' });
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
};

// POST add image to gig
exports.addImage = async (req, res) => {
  try {
    const { image_url, sort_order } = req.body;
    const [result] = await pool.query(
      'INSERT INTO Gig_Images (gig_id, image_url, sort_order) OUTPUT INSERTED.image_id VALUES (?, ?, ?)',
      [req.params.id, image_url, sort_order || 0]
    );
    res.status(201).json({ message: 'Image added', image_id: result.insertId });
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
};

// POST add tag to gig
exports.addTag = async (req, res) => {
  try {
    const { name } = req.body;
    // Insert tag if not exists, then link
    const [existing] = await pool.query('SELECT tag_id FROM Tags WHERE name = ?', [name]);
    let tag_id;
    if (existing.length > 0) {
      tag_id = existing[0].tag_id;
    } else {
      const [result] = await pool.query('INSERT INTO Tags (name) OUTPUT INSERTED.tag_id VALUES (?)', [name]);
      tag_id = result.insertId;
    }
    // Use MERGE to avoid duplicate key errors (SQL Server equivalent of INSERT IGNORE)
    await pool.query(
      `MERGE Gig_Tags AS target
       USING (SELECT ? AS gig_id, ? AS tag_id) AS src ON target.gig_id = src.gig_id AND target.tag_id = src.tag_id
       WHEN NOT MATCHED THEN INSERT (gig_id, tag_id) VALUES (src.gig_id, src.tag_id);`,
      [req.params.id, tag_id]
    );
    res.status(201).json({ message: 'Tag added', tag_id });
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
};

// Search gigs by keyword
exports.search = async (req, res) => {
  try {
    const { q } = req.query;
    const keyword = `%${q}%`;
    const [rows] = await pool.query(
      `SELECT g.*, u.username AS seller_name
       FROM Gigs g JOIN Users u ON g.seller_id = u.user_id
       WHERE g.is_active = 1 AND (g.title LIKE ? OR g.description LIKE ?)
       ORDER BY g.created_at DESC`,
      [keyword, keyword]
    );
    res.json(rows);
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
};
