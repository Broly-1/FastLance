const pool = require('../db');

async function fixConstraint() {
  try {
    console.log('--- Database Constraint Fix ---');
    
    // 1. Find the name of the check constraint on the 'status' column of 'Milestones'
    const findConstraintSql = `
      SELECT name 
      FROM sys.check_constraints 
      WHERE parent_object_id = OBJECT_ID('Milestones') 
      AND definition LIKE '%status%'
    `;
    
    const [rows] = await pool.query(findConstraintSql);
    
    if (rows.length > 0) {
      for (const row of rows) {
        console.log(`Found constraint: ${row.name}. Dropping...`);
        await pool.query(`ALTER TABLE Milestones DROP CONSTRAINT ${row.name}`);
      }
    } else {
      console.log('No existing status constraint found (or already dropped).');
    }

    // 2. Add the new constraint with 'Delivered' included
    console.log('Adding new constraint with "Delivered" status...');
    const addConstraintSql = `
      ALTER TABLE Milestones 
      ADD CONSTRAINT CK_Milestone_Status 
      CHECK (status IN ('Pending', 'In Progress', 'Delivered', 'Completed', 'Overdue'))
    `;
    
    await pool.query(addConstraintSql);
    console.log('Success: Constraint updated.');
    
    process.exit(0);
  } catch (err) {
    console.error('Error fixing constraint:', err.message);
    process.exit(1);
  }
}

fixConstraint();
