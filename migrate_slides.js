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
    console.log('Creating slides table...');
    await pool.query(`
      CREATE TABLE IF NOT EXISTS slides (
        id SERIAL PRIMARY KEY,
        title VARCHAR(200) NOT NULL,
        subtitle TEXT,
        link VARCHAR(500),
        image TEXT,
        button_text VARCHAR(100),
        sort_order INTEGER DEFAULT 0,
        active BOOLEAN DEFAULT true,
        created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
      )
    `);

    console.log('Inserting default slide...');
    await pool.query(`
      INSERT INTO slides (title, subtitle, button_text, image, sort_order, active)
      SELECT 'Nueva Colección', 'Descubre las últimas tendencias en moda', 'Ver Catálogo', 'https://images.unsplash.com/photo-1441986300917-64674bd600d8?w=1920&h=600&fit=crop', 1, true
      WHERE NOT EXISTS (SELECT 1 FROM slides LIMIT 1)
    `);

    console.log('Migration completed successfully.');
  } catch (err) {
    console.error('Migration failed:', err);
  } finally {
    pool.end();
  }
}

migrate();
