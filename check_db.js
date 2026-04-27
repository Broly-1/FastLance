const pool = require('./db');
async function check() {
  const [txn] = await pool.query('SELECT * FROM Wallet_Transactions');
  console.log("Txn count:", txn.length);
  if (txn.length > 0) console.log(txn);
  process.exit(0);
}
check();
