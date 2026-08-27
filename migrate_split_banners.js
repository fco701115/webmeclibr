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
    console.log('Creating split_banners table...');
    await pool.query(`
      CREATE TABLE IF NOT EXISTS split_banners (
        id SERIAL PRIMARY KEY,
        title VARCHAR(200) NOT NULL,
        subtitle TEXT,
        link VARCHAR(500),
        image TEXT,
        button_text VARCHAR(100),
        position INTEGER DEFAULT 1,
        active BOOLEAN DEFAULT true,
        created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
      )
    `);

    console.log('Inserting default split banners...');
    await pool.query(`
      INSERT INTO split_banners (title, subtitle, link, image, button_text, position, active)
      SELECT 'The Art of Writing', 'Descubre nuestra nueva colección de accesorios premium', '#catalogo', 'https://images.unsplash.com/photo-1523275335684-37898b6baf30?w=800&h=400&fit=crop', 'Descubrir →', 1, true
      WHERE NOT EXISTS (SELECT 1 FROM split_banners LIMIT 1)
    `);
    await pool.query(`
      INSERT INTO split_banners (title, subtitle, link, image, button_text, position, active)
      SELECT 'Iconic Shades', 'Estilo atemporal que combina con cualquier look', '#catalogo', 'https://images.unsplash.com/photo-1572635196237-14b3f281503f?w=800&h=400&fit=crop', 'Ver Colección →', 2, true
      WHERE NOT EXISTS (SELECT 1 FROM split_banners WHERE position = 2)
    `);

    console.log('Migration completed successfully.');
  } catch (err) {
    console.error('Migration failed:', err);
  } finally {
    pool.end();
  }
}

migrate();
