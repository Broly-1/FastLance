const sql = require('mssql');
require('dotenv').config();

const config = {
  server: process.env.DB_HOST || 'localhost',
  database: process.env.DB_NAME,
  // If DB_USER is set use SQL login, otherwise fall back to Windows Auth
  ...(process.env.DB_USER
    ? { user: process.env.DB_USER, password: process.env.DB_PASSWORD }
    : {}),
  options: {
    encrypt: process.env.DB_ENCRYPT === 'true',
    trustServerCertificate: true,
    enableArithAbort: true,
    trustedConnection: !process.env.DB_USER, // Windows Auth when no user set
  },
  pool: { max: 10, min: 0, idleTimeoutMillis: 30000 },
};

const poolPromise = sql.connect(config);

// ---------------------------------------------------------------------------
// executeQuery — shared by both pool-level and transaction-level calls
// Converts ? placeholders → @p0, @p1, …
// Returns [rows, meta] for SELECT, [meta, rows] for INSERT/UPDATE/DELETE
// so that controllers can keep the same destructuring patterns they had
// with mysql2.  meta = { affectedRows, insertId }
// ---------------------------------------------------------------------------
async function executeQuery(source, sqlText, params = []) {
  let request;
  if (source instanceof sql.Transaction) {
    request = new sql.Request(source);
  } else {
    request = source.request();
  }

  let i = 0;
  const converted = sqlText.replace(/\?/g, () => {
    const name = `p${i}`;
    request.input(name, params[i]);
    i++;
    return `@${name}`;
  });

  const result = await request.query(converted);
  const rows = result.recordset || [];
  const meta = {
    affectedRows: result.rowsAffected ? result.rowsAffected[0] : 0,
    // For INSERT … OUTPUT INSERTED.xxx the first column of the first row is the new id
    insertId: rows.length > 0 ? rows[0][Object.keys(rows[0])[0]] : undefined,
  };

  const isSelect = /^\s*select/i.test(sqlText.trim());
  return isSelect ? [rows, meta] : [meta, rows];
}

// pool-level query (used by every controller as pool.query)
async function query(sqlText, params = []) {
  const pool = await poolPromise;
  return executeQuery(pool, sqlText, params);
}

// transaction helper — mirrors mysql2's pool.getConnection() pattern
async function getConnection() {
  const pool = await poolPromise;
  const transaction = new sql.Transaction(pool);
  await transaction.begin();
  return {
    query:            (sqlText, params = []) => executeQuery(transaction, sqlText, params),
    beginTransaction: async () => {},           // already begun
    commit:           () => transaction.commit(),
    rollback:         () => transaction.rollback(),
    release:          () => {},                 // no-op — mssql manages the pool
  };
}

module.exports = { query, getConnection };
