const fs = require('fs');
const file = 'controllers/gigsController.js';
let code = fs.readFileSync(file, 'utf8');

const targetObj = `    if (existing.length > 0) {
      tag_id = existing[0].tag_id;
    } else {
      const [result] = await pool.query('INSERT INTO Tags (name) OUTPUT INSERTED.tag_id VALUES (?)', [name]);
      tag_id = result.insertId;
    }`;

const replaceObj = `    if (existing.length > 0) {
      tag_id = existing[0].tag_id;
    } else {
      return res.status(404).json({ error: 'Tag not found' });
    }`;

code = code.replace(targetObj, replaceObj);
fs.writeFileSync(file, code);
console.log("Patched controllers/gigsController.js");
