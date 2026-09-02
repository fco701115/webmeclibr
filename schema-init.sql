-- ========== WEBAPPTIENS DATABASE SCHEMA ==========

-- Products table
CREATE TABLE IF NOT EXISTS products (
  id SERIAL PRIMARY KEY,
  name VARCHAR(255) NOT NULL,
  price DECIMAL(10,2) NOT NULL,
  original_price DECIMAL(10,2),
  discount INTEGER DEFAULT 0,
  stock INTEGER DEFAULT 0,
  rating DECIMAL(2,1) DEFAULT 0,
  reviews INTEGER DEFAULT 0,
  category VARCHAR(100) NOT NULL,
  sizes TEXT DEFAULT '',
  colors TEXT DEFAULT '',
  image TEXT,
  images JSONB DEFAULT '[]',
  description TEXT,
  characteristics TEXT DEFAULT '',
  meli_url TEXT DEFAULT '',
  is_best_seller BOOLEAN DEFAULT FALSE,
  is_mega_offer BOOLEAN DEFAULT FALSE,
  is_recommended BOOLEAN DEFAULT FALSE,
  show_sizes BOOLEAN DEFAULT TRUE,
  show_colors BOOLEAN DEFAULT TRUE,
  detail TEXT DEFAULT '',
  created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);

-- Orders table
CREATE TABLE IF NOT EXISTS orders (
  id SERIAL PRIMARY KEY,
  customer_name VARCHAR(255) NOT NULL,
  email VARCHAR(255) NOT NULL,
  phone VARCHAR(50),
  address TEXT,
  address_type VARCHAR(50) DEFAULT 'Casa',
  address_street TEXT,
  address_locality TEXT,
  address_instructions TEXT,
  address_neighborhood TEXT,
  address_city TEXT,
  address_zip TEXT,
  city VARCHAR(100),
  zip_code VARCHAR(20),
  payment_method VARCHAR(50),
  items JSONB,
  total DECIMAL(10,2),
  status VARCHAR(50) DEFAULT 'Pendiente',
  created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);

-- Categories table
CREATE TABLE IF NOT EXISTS categories (
  id SERIAL PRIMARY KEY,
  name VARCHAR(100) NOT NULL UNIQUE,
  image TEXT
);

-- Slides table
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

-- Split Banners table
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

-- Reviews table
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

-- Users table
CREATE TABLE IF NOT EXISTS users (
  id SERIAL PRIMARY KEY,
  first_name VARCHAR(255) NOT NULL,
  last_name VARCHAR(255) NOT NULL,
  email VARCHAR(255) NOT NULL UNIQUE,
  phone VARCHAR(50) DEFAULT '',
  password VARCHAR(255) NOT NULL,
  created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);

-- Blogs table
CREATE TABLE IF NOT EXISTS blogs (
  id SERIAL PRIMARY KEY,
  title VARCHAR(255) NOT NULL,
  excerpt TEXT DEFAULT '',
  content TEXT DEFAULT '',
  image TEXT,
  author VARCHAR(255) DEFAULT 'Admin',
  active BOOLEAN DEFAULT true,
  created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);

-- Blog comments
CREATE TABLE IF NOT EXISTS blog_comments (
  id SERIAL PRIMARY KEY,
  blog_id INTEGER REFERENCES blogs(id) ON DELETE CASCADE,
  user_name VARCHAR(255) NOT NULL,
  comment TEXT DEFAULT '',
  created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);

-- Insert sample blogs
INSERT INTO blogs (title, excerpt, content, image, author) VALUES
('Tendencias de moda para esta temporada', 'Descubre las prendas imperdibles que no pueden faltar en tu guardarropa este año.', 'La moda evoluciona constantemente y esta temporada trae consigo tendencias que mezclan comodidad con estilo. Desde colores vibrantes hasta siluetas relajadas, las prendas clave incluyen blusas oversized, faldas midi plisadas y accesorios llamativos. No olvides combinar texturas y tonos neutros para crear looks versátiles y elegantes.', 'https://images.unsplash.com/photo-1558618666-fcd25c85f82e?w=800&h=500&fit=crop', 'María García'),
('Cómo combinar colores como una experta', 'Aprende las reglas básicas del color y rompe las convenciones con confianza.', 'Combinar colores no tiene por qué ser complicado. La regla de los tres colores es un excelente punto de partida: elige un color dominante, uno secundario y un acento. Los tonos neutros como blanco, negro y beige son perfectos para equilibrar piezas llamativas. Recuerda que la confianza es el mejor accesorio que puedes llevar.', 'https://images.unsplash.com/photo-1558171813-4c088753af8f?w=800&h=500&fit=crop', 'Laura Martínez'),
('Cuidado de tus prendas: consejos para que duren más', 'Extiende la vida útil de tu ropa favorita con estos tips prácticos y sencillos.', 'Invertir en prendas de calidad es solo el primer paso. Para que duren más, lava la ropa del revés, usa agua fría siempre que puedas y evita la secadora. Cuelga las camisetas en lugar de doblarlas y guarda los suéteres en espacios ventilados. Pequeños hábitos marcan una gran diferencia en la conservación de tu guardarropa.', 'https://images.unsplash.com/photo-1556905055-8f358a7a47b2?w=800&h=500&fit=crop', 'Carlos Ruiz');

-- Insert sample products
INSERT INTO products (name, price, original_price, discount, rating, reviews, category, image, description) VALUES
('Blusa para dama color gris', 1799.99, 2499.99, 28, 4.8, 124, 'Blusas', 'https://images.unsplash.com/photo-1564257631407-4deb1f99d992?w=600&h=750&fit=crop', 'Blusa elegante para dama en color gris.'),
('Vestido floral de verano', 2199.99, 3199.99, 31, 4.9, 89, 'Vestidos', 'https://images.unsplash.com/photo-1572804013309-59a88b7e92f1?w=600&h=750&fit=crop', 'Vestido floral ideal para los días de verano.'),
('Jeans slim fit azul oscuro', 1599.99, NULL, 0, 4.6, 203, 'Jeans', 'https://images.unsplash.com/photo-1542272604-787c3835535d?w=600&h=750&fit=crop', 'Jeans slim fit en color azul oscuro.'),
('Chaqueta cuero sintético negra', 3499.99, 4999.99, 30, 4.7, 67, 'Chaquetas', 'https://images.unsplash.com/photo-1551028719-00167b16eac5?w=600&h=750&fit=crop', 'Chaqueta de cuero sintético en color negro.'),
('Falda midi plisada rosa', 1299.99, NULL, 0, 4.5, 156, 'Faldas', 'https://images.unsplash.com/photo-1583496661160-fb5886a0aaaa?w=600&h=750&fit=crop', 'Falda midi plisada en color rosa.'),
('Camiseta algodón blanca', 799.99, 1199.99, 33, 4.4, 312, 'Camisetas', 'https://images.unsplash.com/photo-1521572163474-6864f9cf17ab?w=600&h=750&fit=crop', 'Camiseta básica de algodón en color blanco.'),
('Top asimétrico negro', 1099.99, NULL, 0, 4.7, 78, 'Blusas', 'https://images.unsplash.com/photo-1485462537746-965f33f7f6a7?w=600&h=750&fit=crop', 'Top asimétrico en color negro.'),
('Pantalón palazzo beige', 1899.99, 2699.99, 30, 4.6, 94, 'Jeans', 'https://images.unsplash.com/photo-1594938298603-c8148c4dae35?w=600&h=750&fit=crop', 'Pantalón palazzo en color beige.'),
('Blazer oversize gris marengo', 2999.99, NULL, 0, 4.8, 45, 'Chaquetas', 'https://images.unsplash.com/photo-1591369822096-ffd140ec948f?w=600&h=750&fit=crop', 'Blazer oversize en gris marengo.'),
('Bolso crossbody marrón', 1699.99, 2299.99, 26, 4.5, 167, 'Accesorios', 'https://images.unsplash.com/photo-1548036328-c9fa89d128fa?w=600&h=750&fit=crop', 'Bolso crossbody en color marrón.'),
('Zapatillas deportivas blancas', 2499.99, NULL, 0, 4.9, 231, 'Zapatos', 'https://images.unsplash.com/photo-1560343090-f0409e92791a?w=600&h=750&fit=crop', 'Zapatillas deportivas en color blanco.'),
('Gafas de sol redondas doradas', 899.99, 1399.99, 36, 4.3, 88, 'Accesorios', 'https://images.unsplash.com/photo-1511499767150-a48a237f0083?w=600&h=750&fit=crop', 'Gafas de sol redondas con montura dorada.');
