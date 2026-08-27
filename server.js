const express = require('express');
const compression = require('compression');
const cors = require('cors');
const { Pool } = require('pg');
const path = require('path');
const fs = require('fs');
const cloudinary = require('cloudinary').v2;

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

const app = express();
const PORT = process.env.PORT || 3004;

// Middleware
app.use(compression());
app.use(cors());
app.use(express.json({ limit: '50mb' }));

// Route for admin panel (must be before static middleware)
app.get('/admin', (req, res) => {
  res.sendFile(path.join(__dirname, 'index.html'));
});

// Routes for client-side SPA views
app.get('/categorias', (req, res) => {
  res.sendFile(path.join(__dirname, 'index.html'));
});

app.get('/micuenta', (req, res) => {
  res.sendFile(path.join(__dirname, 'index.html'));
});

app.get('/contacto', (req, res) => {
  res.sendFile(path.join(__dirname, 'index.html'));
});

app.get('/categoria/:slug', (req, res) => {
  res.sendFile(path.join(__dirname, 'index.html'));
});

// Serve product pages with Open Graph meta tags for social sharing
app.get(/^\/categoria\/[^/]+\/[^/]+-\d+$/, async (req, res) => {
  const segments = req.path.split('-');
  const id = parseInt(segments[segments.length - 1], 10);
  if (isNaN(id)) {
    return res.sendFile(path.join(__dirname, 'index.html'));
  }
  try {
    const result = await pool.query('SELECT * FROM products WHERE id = $1', [id]);
    if (result.rows.length === 0) {
      return res.sendFile(path.join(__dirname, 'index.html'));
    }
    const p = result.rows[0];
    let images = [];
    if (p.images) {
      images = typeof p.images === 'string' ? JSON.parse(p.images) : p.images;
    }
    if ((!images || images.length === 0) && p.image) {
      images = [p.image];
    }
    const imageUrl = images.length > 0 ? images[0] : '';
    const absoluteImageUrl = imageUrl.startsWith('http') ? imageUrl : `http://13.140.153.222:3001${imageUrl}`;
    const description = p.description ? p.description.replace(/<[^>]*>/g, '').substring(0, 200) : '';
    const ogTitle = p.name || 'WebMeclibr';
    const ogUrl = `http://13.140.153.222:3001${req.path}`;

    const html = require('fs').readFileSync(path.join(__dirname, 'index.html'), 'utf8');
    const secureImageUrl = imageUrl.startsWith('https') ? imageUrl : absoluteImageUrl;
    const ogTags = `
  <meta property="og:title" content="${ogTitle.replace(/"/g, '&quot;')}" />
  <meta property="og:description" content="${description.replace(/"/g, '&quot;')}" />
  <meta property="og:image" content="${absoluteImageUrl.replace(/"/g, '&quot;')}" />
  <meta property="og:image:secure_url" content="${secureImageUrl.replace(/"/g, '&quot;')}" />
  <meta property="og:image:width" content="600" />
  <meta property="og:image:height" content="750" />
  <meta property="og:url" content="${ogUrl}" />
  <meta property="og:type" content="product" />
  <meta property="og:site_name" content="WebMeclibr" />
  <meta name="twitter:card" content="summary_large_image" />
  <meta name="twitter:title" content="${ogTitle.replace(/"/g, '&quot;')}" />
  <meta name="twitter:description" content="${description.replace(/"/g, '&quot;')}" />
  <meta name="twitter:image" content="${absoluteImageUrl.replace(/"/g, '&quot;')}" />`;
    const modified = html.replace('</head>', ogTags + '\n</head>');
    res.send(modified);
  } catch (err) {
    console.error('Error serving product page with OG tags:', err);
    res.sendFile(path.join(__dirname, 'index.html'));
  }
});

app.use(express.static('.', { etag: false, lastModified: false }));
app.use((req, res, next) => {
  res.set('Cache-Control', 'no-store, no-cache, must-revalidate');
  res.set('Pragma', 'no-cache');
  next();
});

// Cloudinary configuration
cloudinary.config({
  cloud_name: process.env.CLOUDINARY_CLOUD_NAME,
  api_key: process.env.CLOUDINARY_API_KEY,
  api_secret: process.env.CLOUDINARY_API_SECRET,
});

// File upload with multer (temp storage before Cloudinary)
const multer = require('multer');
const storage = multer.memoryStorage();
const upload = multer({ storage, limits: { fileSize: 5 * 1024 * 1024 } });

app.post('/api/upload', upload.single('file'), (req, res) => {
  if (!req.file) return res.status(400).json({ error: 'No se envió archivo' });
  const b64 = req.file.buffer.toString('base64');
  const dataURI = `data:${req.file.mimetype};base64,${b64}`;
  cloudinary.uploader.upload(dataURI, { folder: 'webmeclibr' }, (err, result) => {
    if (err) {
      console.error('Cloudinary upload error:', err);
      return res.status(500).json({ error: 'Error al subir imagen' });
    }
    res.json({ url: result.secure_url });
  });
});

// PostgreSQL connection
const pool = new Pool(
  process.env.DATABASE_URL
    ? { connectionString: process.env.DATABASE_URL }
    : {
        user: process.env.DB_USER || 'webmeclibr',
        host: process.env.DB_HOST || 'localhost',
        database: process.env.DB_NAME || 'webmeclibr',
        password: process.env.DB_PASSWORD || '123456',
        port: parseInt(process.env.DB_PORT || '5432'),
      }
);

// Simple in-memory cache for GET responses
const cache = {};
const CACHE_TTL = 15000; // 15 seconds

// Auto-migrate: add missing columns to orders table
async function autoMigrate() {
  try {
    // Check if orders table exists
    const tableCheck = await pool.query(
      "SELECT EXISTS (SELECT FROM information_schema.tables WHERE table_name = 'orders')"
    );
    if (!tableCheck.rows[0].exists) {
      console.log('Tabla orders no existe aún, omitiendo auto-migración');
      return;
    }
    const columns = [
      ['address_type', "VARCHAR(50) DEFAULT 'Casa'"],
      ['address_street', "TEXT DEFAULT ''"],
      ['address_locality', "TEXT DEFAULT ''"],
      ['address_instructions', "TEXT DEFAULT ''"],
      ['address_neighborhood', "TEXT DEFAULT ''"],
      ['address_city', "TEXT DEFAULT ''"],
      ['address_zip', "TEXT DEFAULT ''"]
    ];
    for (const [col, type] of columns) {
      await pool.query(`ALTER TABLE orders ADD COLUMN IF NOT EXISTS ${col} ${type}`);
    }
    await pool.query("ALTER TABLE orders ALTER COLUMN status SET DEFAULT 'Pendiente'");
    await pool.query("UPDATE orders SET status = 'Pendiente' WHERE status = 'pending'");
    console.log('Auto-migración de orders completada');
  } catch (err) {
    console.error('Error en auto-migración:', err.message);
  }
}
autoMigrate();

function cacheMiddleware(req, res, next) {
  if (req.method === 'GET') {
    const key = req.originalUrl;
    const cached = cache[key];
    if (cached && Date.now() - cached.time < CACHE_TTL) {
      res.set('X-Cache', 'HIT');
      return res.json(cached.data);
    }
    const originalSend = res.send.bind(res);
    res.send = function (body) {
      if (typeof body === 'string' || Buffer.isBuffer(body)) {
        try { cache[key] = { data: JSON.parse(body), time: Date.now() }; } catch(e) {}
      }
      return originalSend(body);
    };
  } else {
    // Invalidate cache on write operations
    Object.keys(cache).forEach(k => delete cache[k]);
  }
  next();
}

app.use('/api', cacheMiddleware);

// ========== PRODUCTS ==========

// GET all products
app.get('/api/products', async (req, res) => {
  try {
    const result = await pool.query('SELECT * FROM products ORDER BY id');
    const products = result.rows.map(p => {
      let images = [];
      if (p.images) {
        images = typeof p.images === 'string' ? JSON.parse(p.images) : p.images;
      }
      if ((!images || images.length === 0) && p.image) {
        images = [p.image];
      }
      return { ...p, images };
    });
    res.json(products);
  } catch (err) {
    console.error('Error fetching products:', err);
    res.status(500).json({ error: 'Error al obtener productos' });
  }
});

// GET product by id
app.get('/api/products/:id', async (req, res) => {
  try {
    const { id } = req.params;
    const result = await pool.query('SELECT * FROM products WHERE id = $1', [id]);
    if (result.rows.length === 0) {
      return res.status(404).json({ error: 'Producto no encontrado' });
    }
    const p = result.rows[0];
    let images = [];
    if (p.images) {
      images = typeof p.images === 'string' ? JSON.parse(p.images) : p.images;
    }
    if ((!images || images.length === 0) && p.image) {
      images = [p.image];
    }
    res.json({ ...p, images });
  } catch (err) {
    console.error('Error fetching product:', err);
    res.status(500).json({ error: 'Error al obtener producto' });
  }
});

// GET products by category
app.get('/api/products/category/:category', async (req, res) => {
  try {
    const { category } = req.params;
    let result;
    if (category === 'Todas') {
      result = await pool.query('SELECT * FROM products ORDER BY id');
    } else {
      result = await pool.query('SELECT * FROM products WHERE category = $1 ORDER BY id', [category]);
    }
    res.json(result.rows);
  } catch (err) {
    console.error('Error fetching products by category:', err);
    res.status(500).json({ error: 'Error al obtener productos' });
  }
});

// GET categories
app.get('/api/categories', async (req, res) => {
  try {
    const result = await pool.query('SELECT * FROM categories ORDER BY name');
    res.json(result.rows);
  } catch (err) {
    console.error('Error fetching categories:', err);
    res.status(500).json({ error: 'Error al obtener categorías' });
  }
});

// POST create category
app.post('/api/categories', async (req, res) => {
  try {
    const { name, image } = req.body;
    if (!name) return res.status(400).json({ error: 'El nombre es requerido' });
    const result = await pool.query(
      'INSERT INTO categories (name, image) VALUES ($1, $2) RETURNING *',
      [name, image || null]
    );
    res.status(201).json(result.rows[0]);
  } catch (err) {
    console.error('Error creating category:', err);
    res.status(500).json({ error: 'Error al crear categoría' });
  }
});

// PUT update category
app.put('/api/categories/:id', async (req, res) => {
  try {
    const { id } = req.params;
    const { name, image } = req.body;
    if (!name) return res.status(400).json({ error: 'El nombre es requerido' });
    
    // Begin transaction
    await pool.query('BEGIN');
    
    // Get old category name
    const oldCatResult = await pool.query('SELECT name FROM categories WHERE id = $1', [id]);
    if (oldCatResult.rows.length === 0) {
      await pool.query('ROLLBACK');
      return res.status(404).json({ error: 'Categoría no encontrada' });
    }
    const oldName = oldCatResult.rows[0].name;

    // Update category
    const result = await pool.query(
      'UPDATE categories SET name = $1, image = $2 WHERE id = $3 RETURNING *',
      [name, image || null, id]
    );

    // Update products using this category
    await pool.query(
      'UPDATE products SET category = $1 WHERE category = $2',
      [name, oldName]
    );

    await pool.query('COMMIT');
    res.json(result.rows[0]);
  } catch (err) {
    await pool.query('ROLLBACK');
    console.error('Error updating category:', err);
    res.status(500).json({ error: 'Error al actualizar categoría' });
  }
});

// DELETE category
app.delete('/api/categories/:id', async (req, res) => {
  try {
    const { id } = req.params;
    
    // Ensure we don't delete if products are using it
    const catResult = await pool.query('SELECT name FROM categories WHERE id = $1', [id]);
    if (catResult.rows.length === 0) {
      return res.status(404).json({ error: 'Categoría no encontrada' });
    }
    const catName = catResult.rows[0].name;

    const prodResult = await pool.query('SELECT COUNT(*) FROM products WHERE category = $1', [catName]);
    if (parseInt(prodResult.rows[0].count) > 0) {
      return res.status(400).json({ error: 'No se puede eliminar la categoría porque tiene productos asignados.' });
    }

    const result = await pool.query('DELETE FROM categories WHERE id = $1 RETURNING *', [id]);
    res.json({ message: 'Categoría eliminada', category: result.rows[0] });
  } catch (err) {
    console.error('Error deleting category:', err);
    res.status(500).json({ error: 'Error al eliminar categoría' });
  }
});

// POST create product
app.post('/api/products', async (req, res) => {
  try {
    const { name, price, original_price, discount, stock, category, sizes, colors, images, description } = req.body;
    const imagesJson = JSON.stringify(images || []);
    const firstImage = (images && images.length > 0) ? images[0] : null;
    const result = await pool.query(
      `INSERT INTO products (name, price, original_price, discount, stock, category, sizes, colors, image, images, description)
       VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9, $10, $11) RETURNING *`,
      [name, price, original_price, discount, stock || 0, category, sizes || '', colors || '', firstImage, imagesJson, description]
    );
    res.status(201).json(result.rows[0]);
  } catch (err) {
    console.error('Error creating product:', err);
    res.status(500).json({ error: 'Error al crear producto' });
  }
});

// PUT update product
app.put('/api/products/:id', async (req, res) => {
  try {
    const { id } = req.params;
    const { name, price, original_price, discount, stock, category, sizes, colors, images, description } = req.body;
    const imagesJson = JSON.stringify(images || []);
    const firstImage = (images && images.length > 0) ? images[0] : null;
    const result = await pool.query(
      `UPDATE products SET name=$1, price=$2, original_price=$3, discount=$4, stock=$5, category=$6, sizes=$7, colors=$8, image=$9, images=$10, description=$11
       WHERE id=$12 RETURNING *`,
      [name, price, original_price, discount, stock || 0, category, sizes || '', colors || '', firstImage, imagesJson, description, id]
    );
    if (result.rows.length === 0) {
      return res.status(404).json({ error: 'Producto no encontrado' });
    }
    res.json(result.rows[0]);
  } catch (err) {
    console.error('Error updating product:', err);
    res.status(500).json({ error: 'Error al actualizar producto' });
  }
});

// DELETE product
app.delete('/api/products/:id', async (req, res) => {
  try {
    const { id } = req.params;
    const result = await pool.query('DELETE FROM products WHERE id = $1 RETURNING *', [id]);
    if (result.rows.length === 0) {
      return res.status(404).json({ error: 'Producto no encontrado' });
    }
    res.json({ message: 'Producto eliminado', product: result.rows[0] });
  } catch (err) {
    console.error('Error deleting product:', err);
    res.status(500).json({ error: 'Error al eliminar producto' });
  }
});

// ========== ORDERS ==========

// POST create order
app.post('/api/orders', async (req, res) => {
  try {
    const { customer_name, email, phone, address, address_type, address_street, address_locality, address_instructions, address_neighborhood, address_city, address_zip, city, zip_code, payment_method, items, total } = req.body;
    const result = await pool.query(
      `INSERT INTO orders (customer_name, email, phone, address, address_type, address_street, address_locality, address_instructions, address_neighborhood, address_city, address_zip, city, zip_code, payment_method, items, total, status)
       VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9, $10, $11, $12, $13, $14, $15, $16, $17) RETURNING *`,
      [customer_name, email, phone, address, address_type || 'Casa', address_street || '', address_locality || '', address_instructions || '', address_neighborhood || '', address_city || '', address_zip || '', city || '', zip_code || '', payment_method, JSON.stringify(items), total, 'Pendiente']
    );
    res.status(201).json(result.rows[0]);
  } catch (err) {
    console.error('Error creating order:', err);
    res.status(500).json({ error: 'Error al crear pedido' });
  }
});

// GET all orders
app.get('/api/orders', async (req, res) => {
  try {
    const result = await pool.query('SELECT * FROM orders ORDER BY created_at DESC');
    res.json(result.rows);
  } catch (err) {
    console.error('Error fetching orders:', err);
    res.status(500).json({ error: 'Error al obtener pedidos' });
  }
});

// PUT update order status
app.put('/api/orders/:id', async (req, res) => {
  try {
    const { id } = req.params;
    const { status } = req.body;
    const result = await pool.query(
      'UPDATE orders SET status = $1 WHERE id = $2 RETURNING *',
      [status, id]
    );
    if (result.rows.length === 0) {
      return res.status(404).json({ error: 'Pedido no encontrado' });
    }
    res.json(result.rows[0]);
  } catch (err) {
    console.error('Error updating order:', err);
    res.status(500).json({ error: 'Error al actualizar pedido' });
  }
});

// ========== SLIDES ==========

// GET all slides
app.get('/api/slides', async (req, res) => {
  try {
    const result = await pool.query('SELECT * FROM slides ORDER BY sort_order ASC');
    res.json(result.rows);
  } catch (err) {
    console.error('Error fetching slides:', err);
    res.status(500).json({ error: 'Error al obtener slides' });
  }
});

// GET active slides
app.get('/api/slides/active', async (req, res) => {
  try {
    const result = await pool.query('SELECT * FROM slides WHERE active = true ORDER BY sort_order ASC');
    res.json(result.rows);
  } catch (err) {
    console.error('Error fetching active slides:', err);
    res.status(500).json({ error: 'Error al obtener slides activos' });
  }
});

// POST create slide
app.post('/api/slides', async (req, res) => {
  try {
    const { title, subtitle, link, image, button_text, sort_order, active } = req.body;
    if (!title) return res.status(400).json({ error: 'El título es requerido' });
    const result = await pool.query(
      `INSERT INTO slides (title, subtitle, link, image, button_text, sort_order, active)
       VALUES ($1, $2, $3, $4, $5, $6, $7) RETURNING *`,
      [title, subtitle || '', link || '#', image || null, button_text || 'Ver más', sort_order || 0, active !== false]
    );
    res.status(201).json(result.rows[0]);
  } catch (err) {
    console.error('Error creating slide:', err);
    res.status(500).json({ error: 'Error al crear slide' });
  }
});

// PUT update slide
app.put('/api/slides/:id', async (req, res) => {
  try {
    const { id } = req.params;
    const { title, subtitle, link, image, button_text, sort_order, active } = req.body;
    if (!title) return res.status(400).json({ error: 'El título es requerido' });
    const result = await pool.query(
      `UPDATE slides SET title=$1, subtitle=$2, link=$3, image=$4, button_text=$5, sort_order=$6, active=$7
       WHERE id=$8 RETURNING *`,
      [title, subtitle || '', link || '#', image || null, button_text || 'Ver más', sort_order || 0, active !== false, id]
    );
    if (result.rows.length === 0) {
      return res.status(404).json({ error: 'Slide no encontrado' });
    }
    res.json(result.rows[0]);
  } catch (err) {
    console.error('Error updating slide:', err);
    res.status(500).json({ error: 'Error al actualizar slide' });
  }
});

// DELETE slide
app.delete('/api/slides/:id', async (req, res) => {
  try {
    const { id } = req.params;
    const result = await pool.query('DELETE FROM slides WHERE id = $1 RETURNING *', [id]);
    if (result.rows.length === 0) {
      return res.status(404).json({ error: 'Slide no encontrado' });
    }
    res.json({ message: 'Slide eliminado', slide: result.rows[0] });
  } catch (err) {
    console.error('Error deleting slide:', err);
    res.status(500).json({ error: 'Error al eliminar slide' });
  }
});

// ========== SPLIT BANNERS ==========

// GET all split banners
app.get('/api/split-banners', async (req, res) => {
  try {
    const result = await pool.query('SELECT * FROM split_banners ORDER BY position ASC');
    res.json(result.rows);
  } catch (err) {
    console.error('Error fetching split banners:', err);
    res.status(500).json({ error: 'Error al obtener banners' });
  }
});

// GET active split banners
app.get('/api/split-banners/active', async (req, res) => {
  try {
    const result = await pool.query('SELECT * FROM split_banners WHERE active = true ORDER BY position ASC');
    res.json(result.rows);
  } catch (err) {
    console.error('Error fetching active split banners:', err);
    res.status(500).json({ error: 'Error al obtener banners activos' });
  }
});

// POST create split banner
app.post('/api/split-banners', async (req, res) => {
  try {
    const { title, subtitle, link, image, button_text, position, active } = req.body;
    if (!title) return res.status(400).json({ error: 'El título es requerido' });
    const result = await pool.query(
      `INSERT INTO split_banners (title, subtitle, link, image, button_text, position, active)
       VALUES ($1, $2, $3, $4, $5, $6, $7) RETURNING *`,
      [title, subtitle || '', link || '#', image || null, button_text || 'Ver más', position || 1, active !== false]
    );
    res.status(201).json(result.rows[0]);
  } catch (err) {
    console.error('Error creating split banner:', err);
    res.status(500).json({ error: 'Error al crear banner' });
  }
});

// PUT update split banner
app.put('/api/split-banners/:id', async (req, res) => {
  try {
    const { id } = req.params;
    const { title, subtitle, link, image, button_text, position, active } = req.body;
    if (!title) return res.status(400).json({ error: 'El título es requerido' });
    const result = await pool.query(
      `UPDATE split_banners SET title=$1, subtitle=$2, link=$3, image=$4, button_text=$5, position=$6, active=$7
       WHERE id=$8 RETURNING *`,
      [title, subtitle || '', link || '#', image || null, button_text || 'Ver más', position || 1, active !== false, id]
    );
    if (result.rows.length === 0) {
      return res.status(404).json({ error: 'Banner no encontrado' });
    }
    res.json(result.rows[0]);
  } catch (err) {
    console.error('Error updating split banner:', err);
    res.status(500).json({ error: 'Error al actualizar banner' });
  }
});

// DELETE split banner
app.delete('/api/split-banners/:id', async (req, res) => {
  try {
    const { id } = req.params;
    const result = await pool.query('DELETE FROM split_banners WHERE id = $1 RETURNING *', [id]);
    if (result.rows.length === 0) {
      return res.status(404).json({ error: 'Banner no encontrado' });
    }
    res.json({ message: 'Banner eliminado', banner: result.rows[0] });
  } catch (err) {
    console.error('Error deleting split banner:', err);
    res.status(500).json({ error: 'Error al eliminar banner' });
  }
});

// ========== REVIEWS ==========

// GET reviews for a product
app.get('/api/products/:id/reviews', async (req, res) => {
  try {
    const { id } = req.params;
    const result = await pool.query('SELECT * FROM reviews WHERE product_id = $1 ORDER BY created_at DESC', [id]);
    // Calculate aggregate
    const stats = await pool.query('SELECT COALESCE(AVG(rating), 0)::numeric(10,2) as avg_rating, COUNT(*) as review_count FROM reviews WHERE product_id = $1', [id]);
    res.json({ reviews: result.rows, avg_rating: parseFloat(stats.rows[0].avg_rating), review_count: parseInt(stats.rows[0].review_count) });
  } catch (err) {
    console.error('Error fetching reviews:', err);
    res.status(500).json({ error: 'Error al obtener valoraciones' });
  }
});

// POST a new review
app.post('/api/products/:id/reviews', async (req, res) => {
  try {
    const { id } = req.params;
    const { user_name, email, rating, title, comment } = req.body;
    if (!user_name || !rating || rating < 1 || rating > 5) {
      return res.status(400).json({ error: 'Nombre y valoración (1-5) son requeridos' });
    }
    const result = await pool.query(
      'INSERT INTO reviews (product_id, user_name, email, rating, title, comment) VALUES ($1, $2, $3, $4, $5, $6) RETURNING *',
      [id, user_name, email || '', rating, title || '', comment || '']
    );
    // Update product rating and reviews count
    const stats = await pool.query('SELECT COALESCE(AVG(rating), 0)::numeric(10,2) as avg_rating, COUNT(*) as review_count FROM reviews WHERE product_id = $1', [id]);
    await pool.query('UPDATE products SET rating = $1, reviews = $2 WHERE id = $3', [parseFloat(stats.rows[0].avg_rating), parseInt(stats.rows[0].review_count), id]);
    res.status(201).json(result.rows[0]);
  } catch (err) {
    console.error('Error creating review:', err);
    res.status(500).json({ error: 'Error al crear valoración' });
  }
});

// GET all reviews (admin)
app.get('/api/reviews', async (req, res) => {
  try {
    const result = await pool.query(`
      SELECT r.*, p.name as product_name 
      FROM reviews r 
      LEFT JOIN products p ON r.product_id = p.id 
      ORDER BY r.created_at DESC
    `);
    res.json(result.rows);
  } catch (err) {
    console.error('Error fetching all reviews:', err);
    res.status(500).json({ error: 'Error al obtener valoraciones' });
  }
});

// DELETE a review (admin)
app.delete('/api/reviews/:id', async (req, res) => {
  try {
    const { id } = req.params;
    const review = await pool.query('SELECT product_id FROM reviews WHERE id = $1', [id]);
    if (review.rows.length === 0) return res.status(404).json({ error: 'Valoración no encontrada' });
    const productId = review.rows[0].product_id;
    await pool.query('DELETE FROM reviews WHERE id = $1', [id]);
    // Update product stats
    const stats = await pool.query('SELECT COALESCE(AVG(rating), 0)::numeric(10,2) as avg_rating, COUNT(*) as review_count FROM reviews WHERE product_id = $1', [productId]);
    await pool.query('UPDATE products SET rating = $1, reviews = $2 WHERE id = $3', [parseFloat(stats.rows[0].avg_rating), parseInt(stats.rows[0].review_count), productId]);
    res.json({ success: true });
  } catch (err) {
    console.error('Error deleting review:', err);
    res.status(500).json({ error: 'Error al eliminar valoración' });
  }
});

// ========== USERS ==========

// GET all users
app.get('/api/users', async (req, res) => {
  try {
    const result = await pool.query('SELECT id, first_name, last_name, email, phone, created_at FROM users ORDER BY id');
    res.json(result.rows);
  } catch (err) {
    console.error('Error fetching users:', err);
    res.status(500).json({ error: 'Error al obtener usuarios' });
  }
});

// POST create user (register)
app.post('/api/users', async (req, res) => {
  try {
    const { first_name, last_name, email, phone, password } = req.body;
    if (!first_name || !last_name || !email || !password) {
      return res.status(400).json({ error: 'Nombre, apellido, email y contraseña son requeridos' });
    }
    const result = await pool.query(
      `INSERT INTO users (first_name, last_name, email, phone, password)
       VALUES ($1, $2, $3, $4, $5) RETURNING id, first_name, last_name, email, phone, created_at`,
      [first_name, last_name, email, phone || '', password]
    );
    res.status(201).json(result.rows[0]);
  } catch (err) {
    if (err.code === '23505') {
      return res.status(400).json({ error: 'El email ya está registrado' });
    }
    console.error('Error creating user:', err);
    res.status(500).json({ error: 'Error al crear usuario' });
  }
});

// POST login
app.post('/api/users/login', async (req, res) => {
  try {
    const { email, password } = req.body;
    if (!email || !password) {
      return res.status(400).json({ error: 'Email y contraseña son requeridos' });
    }
    const result = await pool.query(
      'SELECT id, first_name, last_name, email, phone FROM users WHERE email = $1 AND password = $2',
      [email, password]
    );
    if (result.rows.length === 0) {
      return res.status(401).json({ error: 'Credenciales incorrectas' });
    }
    res.json(result.rows[0]);
  } catch (err) {
    console.error('Error logging in:', err);
    res.status(500).json({ error: 'Error al iniciar sesión' });
  }
});

// ========== DEBUG ==========

// GET all tables (debug)
app.get('/api/debug/tables', async (req, res) => {
  try {
    const result = await pool.query(`
      SELECT table_name, 
             (SELECT COUNT(*) FROM information_schema.columns WHERE table_name = t.table_name) as column_count,
             (SELECT reltuples::bigint FROM pg_class WHERE relname = t.table_name) as row_count
      FROM information_schema.tables t
      WHERE table_schema = 'public'
      ORDER BY table_name
    `);
    res.json(result.rows);
  } catch (err) {
    console.error('Error fetching tables:', err);
    res.status(500).json({ error: 'Error al obtener tablas' });
  }
});

// GET table structure
app.get('/api/debug/tables/:name', async (req, res) => {
  try {
    const { name } = req.params;
    const columns = await pool.query(`
      SELECT column_name, data_type, is_nullable, column_default
      FROM information_schema.columns
      WHERE table_name = $1 AND table_schema = 'public'
      ORDER BY ordinal_position
    `, [name]);
    const count = await pool.query(`SELECT COUNT(*) FROM ${name}`);
    res.json({ table: name, columns: columns.rows, row_count: parseInt(count.rows[0].count) });
  } catch (err) {
    console.error('Error fetching table:', err);
    res.status(500).json({ error: 'Error al obtener estructura de tabla' });
  }
});

// ========== SPA FALLBACK ==========
// Serve index.html for client-side routes (product pages, etc.)
app.use((req, res, next) => {
  if (req.path.startsWith('/api/')) {
    return res.status(404).json({ error: 'Ruta no encontrada' });
  }
  res.sendFile(path.join(__dirname, 'index.html'));
});

// ========== START SERVER ==========
app.listen(PORT, () => {
  console.log(`Servidor corriendo en http://localhost:${PORT}`);
});
