CREATE TABLE IF NOT EXISTS coupons (
  id SERIAL PRIMARY KEY,
  titulo VARCHAR(255) NOT NULL DEFAULT '',
  descripcion TEXT DEFAULT '',
  condicion TEXT DEFAULT '',
  tope VARCHAR(255) DEFAULT '',
  titulo_boton VARCHAR(255) DEFAULT 'Ver más',
  link_boton TEXT DEFAULT '#',
  vencimiento TIMESTAMPTZ,
  active BOOLEAN DEFAULT true,
  created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);
