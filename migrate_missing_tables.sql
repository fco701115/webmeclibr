-- ========== MIGRACION: Agregar tablas y columnas faltantes ==========
-- Ejecutar: psql -U postgres -d webmeclibr -f migrate_missing_tables.sql

-- ========== PRODUCTS: agregar columnas faltantes ==========
DO $$ BEGIN
  ALTER TABLE products ADD COLUMN IF NOT EXISTS stock INTEGER DEFAULT 0;
EXCEPTION WHEN duplicate_column THEN null;
END $$;

DO $$ BEGIN
  ALTER TABLE products ADD COLUMN IF NOT EXISTS sizes TEXT DEFAULT '';
EXCEPTION WHEN duplicate_column THEN null;
END $$;

DO $$ BEGIN
  ALTER TABLE products ADD COLUMN IF NOT EXISTS colors TEXT DEFAULT '';
EXCEPTION WHEN duplicate_column THEN null;
END $$;

DO $$ BEGIN
  ALTER TABLE products ADD COLUMN IF NOT EXISTS images JSONB DEFAULT '[]';
EXCEPTION WHEN duplicate_column THEN null;
END $$;

-- ========== ORDERS: agregar columnas faltantes ==========
DO $$ BEGIN
  ALTER TABLE orders ADD COLUMN IF NOT EXISTS address_type VARCHAR(50) DEFAULT 'Casa';
EXCEPTION WHEN duplicate_column THEN null;
END $$;

DO $$ BEGIN
  ALTER TABLE orders ADD COLUMN IF NOT EXISTS address_street TEXT DEFAULT '';
EXCEPTION WHEN duplicate_column THEN null;
END $$;

DO $$ BEGIN
  ALTER TABLE orders ADD COLUMN IF NOT EXISTS address_locality TEXT DEFAULT '';
EXCEPTION WHEN duplicate_column THEN null;
END $$;

DO $$ BEGIN
  ALTER TABLE orders ADD COLUMN IF NOT EXISTS address_instructions TEXT DEFAULT '';
EXCEPTION WHEN duplicate_column THEN null;
END $$;

DO $$ BEGIN
  ALTER TABLE orders ADD COLUMN IF NOT EXISTS address_neighborhood TEXT DEFAULT '';
EXCEPTION WHEN duplicate_column THEN null;
END $$;

DO $$ BEGIN
  ALTER TABLE orders ADD COLUMN IF NOT EXISTS address_city TEXT DEFAULT '';
EXCEPTION WHEN duplicate_column THEN null;
END $$;

DO $$ BEGIN
  ALTER TABLE orders ADD COLUMN IF NOT EXISTS address_zip TEXT DEFAULT '';
EXCEPTION WHEN duplicate_column THEN null;
END $$;

-- ========== CATEGORIES ==========
CREATE TABLE IF NOT EXISTS categories (
  id SERIAL PRIMARY KEY,
  name VARCHAR(100) NOT NULL UNIQUE,
  image TEXT
);

-- ========== SLIDES ==========
CREATE TABLE IF NOT EXISTS slides (
  id SERIAL PRIMARY KEY,
  title VARCHAR(255) NOT NULL,
  subtitle TEXT DEFAULT '',
  link TEXT DEFAULT '#',
  image TEXT,
  button_text VARCHAR(100) DEFAULT 'Ver más',
  sort_order INTEGER DEFAULT 0,
  active BOOLEAN DEFAULT true
);

-- ========== SPLIT BANNERS ==========
CREATE TABLE IF NOT EXISTS split_banners (
  id SERIAL PRIMARY KEY,
  title VARCHAR(255) NOT NULL,
  subtitle TEXT DEFAULT '',
  link TEXT DEFAULT '#',
  image TEXT,
  button_text VARCHAR(100) DEFAULT 'Ver más',
  position INTEGER DEFAULT 1,
  active BOOLEAN DEFAULT true
);

-- ========== REVIEWS ==========
CREATE TABLE IF NOT EXISTS reviews (
  id SERIAL PRIMARY KEY,
  product_id INTEGER REFERENCES products(id) ON DELETE CASCADE,
  user_name VARCHAR(255) NOT NULL,
  email VARCHAR(255),
  rating INTEGER NOT NULL CHECK (rating >= 1 AND rating <= 5),
  title VARCHAR(255) DEFAULT '',
  comment TEXT DEFAULT '',
  created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);

-- ========== USERS ==========
CREATE TABLE IF NOT EXISTS users (
  id SERIAL PRIMARY KEY,
  first_name VARCHAR(255) NOT NULL,
  last_name VARCHAR(255) NOT NULL,
  email VARCHAR(255) NOT NULL UNIQUE,
  phone VARCHAR(50) DEFAULT '',
  password VARCHAR(255) NOT NULL,
  created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);

-- ========== ORDERS: corregir status default ==========
DO $$ BEGIN
  ALTER TABLE orders ALTER COLUMN status SET DEFAULT 'Pendiente';
EXCEPTION WHEN others THEN null;
END $$;

-- Actualizar existentes que tengan 'pending' a 'Pendiente'
UPDATE orders SET status = 'Pendiente' WHERE status = 'pending';
