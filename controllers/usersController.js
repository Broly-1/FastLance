const pool = require('../db');

// GET all users (Admin only)
exports.getAll = async (req, res) => {
  try {
    const userRole = req.headers['x-user-role'];
    if (userRole !== 'Admin') {
      return res.status(403).json({ error: 'Only admins can list all users' });
    }
    const [rows] = await pool.query(
      'SELECT user_id, username, email, role, bio, profile_pic_url, wallet_balance, is_active, created_at, updated_at FROM Users'
    );
    res.json(rows);
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
};

// GET user by ID
exports.getById = async (req, res) => {
  try {
    const [rows] = await pool.query(
      'SELECT user_id, username, email, role, bio, profile_pic_url, wallet_balance, is_active, created_at, updated_at FROM Users WHERE user_id = ?',
      [req.params.id]
    );
    if (rows.length === 0) return res.status(404).json({ error: 'User not found' });
    res.json(rows[0]);
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
};

// POST create user
exports.create = async (req, res) => {
  try {
    const { username, email, password, role, bio, profile_pic_url } = req.body;
    
    const [result] = await pool.query(
      'INSERT INTO Users (username, email, password_hash, role, bio, profile_pic_url) VALUES (?, ?, ?, ?, ?, ?)',
      [username, email, password, role || 'Buyer', bio || null, profile_pic_url || null]
    );
    res.status(201).json({ message: 'User created', user_id: result.insertId });
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
};

// POST update user (or PUT)
exports.update = async (req, res) => {
  try {
    const { username, email, bio, profile_pic_url, role, is_active } = req.body;
    const [result] = await pool.query(
      'UPDATE Users SET username = COALESCE(?, username), email = COALESCE(?, email), bio = COALESCE(?, bio), profile_pic_url = COALESCE(?, profile_pic_url), role = COALESCE(?, role), is_active = COALESCE(?, is_active) WHERE user_id = ?',
      [username, email, bio, profile_pic_url, role, is_active !== undefined ? (is_active ? 1 : 0) : undefined, req.params.id]
    );
    if (result.affectedRows === 0) return res.status(404).json({ error: 'User not found' });
    res.json({ message: 'User updated' });
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
};

// POST login user
exports.login = async (req, res) => {
  try {
    const { email, password } = req.body;
    
    const [rows] = await pool.query(
      'SELECT user_id, username, email, role, is_active, profile_pic_url FROM Users WHERE email = ? AND password_hash = ?',
      [email, password]
    );

    if (rows.length === 0) {
      return res.status(401).json({ error: 'Invalid email or password' });
    }

    const user = rows[0];

    // Check if user is active or banned
    if (!user.is_active) {
      return res.status(403).json({ error: 'Account is suspended or banned' });
    }

    // You can later add JSON Web Token (JWT) here
    res.json({ 
      message: 'Login successful', 
      user: {
        id: user.user_id,
        username: user.username,
        email: user.email,
        role: user.role,
        profile_pic_url: user.profile_pic_url
      } 
    });

  } catch (err) {
    res.status(500).json({ error: err.message });
  }
};

// DELETE user
exports.remove = async (req, res) => {
  try {
    const [result] = await pool.query('DELETE FROM Users WHERE user_id = ?', [req.params.id]);
    if (result.affectedRows === 0) return res.status(404).json({ error: 'User not found' });
    res.json({ message: 'User deleted' });
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
};

// POST suspend user
exports.suspend = async (req, res) => {
  try {
    const [result] = await pool.query(
      'UPDATE Users SET is_active = 0 WHERE user_id = ?',
      [req.params.id]
    );
    if (result.affectedRows === 0) return res.status(404).json({ error: 'User not found' });
    res.json({ message: 'User suspended successfully' });
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
};

// POST activate user
exports.activate = async (req, res) => {
  try {
    const [result] = await pool.query(
      'UPDATE Users SET is_active = 1 WHERE user_id = ?',
      [req.params.id]
    );
    if (result.affectedRows === 0) return res.status(404).json({ error: 'User not found' });
    res.json({ message: 'User activated successfully' });
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
};
