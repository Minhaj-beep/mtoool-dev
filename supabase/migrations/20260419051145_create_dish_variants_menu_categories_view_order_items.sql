/*
  # Create dish_variants table, menu_categories view, and order_items table

  ## Summary
  1. Creates the dish_variants table for dish variants (size options, etc.)
  2. Creates a menu_categories view that joins categories with restaurant_id for easier querying
  3. Creates order_items table for line-items in table orders

  ## New Tables
  - `dish_variants`: variant options per dish (e.g., Small/Large) with individual prices
  - `order_items`: individual line items in a table order

  ## New Views
  - `menu_categories`: joins categories with menus to expose restaurant_id directly

  ## Security
  - RLS enabled on dish_variants and order_items
  - Public read access for dish_variants (needed for public menu page)
*/

-- dish_variants table
CREATE TABLE IF NOT EXISTS dish_variants (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  dish_id uuid NOT NULL REFERENCES dishes(id) ON DELETE CASCADE,
  name text NOT NULL,
  price numeric NOT NULL,
  created_at timestamptz DEFAULT now()
);

ALTER TABLE dish_variants ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Public can view dish variants"
  ON dish_variants FOR SELECT
  TO anon
  USING (true);

CREATE POLICY "Authenticated can view dish variants"
  ON dish_variants FOR SELECT
  TO authenticated
  USING (true);

CREATE POLICY "Authenticated can insert dish variants"
  ON dish_variants FOR INSERT
  TO authenticated
  WITH CHECK (
    dish_id IN (
      SELECT d.id FROM dishes d
      JOIN categories c ON d.category_id = c.id
      JOIN menus m ON c.menu_id = m.id
      JOIN users u ON m.restaurant_id = u.restaurant_id
      WHERE u.id = auth.uid()
    )
  );

CREATE POLICY "Authenticated can update dish variants"
  ON dish_variants FOR UPDATE
  TO authenticated
  USING (
    dish_id IN (
      SELECT d.id FROM dishes d
      JOIN categories c ON d.category_id = c.id
      JOIN menus m ON c.menu_id = m.id
      JOIN users u ON m.restaurant_id = u.restaurant_id
      WHERE u.id = auth.uid()
    )
  )
  WITH CHECK (
    dish_id IN (
      SELECT d.id FROM dishes d
      JOIN categories c ON d.category_id = c.id
      JOIN menus m ON c.menu_id = m.id
      JOIN users u ON m.restaurant_id = u.restaurant_id
      WHERE u.id = auth.uid()
    )
  );

CREATE POLICY "Authenticated can delete dish variants"
  ON dish_variants FOR DELETE
  TO authenticated
  USING (
    dish_id IN (
      SELECT d.id FROM dishes d
      JOIN categories c ON d.category_id = c.id
      JOIN menus m ON c.menu_id = m.id
      JOIN users u ON m.restaurant_id = u.restaurant_id
      WHERE u.id = auth.uid()
    )
  );

-- menu_categories view: exposes restaurant_id for easier querying
CREATE OR REPLACE VIEW menu_categories AS
  SELECT
    c.id,
    c.menu_id,
    c.name,
    c.display_order,
    c.created_at,
    m.restaurant_id,
    m.is_active
  FROM categories c
  JOIN menus m ON c.menu_id = m.id;

-- order_items table for table ordering
CREATE TABLE IF NOT EXISTS order_items (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  order_id uuid NOT NULL REFERENCES orders(id) ON DELETE CASCADE,
  dish_id uuid NOT NULL REFERENCES dishes(id),
  variant_id uuid REFERENCES dish_variants(id),
  item_name text NOT NULL,
  variant_name text,
  quantity integer NOT NULL DEFAULT 1,
  unit_price numeric NOT NULL,
  line_total numeric NOT NULL,
  notes text,
  created_at timestamptz DEFAULT now()
);

ALTER TABLE order_items ENABLE ROW LEVEL SECURITY;

-- Enable RLS on table ordering tables
ALTER TABLE restaurant_tables ENABLE ROW LEVEL SECURITY;
ALTER TABLE table_sessions ENABLE ROW LEVEL SECURITY;
ALTER TABLE table_seats ENABLE ROW LEVEL SECURITY;
ALTER TABLE orders ENABLE ROW LEVEL SECURITY;

-- Indexes
CREATE INDEX IF NOT EXISTS idx_dish_variants_dish_id ON dish_variants(dish_id);
CREATE INDEX IF NOT EXISTS idx_order_items_order_id ON order_items(order_id);
