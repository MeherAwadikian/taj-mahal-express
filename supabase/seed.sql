-- =============================================================================
-- Seed data for local development
-- Run: supabase db reset  (applies migrations + this seed)
-- =============================================================================

-- Categories
INSERT INTO categories (id, name, slug, description, sort_order) VALUES
  ('c0000001-0000-0000-0000-000000000001', 'Electronics',    'electronics',  'Gadgets, phones, laptops',       1),
  ('c0000001-0000-0000-0000-000000000002', 'Fashion',        'fashion',      'Clothing and accessories',       2),
  ('c0000001-0000-0000-0000-000000000003', 'Home & Kitchen', 'home-kitchen', 'Furniture, appliances, décor',   3),
  ('c0000001-0000-0000-0000-000000000004', 'Beauty',         'beauty',       'Skincare, haircare, makeup',     4),
  ('c0000001-0000-0000-0000-000000000005', 'Sports',         'sports',       'Cricket, fitness, outdoor',      5),
  ('c0000001-0000-0000-0000-000000000006', 'Grocery',        'grocery',      'Staples, snacks, beverages',     6),
  ('c0000001-0000-0000-0000-000000000007', 'Books',          'books',        'Fiction, non-fiction, academic', 7),
  ('c0000001-0000-0000-0000-000000000008', 'Toys',           'toys',         'Kids toys and games',            8)
ON CONFLICT (id) DO NOTHING;

-- Sub-categories
INSERT INTO categories (id, name, slug, parent_id, sort_order) VALUES
  ('c0000002-0000-0000-0000-000000000001', 'Mobiles',        'mobiles',        'c0000001-0000-0000-0000-000000000001', 1),
  ('c0000002-0000-0000-0000-000000000002', 'Laptops',        'laptops',        'c0000001-0000-0000-0000-000000000001', 2),
  ('c0000002-0000-0000-0000-000000000003', 'Sarees',         'sarees',         'c0000001-0000-0000-0000-000000000002', 1),
  ('c0000002-0000-0000-0000-000000000004', 'Ethnic Wear',    'ethnic-wear',    'c0000001-0000-0000-0000-000000000002', 2),
  ('c0000002-0000-0000-0000-000000000005', 'Cookware',       'cookware',       'c0000001-0000-0000-0000-000000000003', 1),
  ('c0000002-0000-0000-0000-000000000006', 'Skincare',       'skincare',       'c0000001-0000-0000-0000-000000000004', 1),
  ('c0000002-0000-0000-0000-000000000007', 'Cricket',        'cricket',        'c0000001-0000-0000-0000-000000000005', 1),
  ('c0000002-0000-0000-0000-000000000008', 'Organic',        'organic',        'c0000001-0000-0000-0000-000000000006', 1)
ON CONFLICT (id) DO NOTHING;

-- Dev seller user (auth is handled by Supabase, we just seed profiles)
-- In local dev: create a user via Supabase dashboard or supabase auth admin createUser,
-- then update their app_metadata.role = 'seller'

-- Seed coupons
INSERT INTO coupons (code, description, discount_type, discount_value, min_order_value, max_uses, is_active, expires_at) VALUES
  ('TME10',   '10% off on all orders',              'percentage', 10.00, 199.00,    1000, true, NOW() + INTERVAL '90 days'),
  ('FLAT200', 'Flat ₹200 off on orders above ₹999', 'fixed',     200.00, 999.00,     500, true, NOW() + INTERVAL '30 days'),
  ('WELCOME', 'Welcome offer — 15% off',            'percentage', 15.00, 499.00,    NULL, true, NOW() + INTERVAL '365 days')
ON CONFLICT (code) DO NOTHING;
