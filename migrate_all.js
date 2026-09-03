const fs = require('fs');
const path = require('path');
const { Pool } = require('pg');

// Load .env file if present (does not override existing env vars)
const envPath = path.join(__dirname, '.env');
if (fs.existsSync(envPath)) {
  const envContent = fs.readFileSync(envPath, 'utf8');
  for (const line of envContent.split('\n')) {
    const trimmed = line.trim();
    if (!trimmed || trimmed.startsWith('#')) continue;
    const eq = trimmed.indexOf('=');
    if (eq === -1) continue;
    const key = trimmed.slice(0, eq).trim();
    let value = trimmed.slice(eq + 1).trim();
    if (
      (value.startsWith('"') && value.endsWith('"')) ||
      (value.startsWith("'") && value.endsWith("'"))
    ) {
      value = value.slice(1, -1);
    }
    if (key && !(key in process.env)) {
      process.env[key] = value;
    }
  }
}

const pool = new Pool(
  process.env.DATABASE_URL
    ? { connectionString: process.env.DATABASE_URL }
    : {
        user: process.env.DB_USER || 'postgres',
        host: process.env.DB_HOST || 'localhost',
        database: process.env.DB_NAME || 'db-webmeclibr',
        password: process.env.DB_PASSWORD || 'Rg9svf6GK22MJY5aLwsf',
        port: parseInt(process.env.DB_PORT || '5432'),
      }
);

const files = [
  'init-db.sql',
  'migrate_missing_tables.sql',
  'migrate_product_badges.sql',
  'migrate_free_shipping_full.sql',
  'migrate_add_best_seller.sql'
];

async function migrate() {
  try {
    const { rows } = await pool.query('SELECT current_database() AS db, version() AS v');
    console.log(`Connected to ${rows[0].db}`);
    console.log(rows[0].v.split('\n')[0]);

    for (const file of files) {
      const sqlPath = path.join(__dirname, file);
      if (!fs.existsSync(sqlPath)) {
        console.log(`SKIP ${file}: file not found`);
        continue;
      }
      const sql = fs.readFileSync(sqlPath, 'utf8');
      console.log(`Applying ${file}...`);
      await pool.query(sql);
      console.log(`OK ${file}`);
    }

    const tables = await pool.query(
      `SELECT table_name FROM information_schema.tables
       WHERE table_schema = 'public' ORDER BY table_name`
    );
    console.log('Tables in database:', tables.rows.map(r => r.table_name).join(', '));

    console.log('Migration completed successfully.');
  } catch (err) {
    console.error('Migration failed:', err.message);
    process.exitCode = 1;
  } finally {
    await pool.end();
  }
}

migrate();
