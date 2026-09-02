const { Pool } = require('pg');
const fs = require('fs');
const path = require('path');

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
    if ((value.startsWith('"') && value.endsWith('"')) || (value.startsWith("'") && value.endsWith("'"))) {
      value = value.slice(1, -1);
    }
    if (key && !(key in process.env)) {
      process.env[key] = value;
    }
  }
}

async function main() {
  console.log('Ejecutando migración de productos...');
  const pool = new Pool({
    connectionString: process.env.DATABASE_URL,
    ssl: process.env.DATABASE_URL && process.env.DATABASE_URL.includes('sslmode')
      ? undefined
      : { rejectUnauthorized: false }
  });

  const statements = [
    "ALTER TABLE products ADD COLUMN IF NOT EXISTS characteristics TEXT DEFAULT ''",
    "ALTER TABLE products ADD COLUMN IF NOT EXISTS meli_url TEXT DEFAULT ''",
    "ALTER TABLE products ADD COLUMN IF NOT EXISTS is_best_seller BOOLEAN DEFAULT FALSE",
    "ALTER TABLE products ADD COLUMN IF NOT EXISTS is_mega_offer BOOLEAN DEFAULT FALSE",
    "ALTER TABLE products ADD COLUMN IF NOT EXISTS is_recommended BOOLEAN DEFAULT FALSE",
    "ALTER TABLE products ADD COLUMN IF NOT EXISTS show_sizes BOOLEAN DEFAULT TRUE",
    "ALTER TABLE products ADD COLUMN IF NOT EXISTS show_colors BOOLEAN DEFAULT TRUE",
    "ALTER TABLE products ADD COLUMN IF NOT EXISTS detail TEXT DEFAULT ''"
  ];

  for (const stmt of statements) {
    await pool.query(stmt);
    console.log('OK: ' + stmt);
  }

  await pool.end();
  console.log('Migración completada correctamente.');
}

main().catch(err => {
  console.error('Error en la migración:', err.message);
  process.exit(1);
});
