-- ===== Supabase Database Schema for Water Delivery App =====
-- คำแนะนำ: รันไฟล์นี้ใน Supabase SQL Editor

-- Enable UUID extension
CREATE EXTENSION IF NOT EXISTS "uuid-ossp";

-- ===== User (ลูกค้า) Table =====
CREATE TABLE users (
  user_id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  name VARCHAR(255) NOT NULL,
  address TEXT,
  phone VARCHAR(20) NOT NULL,
  status VARCHAR(20) DEFAULT 'normal' CHECK (status IN ('normal', 'has_pending', 'suspended')),
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- ===== Product (สินค้า) Table =====
CREATE TABLE products (
  product_id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  name VARCHAR(255) NOT NULL,
  cost_price DECIMAL(10, 2) NOT NULL DEFAULT 0,
  sell_price DECIMAL(10, 2) NOT NULL,
  unit VARCHAR(50) NOT NULL,
  stock_quantity INTEGER NOT NULL DEFAULT 0,
  min_stock INTEGER DEFAULT 10,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- ===== Order (การสั่งจอง/สั่งน้ำ) Table =====
CREATE TABLE orders (
  order_id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  user_name TEXT NOT NULL,
  order_date TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT NOW(),
  product_id UUID NOT NULL REFERENCES products(product_id),
  quantity INTEGER NOT NULL,
  status VARCHAR(20) DEFAULT 'pending' CHECK (status IN ('completed', 'pending', 'cancelled')),
  price_per_unit DECIMAL(10, 2) NOT NULL,
  total_price DECIMAL(10, 2) NOT NULL,
  payment_method VARCHAR(20) CHECK (payment_method IN ('cash', 'transfer')),
  payment_date TIMESTAMP WITH TIME ZONE,
  payment_status VARCHAR(20) DEFAULT 'pending' CHECK (payment_status IN ('paid', 'pending')),
  note TEXT,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- ===== Inventory (คลังสินค้า) Table =====
CREATE TABLE inventory (
  inventory_id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  product_id UUID NOT NULL REFERENCES products(product_id) ON DELETE CASCADE,
  date TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT NOW(),
  quantity INTEGER NOT NULL,
  type VARCHAR(20) NOT NULL CHECK (type IN ('in', 'out', 'return', 'loss')),
  note TEXT,
  order_id UUID REFERENCES orders(order_id) ON DELETE SET NULL,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- ===== Daily_Report (สรุปรายวัน) Table =====
CREATE TABLE daily_reports (
  report_id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  date TIMESTAMP WITH TIME ZONE NOT NULL UNIQUE,
  total_sales DECIMAL(12, 2) DEFAULT 0,
  cash_received DECIMAL(12, 2) DEFAULT 0,
  pending_amount DECIMAL(12, 2) DEFAULT 0,
  total_orders INTEGER DEFAULT 0,
  new_customers INTEGER DEFAULT 0,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- ===== Payment (การรับชำระ) Table =====
CREATE TABLE payments (
  payment_id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  user_id UUID NOT NULL REFERENCES users(user_id) ON DELETE CASCADE,
  payment_date TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT NOW(),
  amount DECIMAL(10, 2) NOT NULL,
  order_id UUID REFERENCES orders(order_id) ON DELETE SET NULL,
  payment_method VARCHAR(20) NOT NULL CHECK (payment_method IN ('cash', 'transfer')),
  note TEXT,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- ===== Indexes for Better Performance =====
CREATE INDEX idx_orders_user_name ON orders(user_name);
CREATE INDEX idx_orders_order_date ON orders(order_date);
CREATE INDEX idx_orders_payment_status ON orders(payment_status);
CREATE INDEX idx_inventory_product_id ON inventory(product_id);
CREATE INDEX idx_inventory_date ON inventory(date);
CREATE INDEX idx_payments_user_id ON payments(user_id);
CREATE INDEX idx_payments_payment_date ON payments(payment_date);
CREATE INDEX idx_daily_reports_date ON daily_reports(date);

-- ===== Triggers for Updated_at =====
CREATE OR REPLACE FUNCTION update_updated_at_column()
RETURNS TRIGGER AS $$
BEGIN
  NEW.updated_at = NOW();
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

CREATE TRIGGER update_users_updated_at BEFORE UPDATE ON users
  FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();

CREATE TRIGGER update_products_updated_at BEFORE UPDATE ON products
  FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();

CREATE TRIGGER update_orders_updated_at BEFORE UPDATE ON orders
  FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();

-- ===== Function: Update Stock on Order =====
CREATE OR REPLACE FUNCTION update_stock_on_order()
RETURNS TRIGGER AS $$
BEGIN
  -- เมื่อสั่งออเดอร์ใหม่ ลดสต็อก
  IF (TG_OP = 'INSERT' AND NEW.status = 'completed') THEN
    UPDATE products 
    SET stock_quantity = stock_quantity - NEW.quantity
    WHERE product_id = NEW.product_id;
    
    -- บันทึกลง inventory
    INSERT INTO inventory (product_id, quantity, type, order_id, note)
    VALUES (NEW.product_id, NEW.quantity, 'out', NEW.order_id, 'Auto: Order completed');
    
  -- เมื่อยกเลิกออเดอร์ คืนสต็อก
  ELSIF (TG_OP = 'UPDATE' AND OLD.status != 'cancelled' AND NEW.status = 'cancelled') THEN
    UPDATE products 
    SET stock_quantity = stock_quantity + NEW.quantity
    WHERE product_id = NEW.product_id;
    
    -- บันทึกลง inventory
    INSERT INTO inventory (product_id, quantity, type, order_id, note)
    VALUES (NEW.product_id, NEW.quantity, 'return', NEW.order_id, 'Auto: Order cancelled');
  END IF;
  
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

CREATE TRIGGER trigger_update_stock_on_order
  AFTER INSERT OR UPDATE ON orders
  FOR EACH ROW EXECUTE FUNCTION update_stock_on_order();

-- ===== Function: Update Daily Report =====
CREATE OR REPLACE FUNCTION update_daily_report()
RETURNS TRIGGER AS $$
DECLARE
  report_date DATE;
BEGIN
  IF (TG_OP = 'INSERT') THEN
    report_date := NEW.order_date;
  ELSE
    report_date := OLD.order_date;
  END IF;

  -- อัพเดทหรือสร้าง daily report
  INSERT INTO daily_reports (date, total_sales, cash_received, pending_amount, total_orders)
  VALUES (
    report_date,
    (SELECT COALESCE(SUM(total_price), 0) FROM orders WHERE order_date = report_date AND status = 'completed'),
    (SELECT COALESCE(SUM(total_price), 0) FROM orders WHERE order_date = report_date AND payment_status = 'paid'),
    (SELECT COALESCE(SUM(total_price), 0) FROM orders WHERE order_date = report_date AND payment_status = 'pending'),
    (SELECT COUNT(*) FROM orders WHERE order_date = report_date)
  )
  ON CONFLICT (date) 
  DO UPDATE SET
    total_sales = EXCLUDED.total_sales,
    cash_received = EXCLUDED.cash_received,
    pending_amount = EXCLUDED.pending_amount,
    total_orders = EXCLUDED.total_orders;

  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

CREATE TRIGGER trigger_update_daily_report
  AFTER INSERT OR UPDATE OR DELETE ON orders
  FOR EACH ROW EXECUTE FUNCTION update_daily_report();

-- ===== Sample Data (ข้อมูลตัวอย่าง) =====
-- Products
INSERT INTO products (name, cost_price, sell_price, unit, stock_quantity, min_stock) VALUES
  ('ถังน้ำดื่ม 20 ลิตร', 15.00, 25.00, 'ถัง', 100, 20),
  ('ขวดน้ำดื่ม 600ml', 3.00, 7.00, 'ขวด', 200, 50),
  ('ขวดน้ำดื่ม 1.5 ลิตร', 5.00, 12.00, 'ขวด', 150, 30);

-- Users
INSERT INTO users (name, address, phone, status) VALUES
  ('คุณสมชาย ใจดี', '123 ถ.รามคำแหง กรุงเทพฯ', '081-234-5678', 'normal'),
  ('ร้านกาแฟดีดี', '456 ถ.สุขุมวิท กรุงเทพฯ', '082-345-6789', 'normal'),
  ('บริษัท ABC จำกัด', '789 ถ.พระราม 9 กรุงเทพฯ', '083-456-7890', 'normal');

-- ===== Row Level Security (RLS) - Optional =====
-- Uncomment if you want to enable RLS
-- ALTER TABLE users ENABLE ROW LEVEL SECURITY;
-- ALTER TABLE products ENABLE ROW LEVEL SECURITY;
-- ALTER TABLE orders ENABLE ROW LEVEL SECURITY;
-- ALTER TABLE inventory ENABLE ROW LEVEL SECURITY;
-- ALTER TABLE payments ENABLE ROW LEVEL SECURITY;
-- ALTER TABLE daily_reports ENABLE ROW LEVEL SECURITY;

-- Example policy (adjust based on your auth needs)
-- CREATE POLICY "Enable read access for all users" ON users FOR SELECT USING (true);
