const { Pool } = require('pg');
const p = new Pool({ user: 'postgres', password: '123456', host: 'localhost', port: 5433, database: 'webmeclibr' });

async function migrate() {
  try {
    await p.query("ALTER TABLE orders ADD COLUMN IF NOT EXISTS status VARCHAR(50) DEFAULT 'Pendiente'");
    console.log('Orders status column added');
  } catch (err) {
    console.error(err.message);
  } finally {
    await p.end();
  }
}

migrate();
