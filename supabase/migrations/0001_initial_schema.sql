-- =============================================================================
-- Taj Mahal Express — Initial Schema
-- Migration: 0001_initial_schema.sql
-- Date: 2026-05-11
-- =============================================================================

-- ---------------------------------------------------------------------------
-- EXTENSIONS
-- ---------------------------------------------------------------------------
CREATE EXTENSION IF NOT EXISTS "pg_trgm";         -- fuzzy / trigram search
CREATE EXTENSION IF NOT EXISTS "pg_stat_statements"; -- query performance monitoring

-- ---------------------------------------------------------------------------
-- SEQUENCES
-- ---------------------------------------------------------------------------
CREATE SEQUENCE IF NOT EXISTS order_number_seq START 100001;

-- ---------------------------------------------------------------------------
-- HELPER FUNCTIONS  (referenced by RLS policies — must be created first)
-- ---------------------------------------------------------------------------

CREATE OR REPLACE FUNCTION is_admin()
  RETURNS boolean LANGUAGE sql STABLE SECURITY DEFINER AS $$
  SELECT COALESCE(auth.jwt() -> 'app_metadata' ->> 'role', '') IN ('admin', 'super_admin')
$$;

CREATE OR REPLACE FUNCTION get_seller_profile_id()
  RETURNS uuid LANGUAGE sql STABLE SECURITY DEFINER AS $$
  SELECT id FROM seller_profiles WHERE user_id = auth.uid() LIMIT 1
$$;

-- ---------------------------------------------------------------------------
-- GENERIC TRIGGER: updated_at
-- ---------------------------------------------------------------------------

CREATE OR REPLACE FUNCTION trigger_set_updated_at()
  RETURNS TRIGGER LANGUAGE plpgsql AS $$
BEGIN
  NEW.updated_at = now();
  RETURN NEW;
END;
$$;

-- ===========================================================================
-- TABLES  (created in FK dependency order)
-- ===========================================================================

-- ---------------------------------------------------------------------------
-- 1. users  — public mirror of auth.users
-- ---------------------------------------------------------------------------
CREATE TABLE users (
  id          uuid        PRIMARY KEY REFERENCES auth.users(id) ON DELETE CASCADE,
  email       text,
  phone       text,
  full_name   text,
  avatar_url  text,
  role        text        NOT NULL DEFAULT 'buyer'
                          CHECK (role IN ('buyer', 'seller', 'admin', 'super_admin')),
  is_active   boolean     NOT NULL DEFAULT true,
  created_at  timestamptz NOT NULL DEFAULT now(),
  updated_at  timestamptz NOT NULL DEFAULT now()
);

CREATE UNIQUE INDEX idx_users_email ON users(email) WHERE email IS NOT NULL;
CREATE UNIQUE INDEX idx_users_phone ON users(phone) WHERE phone IS NOT NULL;
CREATE INDEX idx_users_role        ON users(role);

CREATE TRIGGER set_users_updated_at
  BEFORE UPDATE ON users FOR EACH ROW EXECUTE FUNCTION trigger_set_updated_at();

-- Sync from auth.users the instant a user signs up
CREATE OR REPLACE FUNCTION handle_new_auth_user()
  RETURNS TRIGGER LANGUAGE plpgsql SECURITY DEFINER SET search_path = public AS $$
BEGIN
  INSERT INTO public.users (id, email, phone, role)
  VALUES (
    NEW.id,
    NEW.email,
    NEW.raw_user_meta_data ->> 'phone',
    COALESCE(NEW.raw_app_meta_data ->> 'role', 'buyer')
  )
  ON CONFLICT (id) DO NOTHING;
  RETURN NEW;
END;
$$;

CREATE TRIGGER on_auth_user_created
  AFTER INSERT ON auth.users
  FOR EACH ROW EXECUTE FUNCTION handle_new_auth_user();

-- ---------------------------------------------------------------------------
-- 2. categories  — self-referencing tree
-- ---------------------------------------------------------------------------
CREATE TABLE categories (
  id          uuid        PRIMARY KEY DEFAULT gen_random_uuid(),
  parent_id   uuid        REFERENCES categories(id) ON DELETE SET NULL,
  name        text        NOT NULL,
  slug        text        UNIQUE NOT NULL,
  description text,
  image_url   text,
  icon_name   text,
  sort_order  integer     NOT NULL DEFAULT 0,
  level       integer     NOT NULL DEFAULT 0,   -- 0 = root, 1 = sub, 2 = leaf
  path        text,                              -- 'fashion/men/shirts'
  is_active   boolean     NOT NULL DEFAULT true,
  created_at  timestamptz NOT NULL DEFAULT now(),
  updated_at  timestamptz NOT NULL DEFAULT now()
);

CREATE INDEX idx_categories_parent_id ON categories(parent_id);
CREATE INDEX idx_categories_slug      ON categories(slug);
CREATE INDEX idx_categories_level     ON categories(level, sort_order);

CREATE TRIGGER set_categories_updated_at
  BEFORE UPDATE ON categories FOR EACH ROW EXECUTE FUNCTION trigger_set_updated_at();

-- ---------------------------------------------------------------------------
-- 3. addresses
-- ---------------------------------------------------------------------------
CREATE TABLE addresses (
  id            uuid        PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id       uuid        NOT NULL REFERENCES users(id) ON DELETE CASCADE,
  label         text,                            -- 'Home', 'Office'
  full_name     text        NOT NULL,
  phone         text        NOT NULL,
  address_line1 text        NOT NULL,
  address_line2 text,
  city          text        NOT NULL,
  state         text        NOT NULL,
  pincode       text        NOT NULL,
  country       text        NOT NULL DEFAULT 'India',
  is_default    boolean     NOT NULL DEFAULT false,
  latitude      numeric(10,7),
  longitude     numeric(10,7),
  created_at    timestamptz NOT NULL DEFAULT now(),
  updated_at    timestamptz NOT NULL DEFAULT now(),
  deleted_at    timestamptz
);

CREATE INDEX idx_addresses_user_id ON addresses(user_id) WHERE deleted_at IS NULL;
CREATE INDEX idx_addresses_pincode  ON addresses(pincode);

CREATE TRIGGER set_addresses_updated_at
  BEFORE UPDATE ON addresses FOR EACH ROW EXECUTE FUNCTION trigger_set_updated_at();

-- ---------------------------------------------------------------------------
-- 4. coupons  — created before orders because orders.coupon_id → coupons
-- ---------------------------------------------------------------------------
CREATE TABLE coupons (
  id                uuid        PRIMARY KEY DEFAULT gen_random_uuid(),
  code              text        UNIQUE NOT NULL,
  description       text,
  type              text        NOT NULL CHECK (type IN ('flat', 'percent')),
  value             numeric(10,2) NOT NULL CHECK (value > 0),
  max_discount      numeric(10,2),               -- cap for percent coupons
  min_order_value   numeric(10,2) NOT NULL DEFAULT 0,
  category_id       uuid        REFERENCES categories(id) ON DELETE SET NULL,
  seller_id         uuid,                        -- FK added after seller_profiles
  max_uses          integer,                     -- null = unlimited
  max_uses_per_user integer     NOT NULL DEFAULT 1,
  current_uses      integer     NOT NULL DEFAULT 0,
  is_active         boolean     NOT NULL DEFAULT true,
  starts_at         timestamptz NOT NULL DEFAULT now(),
  expires_at        timestamptz,
  created_by        uuid        NOT NULL REFERENCES users(id),
  created_at        timestamptz NOT NULL DEFAULT now(),
  updated_at        timestamptz NOT NULL DEFAULT now()
);

CREATE INDEX idx_coupons_code       ON coupons(code);
CREATE INDEX idx_coupons_is_active  ON coupons(is_active, expires_at);

CREATE TRIGGER set_coupons_updated_at
  BEFORE UPDATE ON coupons FOR EACH ROW EXECUTE FUNCTION trigger_set_updated_at();

-- ---------------------------------------------------------------------------
-- 5. seller_profiles
-- ---------------------------------------------------------------------------
CREATE TABLE seller_profiles (
  id                   uuid        PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id              uuid        NOT NULL UNIQUE REFERENCES users(id) ON DELETE CASCADE,
  business_name        text        NOT NULL,
  display_name         text        NOT NULL,
  slug                 text        UNIQUE NOT NULL,
  description          text,
  logo_url             text,
  gstin                text        UNIQUE,
  pan                  text,
  business_type        text        CHECK (business_type IN (
                                     'individual', 'proprietorship', 'partnership',
                                     'private_limited', 'public_limited', 'llp'
                                   )),
  business_address_id  uuid,                     -- FK added after addresses
  bank_account_number  text,
  bank_ifsc            text,
  bank_account_name    text,
  bank_verified        boolean     NOT NULL DEFAULT false,
  kyc_status           text        NOT NULL DEFAULT 'pending'
                                   CHECK (kyc_status IN ('pending', 'submitted', 'approved', 'rejected')),
  kyc_rejection_reason text,
  is_active            boolean     NOT NULL DEFAULT false,
  is_vacation_mode     boolean     NOT NULL DEFAULT false,
  commission_rate      numeric(5,2) NOT NULL DEFAULT 8.00,
  total_rating         numeric(3,2) NOT NULL DEFAULT 0,
  total_reviews        integer     NOT NULL DEFAULT 0,
  total_sales          numeric(14,2) NOT NULL DEFAULT 0,
  created_at           timestamptz NOT NULL DEFAULT now(),
  updated_at           timestamptz NOT NULL DEFAULT now(),
  deleted_at           timestamptz
);

CREATE INDEX idx_seller_profiles_user_id    ON seller_profiles(user_id);
CREATE INDEX idx_seller_profiles_kyc_status ON seller_profiles(kyc_status);
CREATE INDEX idx_seller_profiles_is_active  ON seller_profiles(is_active) WHERE deleted_at IS NULL;
CREATE INDEX idx_seller_profiles_slug       ON seller_profiles(slug);

CREATE TRIGGER set_seller_profiles_updated_at
  BEFORE UPDATE ON seller_profiles FOR EACH ROW EXECUTE FUNCTION trigger_set_updated_at();

-- ---------------------------------------------------------------------------
-- 6. buyer_profiles
-- ---------------------------------------------------------------------------
CREATE TABLE buyer_profiles (
  id                  uuid        PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id             uuid        NOT NULL UNIQUE REFERENCES users(id) ON DELETE CASCADE,
  date_of_birth       date,
  gender              text        CHECK (gender IN ('male', 'female', 'other', 'prefer_not_to_say')),
  default_address_id  uuid,                      -- FK added after addresses
  language_preference text        NOT NULL DEFAULT 'en',
  gstin               text,                      -- for GST buyers
  total_orders        integer     NOT NULL DEFAULT 0,
  total_spent         numeric(14,2) NOT NULL DEFAULT 0,
  created_at          timestamptz NOT NULL DEFAULT now(),
  updated_at          timestamptz NOT NULL DEFAULT now()
);

CREATE INDEX idx_buyer_profiles_user_id ON buyer_profiles(user_id);

CREATE TRIGGER set_buyer_profiles_updated_at
  BEFORE UPDATE ON buyer_profiles FOR EACH ROW EXECUTE FUNCTION trigger_set_updated_at();

-- Deferred FKs (circular deps resolved after both tables exist)
ALTER TABLE seller_profiles
  ADD CONSTRAINT fk_seller_business_address
  FOREIGN KEY (business_address_id) REFERENCES addresses(id) ON DELETE SET NULL;

ALTER TABLE buyer_profiles
  ADD CONSTRAINT fk_buyer_default_address
  FOREIGN KEY (default_address_id) REFERENCES addresses(id) ON DELETE SET NULL;

ALTER TABLE coupons
  ADD CONSTRAINT fk_coupons_seller
  FOREIGN KEY (seller_id) REFERENCES seller_profiles(id) ON DELETE SET NULL;

-- ---------------------------------------------------------------------------
-- 7. kyc_documents
-- ---------------------------------------------------------------------------
CREATE TABLE kyc_documents (
  id                  uuid    PRIMARY KEY DEFAULT gen_random_uuid(),
  seller_id           uuid    NOT NULL REFERENCES seller_profiles(id) ON DELETE CASCADE,
  document_type       text    NOT NULL CHECK (document_type IN (
                                'gstin_certificate', 'pan_card', 'aadhaar_front', 'aadhaar_back',
                                'bank_statement', 'cancelled_cheque', 'business_registration'
                              )),
  storage_path        text    NOT NULL,
  file_name           text    NOT NULL,
  mime_type           text    NOT NULL,
  file_size_bytes     integer NOT NULL,
  verification_status text    NOT NULL DEFAULT 'pending'
                              CHECK (verification_status IN ('pending', 'approved', 'rejected')),
  rejection_reason    text,
  verified_at         timestamptz,
  verified_by         uuid    REFERENCES users(id) ON DELETE SET NULL,
  created_at          timestamptz NOT NULL DEFAULT now(),
  updated_at          timestamptz NOT NULL DEFAULT now()
);

CREATE INDEX idx_kyc_documents_seller_id           ON kyc_documents(seller_id);
CREATE INDEX idx_kyc_documents_verification_status ON kyc_documents(verification_status);

CREATE TRIGGER set_kyc_documents_updated_at
  BEFORE UPDATE ON kyc_documents FOR EACH ROW EXECUTE FUNCTION trigger_set_updated_at();

-- ---------------------------------------------------------------------------
-- 8. products
-- ---------------------------------------------------------------------------
CREATE TABLE products (
  id                uuid        PRIMARY KEY DEFAULT gen_random_uuid(),
  seller_id         uuid        NOT NULL REFERENCES seller_profiles(id) ON DELETE RESTRICT,
  category_id       uuid        NOT NULL REFERENCES categories(id) ON DELETE RESTRICT,
  title             text        NOT NULL,
  slug              text        UNIQUE NOT NULL,
  description       text,
  specifications    jsonb       NOT NULL DEFAULT '{}',
  brand             text,
  tags              text[]      DEFAULT '{}',
  status            text        NOT NULL DEFAULT 'draft'
                                CHECK (status IN ('draft', 'pending_review', 'active', 'paused', 'rejected')),
  rejection_reason  text,
  base_price        numeric(12,2) NOT NULL CHECK (base_price >= 0),
  mrp               numeric(12,2) NOT NULL CHECK (mrp >= 0),
  min_order_qty     integer     NOT NULL DEFAULT 1,
  max_order_qty     integer,
  is_cod_available  boolean     NOT NULL DEFAULT true,
  return_policy_days integer    NOT NULL DEFAULT 7,
  warranty_info     text,
  country_of_origin text        NOT NULL DEFAULT 'India',
  hsn_code          text,
  gst_rate          numeric(5,2) NOT NULL DEFAULT 18.00,
  weight_grams      integer,
  length_cm         numeric(8,2),
  width_cm          numeric(8,2),
  height_cm         numeric(8,2),
  total_sold        integer     NOT NULL DEFAULT 0,
  average_rating    numeric(3,2) NOT NULL DEFAULT 0,
  review_count      integer     NOT NULL DEFAULT 0,
  view_count        integer     NOT NULL DEFAULT 0,
  search_vector     tsvector,
  created_at        timestamptz NOT NULL DEFAULT now(),
  updated_at        timestamptz NOT NULL DEFAULT now(),
  deleted_at        timestamptz
);

CREATE INDEX idx_products_seller_id_status    ON products(seller_id, status);
CREATE INDEX idx_products_category_id_status  ON products(category_id, status) WHERE deleted_at IS NULL;
CREATE INDEX idx_products_status              ON products(status) WHERE deleted_at IS NULL;
CREATE INDEX idx_products_search_vector       ON products USING GIN(search_vector);
CREATE INDEX idx_products_title_trgm          ON products USING GIN(title gin_trgm_ops);
CREATE INDEX idx_products_brand               ON products(brand) WHERE brand IS NOT NULL;
CREATE INDEX idx_products_average_rating      ON products(average_rating DESC) WHERE status = 'active';
CREATE INDEX idx_products_created_at          ON products(created_at DESC);
CREATE INDEX idx_products_base_price          ON products(base_price) WHERE status = 'active';

CREATE OR REPLACE FUNCTION update_product_search_vector()
  RETURNS TRIGGER LANGUAGE plpgsql AS $$
BEGIN
  NEW.search_vector := to_tsvector('english',
    coalesce(NEW.title, '')       || ' ' ||
    coalesce(NEW.description, '') || ' ' ||
    coalesce(NEW.brand, '')       || ' ' ||
    coalesce(array_to_string(NEW.tags, ' '), '')
  );
  RETURN NEW;
END;
$$;

CREATE TRIGGER update_products_search_vector
  BEFORE INSERT OR UPDATE OF title, description, brand, tags ON products
  FOR EACH ROW EXECUTE FUNCTION update_product_search_vector();

CREATE TRIGGER set_products_updated_at
  BEFORE UPDATE ON products FOR EACH ROW EXECUTE FUNCTION trigger_set_updated_at();

-- ---------------------------------------------------------------------------
-- 9. product_price_history  — for the 90-day price transparency graph
-- ---------------------------------------------------------------------------
CREATE TABLE product_price_history (
  id          uuid        PRIMARY KEY DEFAULT gen_random_uuid(),
  product_id  uuid        NOT NULL REFERENCES products(id) ON DELETE CASCADE,
  variant_id  uuid,                              -- FK added after product_variants
  price       numeric(12,2) NOT NULL,
  mrp         numeric(12,2) NOT NULL,
  recorded_at timestamptz NOT NULL DEFAULT now()
);

CREATE INDEX idx_product_price_history_lookup
  ON product_price_history(product_id, recorded_at DESC);

-- ---------------------------------------------------------------------------
-- 10. product_variants
-- ---------------------------------------------------------------------------
CREATE TABLE product_variants (
  id          uuid        PRIMARY KEY DEFAULT gen_random_uuid(),
  product_id  uuid        NOT NULL REFERENCES products(id) ON DELETE CASCADE,
  sku         text        UNIQUE NOT NULL,
  title       text        NOT NULL,              -- 'Red / L'
  options     jsonb       NOT NULL DEFAULT '{}', -- {"color":"Red","size":"L"}
  price       numeric(12,2) NOT NULL CHECK (price >= 0),
  mrp         numeric(12,2) NOT NULL CHECK (mrp >= 0),
  is_active   boolean     NOT NULL DEFAULT true,
  sort_order  integer     NOT NULL DEFAULT 0,
  created_at  timestamptz NOT NULL DEFAULT now(),
  updated_at  timestamptz NOT NULL DEFAULT now()
);

CREATE INDEX idx_product_variants_product_id ON product_variants(product_id);
CREATE INDEX idx_product_variants_sku        ON product_variants(sku);

CREATE TRIGGER set_product_variants_updated_at
  BEFORE UPDATE ON product_variants FOR EACH ROW EXECUTE FUNCTION trigger_set_updated_at();

-- Resolve deferred FK
ALTER TABLE product_price_history
  ADD CONSTRAINT fk_price_history_variant
  FOREIGN KEY (variant_id) REFERENCES product_variants(id) ON DELETE CASCADE;

-- Log every price change automatically
CREATE OR REPLACE FUNCTION log_variant_price_change()
  RETURNS TRIGGER LANGUAGE plpgsql AS $$
BEGIN
  IF TG_OP = 'INSERT' OR (OLD.price != NEW.price OR OLD.mrp != NEW.mrp) THEN
    INSERT INTO product_price_history (product_id, variant_id, price, mrp)
    VALUES (NEW.product_id, NEW.id, NEW.price, NEW.mrp);
  END IF;
  RETURN NEW;
END;
$$;

CREATE TRIGGER log_variant_price_change_trigger
  AFTER INSERT OR UPDATE OF price, mrp ON product_variants
  FOR EACH ROW EXECUTE FUNCTION log_variant_price_change();

-- ---------------------------------------------------------------------------
-- 11. product_images
-- ---------------------------------------------------------------------------
CREATE TABLE product_images (
  id           uuid    PRIMARY KEY DEFAULT gen_random_uuid(),
  product_id   uuid    NOT NULL REFERENCES products(id) ON DELETE CASCADE,
  variant_id   uuid    REFERENCES product_variants(id) ON DELETE SET NULL,
  storage_path text    NOT NULL,
  url          text    NOT NULL,
  alt_text     text,
  sort_order   integer NOT NULL DEFAULT 0,
  is_primary   boolean NOT NULL DEFAULT false,
  created_at   timestamptz NOT NULL DEFAULT now()
);

CREATE INDEX idx_product_images_product_id ON product_images(product_id, sort_order);

-- ---------------------------------------------------------------------------
-- 12. inventory
-- ---------------------------------------------------------------------------
CREATE TABLE inventory (
  id                  uuid    PRIMARY KEY DEFAULT gen_random_uuid(),
  variant_id          uuid    NOT NULL UNIQUE REFERENCES product_variants(id) ON DELETE CASCADE,
  quantity            integer NOT NULL DEFAULT 0 CHECK (quantity >= 0),
  reserved_quantity   integer NOT NULL DEFAULT 0 CHECK (reserved_quantity >= 0),
  low_stock_threshold integer NOT NULL DEFAULT 5,
  track_inventory     boolean NOT NULL DEFAULT true,
  updated_at          timestamptz NOT NULL DEFAULT now()
);

CREATE INDEX idx_inventory_variant_id ON inventory(variant_id);
CREATE INDEX idx_inventory_low_stock
  ON inventory(quantity, low_stock_threshold) WHERE track_inventory = true;

CREATE TRIGGER set_inventory_updated_at
  BEFORE UPDATE ON inventory FOR EACH ROW EXECUTE FUNCTION trigger_set_updated_at();

-- ---------------------------------------------------------------------------
-- 13. carts
-- ---------------------------------------------------------------------------
CREATE TABLE carts (
  id          uuid        PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id     uuid        UNIQUE REFERENCES users(id) ON DELETE CASCADE,
  session_id  text        UNIQUE,                -- guest cart token
  expires_at  timestamptz,
  created_at  timestamptz NOT NULL DEFAULT now(),
  updated_at  timestamptz NOT NULL DEFAULT now(),
  CONSTRAINT cart_owner_check CHECK (
    (user_id IS NOT NULL AND session_id IS NULL) OR
    (user_id IS NULL AND session_id IS NOT NULL)
  )
);

CREATE INDEX idx_carts_user_id    ON carts(user_id);
CREATE INDEX idx_carts_session_id ON carts(session_id);

CREATE TRIGGER set_carts_updated_at
  BEFORE UPDATE ON carts FOR EACH ROW EXECUTE FUNCTION trigger_set_updated_at();

-- ---------------------------------------------------------------------------
-- 14. cart_items
-- ---------------------------------------------------------------------------
CREATE TABLE cart_items (
  id             uuid        PRIMARY KEY DEFAULT gen_random_uuid(),
  cart_id        uuid        NOT NULL REFERENCES carts(id) ON DELETE CASCADE,
  product_id     uuid        NOT NULL REFERENCES products(id) ON DELETE CASCADE,
  variant_id     uuid        NOT NULL REFERENCES product_variants(id) ON DELETE CASCADE,
  quantity       integer     NOT NULL DEFAULT 1 CHECK (quantity > 0),
  price_snapshot numeric(12,2) NOT NULL,         -- price at time of add-to-cart
  created_at     timestamptz NOT NULL DEFAULT now(),
  updated_at     timestamptz NOT NULL DEFAULT now(),
  UNIQUE(cart_id, variant_id)
);

CREATE INDEX idx_cart_items_cart_id ON cart_items(cart_id);

CREATE TRIGGER set_cart_items_updated_at
  BEFORE UPDATE ON cart_items FOR EACH ROW EXECUTE FUNCTION trigger_set_updated_at();

-- ---------------------------------------------------------------------------
-- 15. orders
-- ---------------------------------------------------------------------------
CREATE TABLE orders (
  id                  uuid        PRIMARY KEY DEFAULT gen_random_uuid(),
  order_number        text        UNIQUE NOT NULL,
  buyer_id            uuid        NOT NULL REFERENCES users(id) ON DELETE RESTRICT,
  shipping_address_id uuid        NOT NULL REFERENCES addresses(id) ON DELETE RESTRICT,
  status              text        NOT NULL DEFAULT 'pending_payment'
                                  CHECK (status IN (
                                    'pending_payment', 'payment_failed', 'placed', 'confirmed',
                                    'partially_shipped', 'shipped', 'out_for_delivery', 'delivered',
                                    'cancelled', 'return_requested', 'returned', 'refunded'
                                  )),
  subtotal            numeric(12,2) NOT NULL CHECK (subtotal >= 0),
  shipping_total      numeric(12,2) NOT NULL DEFAULT 0,
  discount_total      numeric(12,2) NOT NULL DEFAULT 0,
  tax_total           numeric(12,2) NOT NULL DEFAULT 0,
  grand_total         numeric(12,2) NOT NULL CHECK (grand_total >= 0),
  coupon_id           uuid        REFERENCES coupons(id) ON DELETE SET NULL,
  coupon_discount     numeric(12,2) NOT NULL DEFAULT 0,
  payment_method      text,
  payment_status      text        NOT NULL DEFAULT 'pending'
                                  CHECK (payment_status IN (
                                    'pending', 'paid', 'failed', 'refunded', 'partially_refunded'
                                  )),
  notes               text,
  ip_address          inet,
  user_agent          text,
  created_at          timestamptz NOT NULL DEFAULT now(),
  updated_at          timestamptz NOT NULL DEFAULT now()
);

CREATE INDEX idx_orders_buyer_id_created  ON orders(buyer_id, created_at DESC);
CREATE INDEX idx_orders_status            ON orders(status);
CREATE INDEX idx_orders_payment_status    ON orders(payment_status);
CREATE INDEX idx_orders_order_number      ON orders(order_number);
CREATE INDEX idx_orders_created_at        ON orders(created_at DESC);

CREATE TRIGGER set_orders_updated_at
  BEFORE UPDATE ON orders FOR EACH ROW EXECUTE FUNCTION trigger_set_updated_at();

-- ---------------------------------------------------------------------------
-- 16. order_items
-- ---------------------------------------------------------------------------
CREATE TABLE order_items (
  id                   uuid        PRIMARY KEY DEFAULT gen_random_uuid(),
  order_id             uuid        NOT NULL REFERENCES orders(id) ON DELETE RESTRICT,
  seller_id            uuid        NOT NULL REFERENCES seller_profiles(id) ON DELETE RESTRICT,
  product_id           uuid        NOT NULL REFERENCES products(id) ON DELETE RESTRICT,
  variant_id           uuid        NOT NULL REFERENCES product_variants(id) ON DELETE RESTRICT,
  -- Snapshots so order history survives product edits/deletes
  product_title        text        NOT NULL,
  variant_title        text        NOT NULL,
  product_image_url    text,
  sku                  text        NOT NULL,
  quantity             integer     NOT NULL CHECK (quantity > 0),
  unit_price           numeric(12,2) NOT NULL CHECK (unit_price >= 0),
  mrp                  numeric(12,2) NOT NULL CHECK (mrp >= 0),
  subtotal             numeric(12,2) NOT NULL CHECK (subtotal >= 0),
  tax_rate             numeric(5,2) NOT NULL DEFAULT 18.00,
  tax_amount           numeric(12,2) NOT NULL DEFAULT 0,
  hsn_code             text,
  commission_rate      numeric(5,2) NOT NULL,
  commission_amount    numeric(12,2) NOT NULL,
  seller_payout_amount numeric(12,2) NOT NULL,
  item_status          text        NOT NULL DEFAULT 'pending'
                                   CHECK (item_status IN (
                                     'pending', 'confirmed', 'shipped', 'delivered',
                                     'cancelled', 'return_requested', 'returned', 'refunded'
                                   )),
  created_at           timestamptz NOT NULL DEFAULT now(),
  updated_at           timestamptz NOT NULL DEFAULT now()
);

CREATE INDEX idx_order_items_order_id        ON order_items(order_id);
CREATE INDEX idx_order_items_seller_id_status ON order_items(seller_id, item_status);
CREATE INDEX idx_order_items_product_id      ON order_items(product_id);
CREATE INDEX idx_order_items_variant_id      ON order_items(variant_id);

CREATE TRIGGER set_order_items_updated_at
  BEFORE UPDATE ON order_items FOR EACH ROW EXECUTE FUNCTION trigger_set_updated_at();

-- ---------------------------------------------------------------------------
-- 17. payments
-- ---------------------------------------------------------------------------
CREATE TABLE payments (
  id                  uuid        PRIMARY KEY DEFAULT gen_random_uuid(),
  order_id            uuid        NOT NULL REFERENCES orders(id) ON DELETE RESTRICT,
  razorpay_order_id   text        UNIQUE NOT NULL,
  razorpay_payment_id text        UNIQUE,
  razorpay_signature  text,
  amount              numeric(12,2) NOT NULL CHECK (amount > 0),
  currency            text        NOT NULL DEFAULT 'INR',
  method              text,
  status              text        NOT NULL DEFAULT 'created'
                                  CHECK (status IN ('created', 'authorized', 'captured', 'failed', 'refunded')),
  gateway_response    jsonb       NOT NULL DEFAULT '{}',
  idempotency_key     text        UNIQUE NOT NULL,  -- prevents double-capture on retries
  captured_at         timestamptz,
  created_at          timestamptz NOT NULL DEFAULT now(),
  updated_at          timestamptz NOT NULL DEFAULT now()
);

CREATE INDEX idx_payments_order_id          ON payments(order_id);
CREATE INDEX idx_payments_razorpay_order_id ON payments(razorpay_order_id);
CREATE INDEX idx_payments_status            ON payments(status);

CREATE TRIGGER set_payments_updated_at
  BEFORE UPDATE ON payments FOR EACH ROW EXECUTE FUNCTION trigger_set_updated_at();

-- ---------------------------------------------------------------------------
-- 18. shipments
-- ---------------------------------------------------------------------------
CREATE TABLE shipments (
  id                      uuid  PRIMARY KEY DEFAULT gen_random_uuid(),
  order_id                uuid  NOT NULL REFERENCES orders(id) ON DELETE RESTRICT,
  seller_id               uuid  NOT NULL REFERENCES seller_profiles(id) ON DELETE RESTRICT,
  courier_name            text,
  awb_number              text,
  tracking_url            text,
  status                  text  NOT NULL DEFAULT 'pending'
                                CHECK (status IN (
                                  'pending', 'picked_up', 'in_transit', 'out_for_delivery',
                                  'delivered', 'failed_delivery', 'returned_to_seller'
                                )),
  estimated_delivery_date date,
  actual_delivery_date    date,
  created_at              timestamptz NOT NULL DEFAULT now(),
  updated_at              timestamptz NOT NULL DEFAULT now()
);

CREATE INDEX idx_shipments_order_id   ON shipments(order_id);
CREATE INDEX idx_shipments_seller_id  ON shipments(seller_id);
CREATE INDEX idx_shipments_awb_number ON shipments(awb_number) WHERE awb_number IS NOT NULL;

CREATE TRIGGER set_shipments_updated_at
  BEFORE UPDATE ON shipments FOR EACH ROW EXECUTE FUNCTION trigger_set_updated_at();

-- ---------------------------------------------------------------------------
-- 19. shipment_events
-- ---------------------------------------------------------------------------
CREATE TABLE shipment_events (
  id          uuid        PRIMARY KEY DEFAULT gen_random_uuid(),
  shipment_id uuid        NOT NULL REFERENCES shipments(id) ON DELETE CASCADE,
  status      text        NOT NULL,
  description text        NOT NULL,
  location    text,
  occurred_at timestamptz NOT NULL DEFAULT now(),
  created_at  timestamptz NOT NULL DEFAULT now()
);

CREATE INDEX idx_shipment_events_shipment_id ON shipment_events(shipment_id, occurred_at DESC);

-- ---------------------------------------------------------------------------
-- 20. shipment_items  — junction: which order_items are in which shipment
-- ---------------------------------------------------------------------------
CREATE TABLE shipment_items (
  shipment_id   uuid NOT NULL REFERENCES shipments(id) ON DELETE CASCADE,
  order_item_id uuid NOT NULL REFERENCES order_items(id) ON DELETE CASCADE,
  PRIMARY KEY (shipment_id, order_item_id)
);

-- ---------------------------------------------------------------------------
-- 21. reviews  — verified purchase only (enforced by RLS + FK to order_items)
-- ---------------------------------------------------------------------------
CREATE TABLE reviews (
  id                    uuid    PRIMARY KEY DEFAULT gen_random_uuid(),
  product_id            uuid    NOT NULL REFERENCES products(id) ON DELETE CASCADE,
  order_item_id         uuid    NOT NULL UNIQUE REFERENCES order_items(id) ON DELETE RESTRICT,
  buyer_id              uuid    NOT NULL REFERENCES users(id) ON DELETE RESTRICT,
  seller_id             uuid    NOT NULL REFERENCES seller_profiles(id) ON DELETE RESTRICT,
  rating                integer NOT NULL CHECK (rating BETWEEN 1 AND 5),
  title                 text,
  body                  text,
  is_verified_purchase  boolean NOT NULL DEFAULT true,
  is_approved           boolean NOT NULL DEFAULT false,
  moderated_at          timestamptz,
  moderated_by          uuid    REFERENCES users(id) ON DELETE SET NULL,
  helpful_count         integer NOT NULL DEFAULT 0,
  not_helpful_count     integer NOT NULL DEFAULT 0,
  images                text[]  DEFAULT '{}',
  created_at            timestamptz NOT NULL DEFAULT now(),
  updated_at            timestamptz NOT NULL DEFAULT now(),
  deleted_at            timestamptz
);

CREATE INDEX idx_reviews_product_id_approved ON reviews(product_id, is_approved) WHERE deleted_at IS NULL;
CREATE INDEX idx_reviews_buyer_id            ON reviews(buyer_id);
CREATE INDEX idx_reviews_seller_id           ON reviews(seller_id);
CREATE INDEX idx_reviews_rating              ON reviews(rating);

CREATE TRIGGER set_reviews_updated_at
  BEFORE UPDATE ON reviews FOR EACH ROW EXECUTE FUNCTION trigger_set_updated_at();

-- Keep products.average_rating and review_count in sync
CREATE OR REPLACE FUNCTION update_product_rating()
  RETURNS TRIGGER LANGUAGE plpgsql AS $$
DECLARE
  v_product_id uuid := COALESCE(NEW.product_id, OLD.product_id);
BEGIN
  UPDATE products
  SET
    average_rating = (
      SELECT COALESCE(ROUND(AVG(rating)::numeric, 2), 0)
      FROM reviews
      WHERE product_id = v_product_id AND is_approved = true AND deleted_at IS NULL
    ),
    review_count = (
      SELECT COUNT(*)
      FROM reviews
      WHERE product_id = v_product_id AND is_approved = true AND deleted_at IS NULL
    )
  WHERE id = v_product_id;
  RETURN NEW;
END;
$$;

CREATE TRIGGER update_product_rating_on_review
  AFTER INSERT OR UPDATE OR DELETE ON reviews
  FOR EACH ROW EXECUTE FUNCTION update_product_rating();

-- ---------------------------------------------------------------------------
-- 22. review_votes
-- ---------------------------------------------------------------------------
CREATE TABLE review_votes (
  id          uuid    PRIMARY KEY DEFAULT gen_random_uuid(),
  review_id   uuid    NOT NULL REFERENCES reviews(id) ON DELETE CASCADE,
  user_id     uuid    NOT NULL REFERENCES users(id) ON DELETE CASCADE,
  is_helpful  boolean NOT NULL,
  created_at  timestamptz NOT NULL DEFAULT now(),
  UNIQUE(review_id, user_id)
);

CREATE INDEX idx_review_votes_review_id ON review_votes(review_id);

-- Keep helpful/not-helpful counts denormalised on reviews
CREATE OR REPLACE FUNCTION update_review_vote_counts()
  RETURNS TRIGGER LANGUAGE plpgsql AS $$
DECLARE
  v_review_id uuid := COALESCE(NEW.review_id, OLD.review_id);
BEGIN
  UPDATE reviews
  SET
    helpful_count     = (SELECT COUNT(*) FROM review_votes WHERE review_id = v_review_id AND is_helpful = true),
    not_helpful_count = (SELECT COUNT(*) FROM review_votes WHERE review_id = v_review_id AND is_helpful = false)
  WHERE id = v_review_id;
  RETURN NEW;
END;
$$;

CREATE TRIGGER update_review_vote_counts_trigger
  AFTER INSERT OR UPDATE OR DELETE ON review_votes
  FOR EACH ROW EXECUTE FUNCTION update_review_vote_counts();

-- ---------------------------------------------------------------------------
-- 23. wishlists
-- ---------------------------------------------------------------------------
CREATE TABLE wishlists (
  id          uuid    PRIMARY KEY DEFAULT gen_random_uuid(),
  buyer_id    uuid    NOT NULL REFERENCES users(id) ON DELETE CASCADE,
  product_id  uuid    NOT NULL REFERENCES products(id) ON DELETE CASCADE,
  variant_id  uuid    REFERENCES product_variants(id) ON DELETE SET NULL,
  created_at  timestamptz NOT NULL DEFAULT now(),
  UNIQUE(buyer_id, product_id)
);

CREATE INDEX idx_wishlists_buyer_id ON wishlists(buyer_id);

-- ---------------------------------------------------------------------------
-- 24. coupon_redemptions
-- ---------------------------------------------------------------------------
CREATE TABLE coupon_redemptions (
  id              uuid        PRIMARY KEY DEFAULT gen_random_uuid(),
  coupon_id       uuid        NOT NULL REFERENCES coupons(id) ON DELETE RESTRICT,
  user_id         uuid        NOT NULL REFERENCES users(id) ON DELETE RESTRICT,
  order_id        uuid        NOT NULL UNIQUE REFERENCES orders(id) ON DELETE RESTRICT,
  discount_amount numeric(10,2) NOT NULL,
  created_at      timestamptz NOT NULL DEFAULT now()
);

CREATE INDEX idx_coupon_redemptions_coupon_id      ON coupon_redemptions(coupon_id);
CREATE INDEX idx_coupon_redemptions_user_coupon     ON coupon_redemptions(user_id, coupon_id);

CREATE OR REPLACE FUNCTION increment_coupon_uses()
  RETURNS TRIGGER LANGUAGE plpgsql AS $$
BEGIN
  UPDATE coupons SET current_uses = current_uses + 1 WHERE id = NEW.coupon_id;
  RETURN NEW;
END;
$$;

CREATE TRIGGER increment_coupon_uses_trigger
  AFTER INSERT ON coupon_redemptions
  FOR EACH ROW EXECUTE FUNCTION increment_coupon_uses();

-- ---------------------------------------------------------------------------
-- 25. disputes
-- ---------------------------------------------------------------------------
CREATE TABLE disputes (
  id               uuid    PRIMARY KEY DEFAULT gen_random_uuid(),
  order_item_id    uuid    NOT NULL REFERENCES order_items(id) ON DELETE RESTRICT,
  buyer_id         uuid    NOT NULL REFERENCES users(id) ON DELETE RESTRICT,
  seller_id        uuid    NOT NULL REFERENCES seller_profiles(id) ON DELETE RESTRICT,
  reason           text    NOT NULL CHECK (reason IN (
                             'wrong_item', 'damaged', 'not_as_described',
                             'not_delivered', 'changed_mind', 'quality_issue', 'other'
                           )),
  description      text    NOT NULL,
  resolution_type  text    CHECK (resolution_type IN ('refund', 'replacement', 'store_credit', 'rejected')),
  status           text    NOT NULL DEFAULT 'open'
                           CHECK (status IN (
                             'open', 'awaiting_seller', 'awaiting_buyer',
                             'admin_review', 'resolved', 'closed'
                           )),
  evidence_urls    text[]  DEFAULT '{}',
  resolved_at      timestamptz,
  resolved_by      uuid    REFERENCES users(id) ON DELETE SET NULL,
  resolution_notes text,
  -- SLA windows computed from creation time
  sla_deadline     timestamptz NOT NULL DEFAULT now() + INTERVAL '48 hours',
  final_deadline   timestamptz NOT NULL DEFAULT now() + INTERVAL '7 days',
  created_at       timestamptz NOT NULL DEFAULT now(),
  updated_at       timestamptz NOT NULL DEFAULT now()
);

CREATE INDEX idx_disputes_buyer_id    ON disputes(buyer_id);
CREATE INDEX idx_disputes_seller_id   ON disputes(seller_id);
CREATE INDEX idx_disputes_status      ON disputes(status);
CREATE INDEX idx_disputes_sla_overdue
  ON disputes(sla_deadline) WHERE status NOT IN ('resolved', 'closed');

CREATE TRIGGER set_disputes_updated_at
  BEFORE UPDATE ON disputes FOR EACH ROW EXECUTE FUNCTION trigger_set_updated_at();

-- ---------------------------------------------------------------------------
-- 26. dispute_messages
-- ---------------------------------------------------------------------------
CREATE TABLE dispute_messages (
  id              uuid    PRIMARY KEY DEFAULT gen_random_uuid(),
  dispute_id      uuid    NOT NULL REFERENCES disputes(id) ON DELETE CASCADE,
  sender_id       uuid    NOT NULL REFERENCES users(id) ON DELETE RESTRICT,
  sender_role     text    NOT NULL CHECK (sender_role IN ('buyer', 'seller', 'admin')),
  message         text    NOT NULL,
  attachment_urls text[]  DEFAULT '{}',
  is_internal     boolean NOT NULL DEFAULT false, -- admin-only notes hidden from parties
  created_at      timestamptz NOT NULL DEFAULT now()
);

CREATE INDEX idx_dispute_messages_dispute_id ON dispute_messages(dispute_id, created_at);

-- ---------------------------------------------------------------------------
-- 27. refunds
-- ---------------------------------------------------------------------------
CREATE TABLE refunds (
  id                 uuid        PRIMARY KEY DEFAULT gen_random_uuid(),
  order_id           uuid        NOT NULL REFERENCES orders(id) ON DELETE RESTRICT,
  order_item_id      uuid        REFERENCES order_items(id) ON DELETE RESTRICT,
  dispute_id         uuid        REFERENCES disputes(id) ON DELETE SET NULL,
  payment_id         uuid        NOT NULL REFERENCES payments(id) ON DELETE RESTRICT,
  razorpay_refund_id text        UNIQUE,
  amount             numeric(12,2) NOT NULL CHECK (amount > 0),
  reason             text        NOT NULL,
  status             text        NOT NULL DEFAULT 'pending'
                                 CHECK (status IN ('pending', 'processing', 'processed', 'failed')),
  processed_at       timestamptz,
  gateway_response   jsonb       NOT NULL DEFAULT '{}',
  initiated_by       uuid        NOT NULL REFERENCES users(id) ON DELETE RESTRICT,
  created_at         timestamptz NOT NULL DEFAULT now(),
  updated_at         timestamptz NOT NULL DEFAULT now()
);

CREATE INDEX idx_refunds_order_id   ON refunds(order_id);
CREATE INDEX idx_refunds_dispute_id ON refunds(dispute_id);
CREATE INDEX idx_refunds_status     ON refunds(status);

CREATE TRIGGER set_refunds_updated_at
  BEFORE UPDATE ON refunds FOR EACH ROW EXECUTE FUNCTION trigger_set_updated_at();

-- ---------------------------------------------------------------------------
-- 28. seller_payouts
-- ---------------------------------------------------------------------------
CREATE TABLE seller_payouts (
  id                  uuid        PRIMARY KEY DEFAULT gen_random_uuid(),
  seller_id           uuid        NOT NULL REFERENCES seller_profiles(id) ON DELETE RESTRICT,
  period_start        date        NOT NULL,
  period_end          date        NOT NULL,
  gross_amount        numeric(12,2) NOT NULL CHECK (gross_amount >= 0),
  commission_deducted numeric(12,2) NOT NULL CHECK (commission_deducted >= 0),
  refunds_deducted    numeric(12,2) NOT NULL DEFAULT 0,
  tds_deducted        numeric(12,2) NOT NULL DEFAULT 0,  -- 1% TDS per Income Tax Act
  net_amount          numeric(12,2) NOT NULL CHECK (net_amount >= 0),
  status              text        NOT NULL DEFAULT 'pending'
                                  CHECK (status IN ('pending', 'processing', 'paid', 'failed', 'on_hold')),
  bank_reference      text,
  paid_at             timestamptz,
  razorpay_payout_id  text,
  created_at          timestamptz NOT NULL DEFAULT now(),
  updated_at          timestamptz NOT NULL DEFAULT now()
);

CREATE INDEX idx_seller_payouts_seller_id ON seller_payouts(seller_id, created_at DESC);
CREATE INDEX idx_seller_payouts_status    ON seller_payouts(status);
CREATE INDEX idx_seller_payouts_period    ON seller_payouts(period_start, period_end);

CREATE TRIGGER set_seller_payouts_updated_at
  BEFORE UPDATE ON seller_payouts FOR EACH ROW EXECUTE FUNCTION trigger_set_updated_at();

-- ---------------------------------------------------------------------------
-- 29. payout_line_items
-- ---------------------------------------------------------------------------
CREATE TABLE payout_line_items (
  id                uuid        PRIMARY KEY DEFAULT gen_random_uuid(),
  payout_id         uuid        NOT NULL REFERENCES seller_payouts(id) ON DELETE CASCADE,
  order_item_id     uuid        NOT NULL REFERENCES order_items(id) ON DELETE RESTRICT,
  order_number      text        NOT NULL,
  gross_amount      numeric(12,2) NOT NULL,
  commission_rate   numeric(5,2) NOT NULL,
  commission_amount numeric(12,2) NOT NULL,
  refund_deduction  numeric(12,2) NOT NULL DEFAULT 0,
  net_amount        numeric(12,2) NOT NULL,
  settled_at        date        NOT NULL,
  created_at        timestamptz NOT NULL DEFAULT now()
);

CREATE INDEX idx_payout_line_items_payout_id    ON payout_line_items(payout_id);
CREATE INDEX idx_payout_line_items_order_item   ON payout_line_items(order_item_id);

-- ---------------------------------------------------------------------------
-- 30. admin_logs  — immutable audit trail; no UPDATE/DELETE via RLS
-- ---------------------------------------------------------------------------
CREATE TABLE admin_logs (
  id           uuid    PRIMARY KEY DEFAULT gen_random_uuid(),
  actor_id     uuid    NOT NULL REFERENCES users(id) ON DELETE RESTRICT,
  action       text    NOT NULL,   -- 'seller.approve', 'product.reject', etc.
  target_type  text    NOT NULL,   -- 'seller' | 'product' | 'order' | 'user' | 'dispute'
  target_id    uuid,
  before_state jsonb,
  after_state  jsonb,
  ip_address   inet,
  user_agent   text,
  created_at   timestamptz NOT NULL DEFAULT now()
);

CREATE INDEX idx_admin_logs_actor_id ON admin_logs(actor_id, created_at DESC);
CREATE INDEX idx_admin_logs_target   ON admin_logs(target_type, target_id);
CREATE INDEX idx_admin_logs_action   ON admin_logs(action, created_at DESC);

-- ---------------------------------------------------------------------------
-- 31. fraud_signals
-- ---------------------------------------------------------------------------
CREATE TABLE fraud_signals (
  id          uuid    PRIMARY KEY DEFAULT gen_random_uuid(),
  signal_type text    NOT NULL CHECK (signal_type IN (
                        'duplicate_account', 'velocity_breach', 'address_mismatch',
                        'high_refund_rate', 'card_testing', 'suspicious_login', 'device_cluster'
                      )),
  severity    text    NOT NULL DEFAULT 'medium'
                      CHECK (severity IN ('low', 'medium', 'high', 'critical')),
  user_id     uuid    REFERENCES users(id) ON DELETE SET NULL,
  seller_id   uuid    REFERENCES seller_profiles(id) ON DELETE SET NULL,
  order_id    uuid    REFERENCES orders(id) ON DELETE SET NULL,
  payload     jsonb   NOT NULL DEFAULT '{}',
  status      text    NOT NULL DEFAULT 'open'
                      CHECK (status IN ('open', 'investigating', 'resolved', 'false_positive')),
  reviewed_by uuid    REFERENCES users(id) ON DELETE SET NULL,
  reviewed_at timestamptz,
  notes       text,
  created_at  timestamptz NOT NULL DEFAULT now(),
  updated_at  timestamptz NOT NULL DEFAULT now()
);

CREATE INDEX idx_fraud_signals_status_severity ON fraud_signals(status, severity);
CREATE INDEX idx_fraud_signals_user_id         ON fraud_signals(user_id);
CREATE INDEX idx_fraud_signals_seller_id       ON fraud_signals(seller_id);
CREATE INDEX idx_fraud_signals_created_at      ON fraud_signals(created_at DESC);

CREATE TRIGGER set_fraud_signals_updated_at
  BEFORE UPDATE ON fraud_signals FOR EACH ROW EXECUTE FUNCTION trigger_set_updated_at();

-- ---------------------------------------------------------------------------
-- 32. notifications
-- ---------------------------------------------------------------------------
CREATE TABLE notifications (
  id         uuid    PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id    uuid    NOT NULL REFERENCES users(id) ON DELETE CASCADE,
  type       text    NOT NULL,   -- 'order_placed', 'order_shipped', 'dispute_update', etc.
  title      text    NOT NULL,
  body       text    NOT NULL,
  data       jsonb   NOT NULL DEFAULT '{}',
  is_read    boolean NOT NULL DEFAULT false,
  read_at    timestamptz,
  channel    text    NOT NULL DEFAULT 'in_app'
                     CHECK (channel IN ('in_app', 'email', 'sms', 'whatsapp', 'push')),
  created_at timestamptz NOT NULL DEFAULT now()
);

CREATE INDEX idx_notifications_user_is_read ON notifications(user_id, is_read, created_at DESC);
CREATE INDEX idx_notifications_type         ON notifications(type);

-- ===========================================================================
-- BUSINESS LOGIC FUNCTIONS
-- ===========================================================================

-- generate_order_number(): TME + YYMMDD + zero-padded sequence
CREATE OR REPLACE FUNCTION generate_order_number()
  RETURNS text LANGUAGE plpgsql AS $$
DECLARE
  v_date text   := to_char(now() AT TIME ZONE 'Asia/Kolkata', 'YYMMDD');
  v_seq  bigint;
BEGIN
  SELECT nextval('order_number_seq') INTO v_seq;
  RETURN 'TME' || v_date || LPAD(v_seq::text, 6, '0');
END;
$$;

-- calculate_order_total(order_id): live breakdown (excludes cancelled items)
CREATE OR REPLACE FUNCTION calculate_order_total(p_order_id uuid)
  RETURNS TABLE(
    subtotal      numeric,
    shipping_total numeric,
    discount_total numeric,
    tax_total     numeric,
    grand_total   numeric
  ) LANGUAGE plpgsql STABLE AS $$
BEGIN
  RETURN QUERY
  SELECT
    SUM(oi.unit_price * oi.quantity)::numeric                                        AS subtotal,
    0::numeric                                                                        AS shipping_total,
    COALESCE(o.coupon_discount, 0)::numeric                                           AS discount_total,
    SUM(oi.tax_amount)::numeric                                                       AS tax_total,
    (SUM(oi.unit_price * oi.quantity) + SUM(oi.tax_amount)
      - COALESCE(o.coupon_discount, 0))::numeric                                      AS grand_total
  FROM order_items oi
  JOIN orders      o ON o.id = p_order_id
  WHERE oi.order_id = p_order_id
    AND oi.item_status != 'cancelled';
END;
$$;

-- update_inventory_on_order(): triggered on order_items INSERT/UPDATE
CREATE OR REPLACE FUNCTION update_inventory_on_order()
  RETURNS TRIGGER LANGUAGE plpgsql AS $$
BEGIN
  -- New item placed: reserve stock
  IF TG_OP = 'INSERT' THEN
    UPDATE inventory
    SET reserved_quantity = reserved_quantity + NEW.quantity
    WHERE variant_id = NEW.variant_id;
    RETURN NEW;
  END IF;

  -- Delivered: decrement real stock, release reservation, increment total_sold
  IF TG_OP = 'UPDATE' AND NEW.item_status = 'delivered' AND OLD.item_status != 'delivered' THEN
    UPDATE inventory
    SET
      quantity          = quantity - NEW.quantity,
      reserved_quantity = GREATEST(reserved_quantity - NEW.quantity, 0)
    WHERE variant_id = NEW.variant_id;

    UPDATE products SET total_sold = total_sold + NEW.quantity WHERE id = NEW.product_id;
    RETURN NEW;
  END IF;

  -- Cancelled (before shipped): release reservation only
  IF TG_OP = 'UPDATE'
    AND NEW.item_status = 'cancelled'
    AND OLD.item_status NOT IN ('cancelled', 'delivered', 'returned') THEN
    UPDATE inventory
    SET reserved_quantity = GREATEST(reserved_quantity - NEW.quantity, 0)
    WHERE variant_id = NEW.variant_id;
    RETURN NEW;
  END IF;

  RETURN NEW;
END;
$$;

CREATE TRIGGER trigger_update_inventory_on_order
  AFTER INSERT OR UPDATE OF item_status ON order_items
  FOR EACH ROW EXECUTE FUNCTION update_inventory_on_order();

-- compute_seller_payout(seller_id, period): returns unsettled delivered items for payout batch
CREATE OR REPLACE FUNCTION compute_seller_payout(
  p_seller_id    uuid,
  p_period_start date,
  p_period_end   date
)
  RETURNS TABLE(
    order_item_id     uuid,
    order_number      text,
    gross_amount      numeric,
    commission_rate   numeric,
    commission_amount numeric,
    refund_deduction  numeric,
    net_amount        numeric,
    settled_at        date
  ) LANGUAGE plpgsql STABLE AS $$
BEGIN
  RETURN QUERY
  SELECT
    oi.id                                                             AS order_item_id,
    o.order_number,
    oi.seller_payout_amount                                           AS gross_amount,
    oi.commission_rate,
    oi.commission_amount,
    COALESCE(SUM(r.amount), 0)::numeric                               AS refund_deduction,
    (oi.seller_payout_amount - COALESCE(SUM(r.amount), 0))::numeric   AS net_amount,
    (o.updated_at AT TIME ZONE 'Asia/Kolkata')::date                  AS settled_at
  FROM order_items oi
  JOIN orders      o  ON o.id = oi.order_id
  LEFT JOIN refunds r ON r.order_item_id = oi.id AND r.status = 'processed'
  WHERE oi.seller_id = p_seller_id
    AND oi.item_status = 'delivered'
    AND (o.updated_at AT TIME ZONE 'Asia/Kolkata')::date
          BETWEEN p_period_start AND p_period_end
    -- exclude items already included in a payout batch
    AND NOT EXISTS (
      SELECT 1 FROM payout_line_items pli WHERE pli.order_item_id = oi.id
    )
  GROUP BY oi.id, o.order_number, oi.seller_payout_amount,
           oi.commission_rate, oi.commission_amount, o.updated_at;
END;
$$;

-- ===========================================================================
-- ROW LEVEL SECURITY
-- ===========================================================================

ALTER TABLE users                ENABLE ROW LEVEL SECURITY;
ALTER TABLE buyer_profiles       ENABLE ROW LEVEL SECURITY;
ALTER TABLE seller_profiles      ENABLE ROW LEVEL SECURITY;
ALTER TABLE kyc_documents        ENABLE ROW LEVEL SECURITY;
ALTER TABLE categories           ENABLE ROW LEVEL SECURITY;
ALTER TABLE addresses            ENABLE ROW LEVEL SECURITY;
ALTER TABLE coupons              ENABLE ROW LEVEL SECURITY;
ALTER TABLE products             ENABLE ROW LEVEL SECURITY;
ALTER TABLE product_variants     ENABLE ROW LEVEL SECURITY;
ALTER TABLE product_images       ENABLE ROW LEVEL SECURITY;
ALTER TABLE product_price_history ENABLE ROW LEVEL SECURITY;
ALTER TABLE inventory            ENABLE ROW LEVEL SECURITY;
ALTER TABLE carts                ENABLE ROW LEVEL SECURITY;
ALTER TABLE cart_items           ENABLE ROW LEVEL SECURITY;
ALTER TABLE orders               ENABLE ROW LEVEL SECURITY;
ALTER TABLE order_items          ENABLE ROW LEVEL SECURITY;
ALTER TABLE payments             ENABLE ROW LEVEL SECURITY;
ALTER TABLE shipments            ENABLE ROW LEVEL SECURITY;
ALTER TABLE shipment_events      ENABLE ROW LEVEL SECURITY;
ALTER TABLE shipment_items       ENABLE ROW LEVEL SECURITY;
ALTER TABLE reviews              ENABLE ROW LEVEL SECURITY;
ALTER TABLE review_votes         ENABLE ROW LEVEL SECURITY;
ALTER TABLE wishlists            ENABLE ROW LEVEL SECURITY;
ALTER TABLE coupon_redemptions   ENABLE ROW LEVEL SECURITY;
ALTER TABLE disputes             ENABLE ROW LEVEL SECURITY;
ALTER TABLE dispute_messages     ENABLE ROW LEVEL SECURITY;
ALTER TABLE refunds              ENABLE ROW LEVEL SECURITY;
ALTER TABLE seller_payouts       ENABLE ROW LEVEL SECURITY;
ALTER TABLE payout_line_items    ENABLE ROW LEVEL SECURITY;
ALTER TABLE admin_logs           ENABLE ROW LEVEL SECURITY;
ALTER TABLE fraud_signals        ENABLE ROW LEVEL SECURITY;
ALTER TABLE notifications        ENABLE ROW LEVEL SECURITY;

-- ---------------------------------------------------------------------------
-- RLS POLICIES
-- ---------------------------------------------------------------------------

-- users
CREATE POLICY "users_read_own"    ON users FOR SELECT TO authenticated
  USING (id = auth.uid() OR is_admin());
CREATE POLICY "users_update_own"  ON users FOR UPDATE TO authenticated
  USING (id = auth.uid()) WITH CHECK (id = auth.uid() AND role = (SELECT role FROM users WHERE id = auth.uid()));
CREATE POLICY "admin_manage_users" ON users FOR ALL TO authenticated
  USING (is_admin());

-- buyer_profiles
CREATE POLICY "buyer_profiles_read_own"   ON buyer_profiles FOR SELECT TO authenticated
  USING (user_id = auth.uid() OR is_admin());
CREATE POLICY "buyer_profiles_insert_own" ON buyer_profiles FOR INSERT TO authenticated
  WITH CHECK (user_id = auth.uid());
CREATE POLICY "buyer_profiles_update_own" ON buyer_profiles FOR UPDATE TO authenticated
  USING (user_id = auth.uid()) WITH CHECK (user_id = auth.uid());

-- seller_profiles
CREATE POLICY "seller_profiles_public_read" ON seller_profiles FOR SELECT
  USING (is_active = true AND deleted_at IS NULL);
CREATE POLICY "seller_profiles_read_own"    ON seller_profiles FOR SELECT TO authenticated
  USING (user_id = auth.uid() OR is_admin());
CREATE POLICY "seller_profiles_insert_own"  ON seller_profiles FOR INSERT TO authenticated
  WITH CHECK (user_id = auth.uid());
CREATE POLICY "seller_profiles_update_own"  ON seller_profiles FOR UPDATE TO authenticated
  USING (user_id = auth.uid() AND deleted_at IS NULL)
  WITH CHECK (user_id = auth.uid() AND is_active = (SELECT is_active FROM seller_profiles WHERE id = seller_profiles.id));
CREATE POLICY "admin_all_seller_profiles"   ON seller_profiles FOR ALL TO authenticated
  USING (is_admin());

-- kyc_documents
CREATE POLICY "kyc_docs_read_own"   ON kyc_documents FOR SELECT TO authenticated
  USING (seller_id = get_seller_profile_id() OR is_admin());
CREATE POLICY "kyc_docs_insert_own" ON kyc_documents FOR INSERT TO authenticated
  WITH CHECK (seller_id = get_seller_profile_id());
CREATE POLICY "admin_all_kyc"       ON kyc_documents FOR ALL TO authenticated
  USING (is_admin());

-- categories (public read; admin full control)
CREATE POLICY "categories_public_read" ON categories FOR SELECT
  USING (is_active = true);
CREATE POLICY "admin_all_categories"   ON categories FOR ALL TO authenticated
  USING (is_admin());

-- addresses
CREATE POLICY "addresses_read_own"   ON addresses FOR SELECT TO authenticated
  USING (user_id = auth.uid() OR is_admin());
CREATE POLICY "addresses_insert_own" ON addresses FOR INSERT TO authenticated
  WITH CHECK (user_id = auth.uid());
CREATE POLICY "addresses_update_own" ON addresses FOR UPDATE TO authenticated
  USING (user_id = auth.uid() AND deleted_at IS NULL);
CREATE POLICY "addresses_delete_own" ON addresses FOR DELETE TO authenticated
  USING (user_id = auth.uid());

-- coupons (active ones public-readable for validation; admin manages)
CREATE POLICY "coupons_public_read" ON coupons FOR SELECT
  USING (is_active = true AND (expires_at IS NULL OR expires_at > now()));
CREATE POLICY "admin_all_coupons"   ON coupons FOR ALL TO authenticated
  USING (is_admin());

-- products
CREATE POLICY "products_public_read"      ON products FOR SELECT
  USING (status = 'active' AND deleted_at IS NULL);
CREATE POLICY "sellers_read_own_products" ON products FOR SELECT TO authenticated
  USING (seller_id = get_seller_profile_id() OR is_admin());
CREATE POLICY "sellers_insert_products"   ON products FOR INSERT TO authenticated
  WITH CHECK (seller_id = get_seller_profile_id());
CREATE POLICY "sellers_update_products"   ON products FOR UPDATE TO authenticated
  USING (seller_id = get_seller_profile_id() AND deleted_at IS NULL)
  WITH CHECK (seller_id = get_seller_profile_id() AND status != 'active'); -- active toggle via admin only
CREATE POLICY "admin_all_products"        ON products FOR ALL TO authenticated
  USING (is_admin());

-- product_variants
CREATE POLICY "variants_public_read"      ON product_variants FOR SELECT
  USING (EXISTS (
    SELECT 1 FROM products p
    WHERE p.id = product_variants.product_id AND p.status = 'active' AND p.deleted_at IS NULL
  ));
CREATE POLICY "sellers_manage_variants"   ON product_variants FOR ALL TO authenticated
  USING (EXISTS (
    SELECT 1 FROM products p
    WHERE p.id = product_variants.product_id AND p.seller_id = get_seller_profile_id()
  ) OR is_admin());

-- product_images
CREATE POLICY "images_public_read"      ON product_images FOR SELECT
  USING (EXISTS (
    SELECT 1 FROM products p
    WHERE p.id = product_images.product_id AND p.status = 'active' AND p.deleted_at IS NULL
  ));
CREATE POLICY "sellers_manage_images"   ON product_images FOR ALL TO authenticated
  USING (EXISTS (
    SELECT 1 FROM products p
    WHERE p.id = product_images.product_id AND p.seller_id = get_seller_profile_id()
  ) OR is_admin());

-- product_price_history
CREATE POLICY "price_history_public_read" ON product_price_history FOR SELECT
  USING (EXISTS (
    SELECT 1 FROM products p WHERE p.id = product_price_history.product_id AND p.status = 'active'
  ));
CREATE POLICY "admin_price_history"       ON product_price_history FOR ALL TO authenticated
  USING (is_admin());

-- inventory
CREATE POLICY "inventory_public_read"   ON inventory FOR SELECT
  USING (EXISTS (
    SELECT 1 FROM product_variants pv
    JOIN products p ON p.id = pv.product_id
    WHERE pv.id = inventory.variant_id AND p.status = 'active'
  ));
CREATE POLICY "sellers_manage_inventory" ON inventory FOR ALL TO authenticated
  USING (EXISTS (
    SELECT 1 FROM product_variants pv
    JOIN products p ON p.id = pv.product_id
    WHERE pv.id = inventory.variant_id AND p.seller_id = get_seller_profile_id()
  ) OR is_admin());

-- carts
CREATE POLICY "carts_read_own"   ON carts FOR SELECT TO authenticated
  USING (user_id = auth.uid() OR is_admin());
CREATE POLICY "carts_insert_own" ON carts FOR INSERT TO authenticated
  WITH CHECK (user_id = auth.uid());
CREATE POLICY "carts_update_own" ON carts FOR UPDATE TO authenticated
  USING (user_id = auth.uid());
CREATE POLICY "carts_delete_own" ON carts FOR DELETE TO authenticated
  USING (user_id = auth.uid());

-- cart_items
CREATE POLICY "cart_items_read_own" ON cart_items FOR SELECT TO authenticated
  USING (EXISTS (SELECT 1 FROM carts c WHERE c.id = cart_items.cart_id AND c.user_id = auth.uid()) OR is_admin());
CREATE POLICY "cart_items_insert"   ON cart_items FOR INSERT TO authenticated
  WITH CHECK (EXISTS (SELECT 1 FROM carts c WHERE c.id = cart_items.cart_id AND c.user_id = auth.uid()));
CREATE POLICY "cart_items_update"   ON cart_items FOR UPDATE TO authenticated
  USING (EXISTS (SELECT 1 FROM carts c WHERE c.id = cart_items.cart_id AND c.user_id = auth.uid()));
CREATE POLICY "cart_items_delete"   ON cart_items FOR DELETE TO authenticated
  USING (EXISTS (SELECT 1 FROM carts c WHERE c.id = cart_items.cart_id AND c.user_id = auth.uid()));

-- orders
CREATE POLICY "buyers_read_own_orders"    ON orders FOR SELECT TO authenticated
  USING (buyer_id = auth.uid() OR is_admin());
CREATE POLICY "sellers_read_orders"       ON orders FOR SELECT TO authenticated
  USING (EXISTS (
    SELECT 1 FROM order_items oi WHERE oi.order_id = orders.id AND oi.seller_id = get_seller_profile_id()
  ) OR is_admin());
CREATE POLICY "buyers_insert_orders"      ON orders FOR INSERT TO authenticated
  WITH CHECK (buyer_id = auth.uid());
CREATE POLICY "buyers_update_own_orders"  ON orders FOR UPDATE TO authenticated
  USING (buyer_id = auth.uid() AND status IN ('pending_payment', 'placed'));
CREATE POLICY "admin_all_orders"          ON orders FOR ALL TO authenticated
  USING (is_admin());

-- order_items
CREATE POLICY "buyers_read_own_order_items"   ON order_items FOR SELECT TO authenticated
  USING (EXISTS (SELECT 1 FROM orders o WHERE o.id = order_items.order_id AND o.buyer_id = auth.uid()) OR is_admin());
CREATE POLICY "sellers_read_own_order_items"  ON order_items FOR SELECT TO authenticated
  USING (seller_id = get_seller_profile_id() OR is_admin());
CREATE POLICY "sellers_update_own_order_items" ON order_items FOR UPDATE TO authenticated
  USING (seller_id = get_seller_profile_id());
CREATE POLICY "system_insert_order_items"     ON order_items FOR INSERT TO authenticated
  WITH CHECK (EXISTS (SELECT 1 FROM orders o WHERE o.id = order_items.order_id AND o.buyer_id = auth.uid()) OR is_admin());
CREATE POLICY "admin_all_order_items"         ON order_items FOR ALL TO authenticated
  USING (is_admin());

-- payments
CREATE POLICY "buyers_read_own_payments" ON payments FOR SELECT TO authenticated
  USING (EXISTS (SELECT 1 FROM orders o WHERE o.id = payments.order_id AND o.buyer_id = auth.uid()) OR is_admin());
CREATE POLICY "admin_all_payments"       ON payments FOR ALL TO authenticated
  USING (is_admin());

-- shipments
CREATE POLICY "buyers_read_shipments"     ON shipments FOR SELECT TO authenticated
  USING (EXISTS (SELECT 1 FROM orders o WHERE o.id = shipments.order_id AND o.buyer_id = auth.uid()) OR is_admin());
CREATE POLICY "sellers_manage_shipments"  ON shipments FOR ALL TO authenticated
  USING (seller_id = get_seller_profile_id() OR is_admin());

-- shipment_events
CREATE POLICY "shipment_events_read" ON shipment_events FOR SELECT TO authenticated
  USING (EXISTS (
    SELECT 1 FROM shipments s JOIN orders o ON o.id = s.order_id
    WHERE s.id = shipment_events.shipment_id
      AND (o.buyer_id = auth.uid() OR s.seller_id = get_seller_profile_id() OR is_admin())
  ));
CREATE POLICY "sellers_insert_events" ON shipment_events FOR INSERT TO authenticated
  WITH CHECK (EXISTS (
    SELECT 1 FROM shipments s WHERE s.id = shipment_events.shipment_id AND s.seller_id = get_seller_profile_id()
  ) OR is_admin());

-- shipment_items
CREATE POLICY "shipment_items_read" ON shipment_items FOR SELECT TO authenticated
  USING (
    EXISTS (SELECT 1 FROM shipments s WHERE s.id = shipment_items.shipment_id AND s.seller_id = get_seller_profile_id())
    OR EXISTS (
      SELECT 1 FROM order_items oi JOIN orders o ON o.id = oi.order_id
      WHERE oi.id = shipment_items.order_item_id AND o.buyer_id = auth.uid()
    )
    OR is_admin()
  );

-- reviews
CREATE POLICY "reviews_public_read"     ON reviews FOR SELECT
  USING (is_approved = true AND deleted_at IS NULL);
CREATE POLICY "buyers_insert_reviews"   ON reviews FOR INSERT TO authenticated
  WITH CHECK (
    buyer_id = auth.uid()
    AND EXISTS (
      SELECT 1 FROM order_items oi JOIN orders o ON o.id = oi.order_id
      WHERE oi.id = reviews.order_item_id AND o.buyer_id = auth.uid() AND oi.item_status = 'delivered'
    )
  );
CREATE POLICY "buyers_update_own_reviews" ON reviews FOR UPDATE TO authenticated
  USING (buyer_id = auth.uid() AND deleted_at IS NULL);
CREATE POLICY "admin_all_reviews"       ON reviews FOR ALL TO authenticated
  USING (is_admin());

-- review_votes
CREATE POLICY "review_votes_public_read" ON review_votes FOR SELECT USING (true);
CREATE POLICY "review_votes_insert_own"  ON review_votes FOR INSERT TO authenticated
  WITH CHECK (user_id = auth.uid());
CREATE POLICY "review_votes_update_own"  ON review_votes FOR UPDATE TO authenticated
  USING (user_id = auth.uid());

-- wishlists
CREATE POLICY "wishlists_read_own"   ON wishlists FOR SELECT TO authenticated
  USING (buyer_id = auth.uid() OR is_admin());
CREATE POLICY "wishlists_insert_own" ON wishlists FOR INSERT TO authenticated
  WITH CHECK (buyer_id = auth.uid());
CREATE POLICY "wishlists_delete_own" ON wishlists FOR DELETE TO authenticated
  USING (buyer_id = auth.uid());

-- coupon_redemptions
CREATE POLICY "redemptions_read_own" ON coupon_redemptions FOR SELECT TO authenticated
  USING (user_id = auth.uid() OR is_admin());
CREATE POLICY "redemptions_insert"   ON coupon_redemptions FOR INSERT TO authenticated
  WITH CHECK (user_id = auth.uid());
CREATE POLICY "admin_all_redemptions" ON coupon_redemptions FOR ALL TO authenticated
  USING (is_admin());

-- disputes
CREATE POLICY "disputes_read_buyer"  ON disputes FOR SELECT TO authenticated
  USING (buyer_id = auth.uid() OR is_admin());
CREATE POLICY "disputes_read_seller" ON disputes FOR SELECT TO authenticated
  USING (seller_id = get_seller_profile_id() OR is_admin());
CREATE POLICY "buyers_insert_disputes" ON disputes FOR INSERT TO authenticated
  WITH CHECK (buyer_id = auth.uid());
CREATE POLICY "buyers_update_disputes" ON disputes FOR UPDATE TO authenticated
  USING (buyer_id = auth.uid() AND status NOT IN ('resolved', 'closed'));
CREATE POLICY "admin_all_disputes"   ON disputes FOR ALL TO authenticated
  USING (is_admin());

-- dispute_messages
CREATE POLICY "dispute_messages_read" ON dispute_messages FOR SELECT TO authenticated
  USING (
    is_internal = false
    AND EXISTS (
      SELECT 1 FROM disputes d WHERE d.id = dispute_messages.dispute_id
      AND (d.buyer_id = auth.uid() OR d.seller_id = get_seller_profile_id())
    )
    OR is_admin()
  );
CREATE POLICY "dispute_messages_insert" ON dispute_messages FOR INSERT TO authenticated
  WITH CHECK (
    sender_id = auth.uid()
    AND (
      EXISTS (
        SELECT 1 FROM disputes d WHERE d.id = dispute_messages.dispute_id
        AND (d.buyer_id = auth.uid() OR d.seller_id = get_seller_profile_id())
        AND d.status NOT IN ('resolved', 'closed')
      )
      OR is_admin()
    )
  );
CREATE POLICY "admin_all_dispute_messages" ON dispute_messages FOR ALL TO authenticated
  USING (is_admin());

-- refunds
CREATE POLICY "refunds_read_buyer" ON refunds FOR SELECT TO authenticated
  USING (EXISTS (SELECT 1 FROM orders o WHERE o.id = refunds.order_id AND o.buyer_id = auth.uid()) OR is_admin());
CREATE POLICY "admin_all_refunds"  ON refunds FOR ALL TO authenticated
  USING (is_admin());

-- seller_payouts
CREATE POLICY "seller_payouts_read_own" ON seller_payouts FOR SELECT TO authenticated
  USING (seller_id = get_seller_profile_id() OR is_admin());
CREATE POLICY "admin_all_payouts"       ON seller_payouts FOR ALL TO authenticated
  USING (is_admin());

-- payout_line_items
CREATE POLICY "payout_items_read_own" ON payout_line_items FOR SELECT TO authenticated
  USING (EXISTS (
    SELECT 1 FROM seller_payouts sp WHERE sp.id = payout_line_items.payout_id AND sp.seller_id = get_seller_profile_id()
  ) OR is_admin());
CREATE POLICY "admin_all_payout_items" ON payout_line_items FOR ALL TO authenticated
  USING (is_admin());

-- admin_logs  (SELECT only via RLS; INSERT allowed from admin; UPDATE/DELETE never)
CREATE POLICY "admin_logs_read"   ON admin_logs FOR SELECT TO authenticated
  USING (is_admin());
CREATE POLICY "admin_logs_insert" ON admin_logs FOR INSERT TO authenticated
  WITH CHECK (is_admin());

-- fraud_signals (admin only)
CREATE POLICY "fraud_signals_admin_only" ON fraud_signals FOR ALL TO authenticated
  USING (is_admin());

-- notifications
CREATE POLICY "notifications_read_own"   ON notifications FOR SELECT TO authenticated
  USING (user_id = auth.uid() OR is_admin());
CREATE POLICY "notifications_update_own" ON notifications FOR UPDATE TO authenticated
  USING (user_id = auth.uid());
CREATE POLICY "system_insert_notifications" ON notifications FOR INSERT TO authenticated
  WITH CHECK (is_admin());
