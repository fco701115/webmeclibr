const { Pool } = require('pg');

const pool = new Pool({
  user: 'postgres',
  host: 'localhost',
  database: 'webmeclibr',
  password: '123456',
  port: 5433,
});

async function migrate() {
  try {
    console.log('Adding stock, sizes, and colors columns to products table...');
    await pool.query(`
      ALTER TABLE products ADD COLUMN IF NOT EXISTS stock INTEGER DEFAULT 0
    `);
    await pool.query(`
      ALTER TABLE products ADD COLUMN IF NOT EXISTS sizes VARCHAR(255) DEFAULT ''
    `);
    await pool.query(`
      ALTER TABLE products ADD COLUMN IF NOT EXISTS colors VARCHAR(255) DEFAULT ''
    `);
    console.log('Migration completed successfully.');
  } catch (err) {
    console.error('Migration failed:', err);
  } finally {
    pool.end();
  }
}

migrate();
