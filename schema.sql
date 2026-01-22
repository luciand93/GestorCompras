-- ============================================
-- SCHEMA PARA SMART SHOPPING PWA - MiViis
-- Ejecutar en el SQL Editor de Supabase
-- ============================================

-- Tabla de productos (producto maestro/canónico)
CREATE TABLE IF NOT EXISTS products (
  id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
  name TEXT NOT NULL,
  category TEXT,
  image_url TEXT,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- Tabla de aliases/sinónimos de productos
-- Permite vincular diferentes nombres al mismo producto
CREATE TABLE IF NOT EXISTS product_aliases (
  id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
  product_id UUID REFERENCES products(id) ON DELETE CASCADE,
  alias_name TEXT NOT NULL,
  supermarket_name TEXT, -- NULL = alias genérico, o nombre del super específico
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- Tabla de precios históricos
CREATE TABLE IF NOT EXISTS prices (
  id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
  product_id UUID REFERENCES products(id) ON DELETE CASCADE,
  supermarket_name TEXT NOT NULL,
  price DECIMAL(10, 2) NOT NULL,
  unit_price DECIMAL(10, 2),
  date_recorded TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- Tabla de lista de compras
CREATE TABLE IF NOT EXISTS shopping_list (
  id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
  product_id UUID REFERENCES products(id) ON DELETE SET NULL,
  product_name TEXT NOT NULL,
  is_checked BOOLEAN DEFAULT FALSE,
  quantity INTEGER DEFAULT 1,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- Índices para mejorar el rendimiento
CREATE INDEX IF NOT EXISTS idx_prices_product_id ON prices(product_id);
CREATE INDEX IF NOT EXISTS idx_prices_date_recorded ON prices(date_recorded DESC);
CREATE INDEX IF NOT EXISTS idx_prices_supermarket ON prices(supermarket_name);
CREATE INDEX IF NOT EXISTS idx_products_name ON products(name);
CREATE INDEX IF NOT EXISTS idx_shopping_list_checked ON shopping_list(is_checked);
CREATE INDEX IF NOT EXISTS idx_product_aliases_name ON product_aliases(alias_name);
CREATE INDEX IF NOT EXISTS idx_product_aliases_product ON product_aliases(product_id);

-- Función para actualizar updated_at automáticamente
CREATE OR REPLACE FUNCTION update_updated_at_column()
RETURNS TRIGGER AS $$
BEGIN
  NEW.updated_at = NOW();
  RETURN NEW;
END;
$$ language 'plpgsql';

-- Triggers para actualizar updated_at
DROP TRIGGER IF EXISTS update_products_updated_at ON products;
CREATE TRIGGER update_products_updated_at BEFORE UPDATE ON products
  FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();

DROP TRIGGER IF EXISTS update_shopping_list_updated_at ON shopping_list;
CREATE TRIGGER update_shopping_list_updated_at BEFORE UPDATE ON shopping_list
  FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();

-- Comentarios para documentación
COMMENT ON TABLE products IS 'Catálogo de productos maestros';
COMMENT ON TABLE product_aliases IS 'Nombres alternativos de productos por supermercado';
COMMENT ON TABLE prices IS 'Histórico de precios por supermercado';
COMMENT ON TABLE shopping_list IS 'Lista de compras activa del usuario';
