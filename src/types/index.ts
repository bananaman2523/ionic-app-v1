// ===== Database Types (Supabase) =====

// User (ลูกค้า)
export interface User {
    user_id: string;
    name: string;
    address: string;
    phone: string;
    status: 'normal' | 'has_pending' | 'suspended'; // ปกติ/มีค้างชำระ/งดบริการ
    created_at: string;
    updated_at: string;
}

// Product (สินค้า)
export interface Product {
    product_id: string;
    name: string; // ถังใหญ่, ขวดเล็ก ฯลฯ
    cost_price: number; // ราคาต้นทุน
    sell_price: number; // ราคาขาย
    unit: string; // หน่วยนับ (ถัง/ขวด)
    stock_quantity: number; // สต็อกคงเหลือ
    created_at: string;
    updated_at: string;
}

// Order (การสั่งจอง/สั่งน้ำ)
export interface Order {
    order_id: string;
    user_id: string;
    order_date: string; // วันที่สั่งจอง
    product_id: string;
    quantity: number; // จำนวนถัง/ขวดที่สั่ง
    status: 'completed' | 'pending' | 'cancelled'; // สำเร็จ/รอยืนยัน/ยกเลิก
    price_per_unit: number; // ราคาต่อหน่วย
    total_price: number; // ราคารวม
    payment_method: 'cash' | 'transfer'; // วิธีการจ่ายเงิน (สด/โอน)
    payment_date: string | null; // วันที่จ่ายเงิน
    payment_status: 'paid' | 'pending'; // จ่ายแล้ว/ค้างชำระ
    created_at: string;
    updated_at: string;
}

// Inventory (คลังสินค้า)
export interface Inventory {
    inventory_id: string;
    product_id: string;
    date: string; // วันที่นับสต็อก
    quantity: number; // จำนวนคงเหลือ
    type: 'in' | 'out' | 'return' | 'loss'; // รับเข้า/จ่ายออก/คืน/สูญเสีย
    note: string | null; // หมายเหตุ
    order_id: string | null; // อ้างถึง order (ถ้ามี)
    created_at: string;
}

// Daily_Report (สรุปรายวัน)
export interface DailyReport {
    report_id: string;
    date: string; // วันที่
    total_sales: number; // ยอดขายรวม
    cash_received: number; // เงินสดที่ได้รับ
    pending_amount: number; // ยอดค้างชำระ
    total_orders: number; // จำนวนออเดอร์
    new_customers: number; // ลูกค้าที่เพิ่มใหม่
    created_at: string;
}

// Payment (การรับชำระ) -- ใช้แยกต่างหากกรณีลูกค้าค้างชำระแล้วชำระภายหลัง
export interface Payment {
    payment_id: string;
    user_id: string;
    payment_date: string; // วันที่รับเงิน
    amount: number; // จำนวนเงิน
    order_id: string | null; // อ้างถึง order_id หรือค้างจ่ายสุทธิ
    payment_method: 'cash' | 'transfer'; // วิธีการรับเงิน
    note: string | null;
    created_at: string;
}

// ===== Additional Types for UI =====

export interface OrderWithDetails extends Order {
    user_name?: string;
    product_name?: string;
    user_phone?: string;
    cancellation_reason?: 'return' | 'loss' | null;
}

export interface PendingPaymentInfo {
    order_id: string;
    user_id: string;
    user_name: string;
    order_date: string;
    amount: number;
    days_overdue: number;
}

export interface MonthlySummary {
    month: number;
    year: number;
    total_revenue: number;
    total_cost: number;
    profit: number;
    total_pending: number;
    new_customers: number;
    total_orders: number;
}

export interface StockAlert {
    product_id: string;
    product_name: string;
    current_stock: number;
    min_stock: number;
}
