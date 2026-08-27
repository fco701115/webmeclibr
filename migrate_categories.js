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
    console.log('Creating categories table...');
    await pool.query(`
      CREATE TABLE IF NOT EXISTS categories (
        id SERIAL PRIMARY KEY,
        name VARCHAR(100) UNIQUE NOT NULL
      )
    `);

    console.log('Populating categories table from products...');
    await pool.query(`
      INSERT INTO categories (name)
      SELECT DISTINCT category FROM products
      WHERE category IS NOT NULL AND category != ''
      ON CONFLICT (name) DO NOTHING
    `);

    console.log('Migration completed successfully.');
  } catch (err) {
    console.error('Migration failed:', err);
  } finally {
    pool.end();
  }
}

migrate();
