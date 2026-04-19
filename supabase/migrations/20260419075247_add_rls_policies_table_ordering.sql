/*
  # Add RLS policies for table ordering tables

  ## Summary
  All table-ordering tables (restaurant_tables, table_sessions, table_seats, orders, order_items)
  have RLS enabled but zero policies, which blocks all access. This migration adds the minimum
  policies needed for each table.

  ## Policy Design
  - restaurant_tables: anon can read active tables (needed for QR scan context), authenticated owners can manage
  - table_sessions: anon can read pending/active sessions (needed for public context), service role handles writes
  - table_seats: anon can read seats for active sessions, service role handles writes
  - orders: anon can insert (place orders), authenticated owners can read/update their restaurant's orders
  - order_items: anon can insert (place order items), authenticated owners can read their restaurant's order items

  ## Strategy
  Since SUPABASE_SERVICE_ROLE_KEY may not be available in Next.js env, all routes will use
  the anon/authenticated client with these policies to allow the necessary operations.
*/

-- ============================================================
-- restaurant_tables
-- ============================================================
CREATE POLICY "Anyone can view active restaurant tables"
  ON restaurant_tables FOR SELECT
  TO anon
  USING (is_active = true);

CREATE POLICY "Authenticated can view own restaurant tables"
  ON restaurant_tables FOR SELECT
  TO authenticated
  USING (
    restaurant_id IN (
      SELECT id FROM restaurants WHERE owner_id = auth.uid()
    )
  );

CREATE POLICY "Authenticated can insert own restaurant tables"
  ON restaurant_tables FOR INSERT
  TO authenticated
  WITH CHECK (
    restaurant_id IN (
      SELECT id FROM restaurants WHERE owner_id = auth.uid()
    )
  );

CREATE POLICY "Authenticated can update own restaurant tables"
  ON restaurant_tables FOR UPDATE
  TO authenticated
  USING (
    restaurant_id IN (
      SELECT id FROM restaurants WHERE owner_id = auth.uid()
    )
  )
  WITH CHECK (
    restaurant_id IN (
      SELECT id FROM restaurants WHERE owner_id = auth.uid()
    )
  );

CREATE POLICY "Authenticated can delete own restaurant tables"
  ON restaurant_tables FOR DELETE
  TO authenticated
  USING (
    restaurant_id IN (
      SELECT id FROM restaurants WHERE owner_id = auth.uid()
    )
  );

-- ============================================================
-- table_sessions
-- ============================================================
CREATE POLICY "Anyone can view pending or active table sessions"
  ON table_sessions FOR SELECT
  TO anon
  USING (status IN ('pending', 'active'));

CREATE POLICY "Authenticated can view own restaurant sessions"
  ON table_sessions FOR SELECT
  TO authenticated
  USING (
    restaurant_id IN (
      SELECT id FROM restaurants WHERE owner_id = auth.uid()
    )
  );

CREATE POLICY "Anyone can insert pending sessions"
  ON table_sessions FOR INSERT
  TO anon
  WITH CHECK (status = 'pending');

CREATE POLICY "Authenticated can update own restaurant sessions"
  ON table_sessions FOR UPDATE
  TO authenticated
  USING (
    restaurant_id IN (
      SELECT id FROM restaurants WHERE owner_id = auth.uid()
    )
  )
  WITH CHECK (
    restaurant_id IN (
      SELECT id FROM restaurants WHERE owner_id = auth.uid()
    )
  );

-- ============================================================
-- table_seats
-- ============================================================
CREATE POLICY "Anyone can view seats for active sessions"
  ON table_seats FOR SELECT
  TO anon
  USING (
    session_id IN (
      SELECT id FROM table_sessions WHERE status IN ('pending', 'active')
    )
  );

CREATE POLICY "Authenticated can view seats for own restaurant sessions"
  ON table_seats FOR SELECT
  TO authenticated
  USING (
    session_id IN (
      SELECT ts.id FROM table_sessions ts
      JOIN restaurants r ON r.id = ts.restaurant_id
      WHERE r.owner_id = auth.uid()
    )
  );

CREATE POLICY "Authenticated can insert seats for own restaurant sessions"
  ON table_seats FOR INSERT
  TO authenticated
  WITH CHECK (
    session_id IN (
      SELECT ts.id FROM table_sessions ts
      JOIN restaurants r ON r.id = ts.restaurant_id
      WHERE r.owner_id = auth.uid()
    )
  );

CREATE POLICY "Anyone can claim an open seat"
  ON table_seats FOR UPDATE
  TO anon
  USING (status = 'open')
  WITH CHECK (status = 'claimed');

CREATE POLICY "Authenticated can update seats for own restaurant sessions"
  ON table_seats FOR UPDATE
  TO authenticated
  USING (
    session_id IN (
      SELECT ts.id FROM table_sessions ts
      JOIN restaurants r ON r.id = ts.restaurant_id
      WHERE r.owner_id = auth.uid()
    )
  )
  WITH CHECK (
    session_id IN (
      SELECT ts.id FROM table_sessions ts
      JOIN restaurants r ON r.id = ts.restaurant_id
      WHERE r.owner_id = auth.uid()
    )
  );

-- ============================================================
-- orders
-- ============================================================
CREATE POLICY "Anyone can insert orders for active sessions"
  ON orders FOR INSERT
  TO anon
  WITH CHECK (
    table_session_id IN (
      SELECT id FROM table_sessions WHERE status = 'active'
    )
  );

CREATE POLICY "Authenticated can view own restaurant orders"
  ON orders FOR SELECT
  TO authenticated
  USING (
    restaurant_id IN (
      SELECT id FROM restaurants WHERE owner_id = auth.uid()
    )
  );

CREATE POLICY "Authenticated can update own restaurant orders"
  ON orders FOR UPDATE
  TO authenticated
  USING (
    restaurant_id IN (
      SELECT id FROM restaurants WHERE owner_id = auth.uid()
    )
  )
  WITH CHECK (
    restaurant_id IN (
      SELECT id FROM restaurants WHERE owner_id = auth.uid()
    )
  );

-- ============================================================
-- order_items
-- ============================================================
CREATE POLICY "Anyone can insert order items"
  ON order_items FOR INSERT
  TO anon
  WITH CHECK (
    order_id IN (
      SELECT o.id FROM orders o
      JOIN table_sessions ts ON ts.id = o.table_session_id
      WHERE ts.status = 'active'
    )
  );

CREATE POLICY "Authenticated can view own restaurant order items"
  ON order_items FOR SELECT
  TO authenticated
  USING (
    order_id IN (
      SELECT o.id FROM orders o
      JOIN restaurants r ON r.id = o.restaurant_id
      WHERE r.owner_id = auth.uid()
    )
  );
