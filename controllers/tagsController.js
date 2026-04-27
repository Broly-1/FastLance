const pool = require('../db');

// GET all tags
exports.getAll = async (req, res) => {
  try {
    const [rows] = await pool.query('SELECT tag_id, name FROM Tags');
    res.json(rows);
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
};

// GET tag by id
exports.getById = async (req, res) => {
  try {
    const [rows] = await pool.query('SELECT tag_id, name FROM Tags WHERE tag_id = ?', [req.params.id]);
    if (rows.length === 0) return res.status(404).json({ error: 'Tag not found' });
    res.json(rows[0]);
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
};

// POST create tag
exports.create = async (req, res) => {
  try {
    const { name } = req.body;
    const userRole = req.headers['x-user-role'];

    if (userRole !== 'Admin') {
      return res.status(403).json({ error: 'Only admins can create tags' });
    }

    if (!name) return res.status(400).json({ error: 'Tag name is required' });

    const [result] = await pool.query(
      'INSERT INTO Tags (name) OUTPUT INSERTED.tag_id VALUES (?)',
      [name]
    );
    res.status(201).json({ message: 'Tag created', tag_id: result.insertId });
  } catch (err) {
    if (err.message && err.message.includes('UNIQUE KEY')) {
      return res.status(409).json({ error: 'Tag already exists' });
    }
    res.status(500).json({ error: err.message });
  }
};

// PUT update tag
exports.update = async (req, res) => {
  try {
    const { name } = req.body;
    const userRole = req.headers['x-user-role'];

    if (userRole !== 'Admin') {
      return res.status(403).json({ error: 'Only admins can update tags' });
    }

    if (!name) return res.status(400).json({ error: 'Tag name is required' });

    const [result] = await pool.query(
      'UPDATE Tags SET name = ? WHERE tag_id = ?',
      [name, req.params.id]
    );
    if (result.affectedRows === 0) return res.status(404).json({ error: 'Tag not found' });
    res.json({ message: 'Tag updated' });
  } catch (err) {
    if (err.message && err.message.includes('UNIQUE KEY')) {
      return res.status(409).json({ error: 'Tag name already exists' });
    }
    res.status(500).json({ error: err.message });
  }
};

// DELETE tag
exports.remove = async (req, res) => {
  try {
    const userRole = req.headers['x-user-role'];

    if (userRole !== 'Admin') {
      return res.status(403).json({ error: 'Only admins can delete tags' });
    }

    const [result] = await pool.query('DELETE FROM Tags WHERE tag_id = ?', [req.params.id]);
    if (result.affectedRows === 0) return res.status(404).json({ error: 'Tag not found' });
    res.json({ message: 'Tag deleted' });
  } catch (err) {
    if (err.message && (err.message.includes('REFERENCE constraint') || err.message.includes('FOREIGN KEY'))) {
        return res.status(409).json({ error: 'Cannot delete tag; it is currently attached to gigs' });
    }
    res.status(500).json({ error: err.message });
  }
};
