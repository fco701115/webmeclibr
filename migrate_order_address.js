const { Pool } = require('pg');
const p = new Pool({ user: 'postgres', password: '123456', host: 'localhost', port: 5433, database: 'webmeclibr' });

async function migrate() {
  try {
    await p.query("ALTER TABLE orders ADD COLUMN IF NOT EXISTS address_type VARCHAR(50) DEFAULT 'Casa'");
    await p.query("ALTER TABLE orders ADD COLUMN IF NOT EXISTS address_street TEXT DEFAULT ''");
    await p.query("ALTER TABLE orders ADD COLUMN IF NOT EXISTS address_locality TEXT DEFAULT ''");
    await p.query("ALTER TABLE orders ADD COLUMN IF NOT EXISTS address_instructions TEXT DEFAULT ''");
    await p.query("ALTER TABLE orders ADD COLUMN IF NOT EXISTS address_neighborhood TEXT DEFAULT ''");
    await p.query("ALTER TABLE orders ADD COLUMN IF NOT EXISTS address_city TEXT DEFAULT ''");
    await p.query("ALTER TABLE orders ADD COLUMN IF NOT EXISTS address_zip TEXT DEFAULT ''");
    console.log('Order address columns added');
  } catch (err) {
    console.error(err.message);
  } finally {
    await p.end();
  }
}

migrate();
