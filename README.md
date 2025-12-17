# แอปพลิเคชันขายน้ำดื่ม (Water Delivery Management App)

แอปพลิเคชันสำหรับจัดการธุรกิจขายน้ำดื่ม พัฒนาด้วย Ionic Vue + Supabase

## ฟีเจอร์หลัก

### 1. ระบบออเดอร์/สั่งจองรายวัน (Tab 1)

- ✅ เพิ่ม/ลบ/แก้ไข/ดู ออเดอร์แต่ละวัน
- ✅ เลือกลูกค้า, จำนวน, ประเภทสินค้า
- ✅ เช็คสต็อกอัตโนมัติ (ถ้าสินค้าไม่พอ ให้แจ้งเตือน)
- ✅ เสนอราคาขายและสรุปราคาสุทธิ
- ✅ ระบบกรองตามสถานะ (ทั้งหมด/รอยืนยัน/สำเร็จ/ยกเลิก)
- ✅ เลือกวันที่ดูออเดอร์
- ✅ อัพเดทสถานะชำระเงิน

### 2. สรุปยอดรายวัน (Tab 2)

- ✅ สรุปออเดอร์วันนี้, จำนวนถังที่ขาย, ยอดเงิน
- ✅ รายการค้างชำระใหม่ (ลูกค้ายังไม่ได้ชำระวันนี้)
- ✅ ดูจำนวนเงินที่ได้รับจริง
- ✅ แสดงกำไรประมาณการ
- ✅ แยกตามวิธีการชำระเงิน (สด/โอน)

### 3. ข้อมูลค้างชำระ & รายชื่อลูกค้า (Tab 3)

#### ค้างชำระ:

- ✅ รายงานลูกค้าที่ค้างชำระทั้งหมด
- ✅ ระบุจำนวนวันที่ค้าง, ยอดเงิน, ออเดอร์ที่เกี่ยวข้อง
- ✅ เมื่อลูกค้าจ่ายค้างชำระ สามารถระบุได้ว่าคือค่าของวันไหน
- ✅ ติดต่อลูกค้าโดยตรง (โทรออก)

#### รายชื่อลูกค้า:

- ✅ รายชื่อลูกค้า, เบอร์ติดต่อ, สถานะ
- ✅ ดูประวัติการสั่งซื้อย้อนหลัง
- ✅ เพิ่ม/แก้ไข/ระงับ บัญชีลูกค้า
- ✅ ค้นหาและกรองลูกค้า

### 4. คลังสินค้า/สต็อก

- ✅ รายการการรับเข้า/จ่ายออก/คืนสินค้า (อัตโนมัติเมื่อสร้างออเดอร์)
- ✅ สรุปคงเหลือในแต่ละวัน
- ✅ แจ้งเตือนเมื่อสินค้าใกล้หมด
- ✅ อัพเดทสต็อกด้วยตนเอง

### 5. สรุปรายเดือน/รายปี

- ✅ ยอดขายรวม
- ✅ ยอดค้างชำระ
- ✅ กำไร (หักต้นทุน)
- ✅ ลูกค้าใหม่ที่เพิ่มขึ้น

## โครงสร้างฐานข้อมูล (Supabase)

### Tables:

1. **users** - ข้อมูลลูกค้า
2. **products** - สินค้า (ถังน้ำ, ขวดน้ำ)
3. **orders** - ออเดอร์/การสั่งจอง
4. **inventory** - คลังสินค้า/ประวัติสต็อก
5. **daily_reports** - รายงานสรุปรายวัน
6. **payments** - การรับชำระเงิน

## การติดตั้งและใช้งาน

### 1. ติดตั้ง Dependencies

```bash
npm install
npm install @supabase/supabase-js
```

### 2. ตั้งค่า Supabase

1. สร้างโปรเจคใหม่ที่ [Supabase](https://supabase.com)
2. ไปที่ SQL Editor และรันไฟล์ `supabase-schema.sql`
3. คัดลอก Project URL และ Anon Key จาก Settings > API

### 3. ตั้งค่า Environment Variables

สร้างไฟล์ `.env` ที่ root ของโปรเจค:

```bash
cp .env.example .env
```

แก้ไขไฟล์ `.env`:

```env
VITE_SUPABASE_URL=https://your-project.supabase.co
VITE_SUPABASE_ANON_KEY=your-anon-key
```

### 4. รันแอปพลิเคชัน

```bash
# Development mode
npm run dev

# หรือใช้ Ionic CLI
ionic serve
```

### 5. Build สำหรับ Production

```bash
npm run build
```

## โครงสร้างโปรเจค

```
src/
├── components/          # Vue components
├── lib/
│   └── supabase.ts     # Supabase client config
├── services/            # API services
│   ├── orderService.ts
│   ├── userService.ts
│   ├── productService.ts
│   ├── paymentService.ts
│   └── reportService.ts
├── types/
│   ├── index.ts        # Type definitions
│   └── supabase.ts     # Supabase database types
├── views/
│   ├── Tab1Page.vue    # ระบบออเดอร์
│   ├── Tab2Page.vue    # สรุปรายวัน
│   └── Tab3Page.vue    # ลูกค้า & ค้างชำระ
└── router/
    └── index.ts        # Route configuration
```

## ข้อมูลตัวอย่าง (Sample Data)

ไฟล์ `supabase-schema.sql` มีข้อมูลตัวอย่างดังนี้:

### สินค้า (Products):

- ถังน้ำดื่ม 20 ลิตร - 25 บาท
- ขวดน้ำดื่ม 600ml - 7 บาท
- ขวดน้ำดื่ม 1.5 ลิตร - 12 บาท

### ลูกค้า (Users):

- คุณสมชาย ใจดี
- ร้านกาแฟดีดี
- บริษัท ABC จำกัด

## ฟีเจอร์พิเศษ

### อัตโนมัติ (Automated Features):

- ✅ ลดสต็อกอัตโนมัติเมื่อสร้างออเดอร์
- ✅ คืนสต็อกอัตโนมัติเมื่อยกเลิกออเดอร์
- ✅ บันทึกประวัติคลังสินค้าอัตโนมัติ
- ✅ อัพเดทรายงานรายวันอัตโนมัติ
- ✅ เช็คสต็อกก่อนสร้างออเดอร์

### การแจ้งเตือน:

- ⚠️ แจ้งเตือนเมื่อสต็อกไม่พอ
- ⚠️ แจ้งเตือนเมื่อสินค้าใกล้หมด
- ⚠️ แสดงจำนวนวันค้างชำระ

## การพัฒนาต่อ (Future Enhancements)

- [ ] ระบบแจ้งเตือนแบบ Push Notification
- [ ] Export รายงานเป็น PDF/Excel
- [ ] Dashboard แสดงกราฟสถิติ
- [ ] ระบบจัดการพนักงานขาย
- [ ] GPS tracking สำหรับการส่งสินค้า
- [ ] Barcode/QR Code scanning
- [ ] Multi-language support
- [ ] Dark mode

## เทคโนโลยีที่ใช้

- **Frontend**: Ionic Framework 8 + Vue 3
- **Backend**: Supabase (PostgreSQL)
- **UI Components**: Ionic Vue Components
- **Icons**: Ionicons
- **Language**: TypeScript
- **Build Tool**: Vite

## การ Deploy

### Capacitor (Mobile App):

```bash
# iOS
ionic capacitor add ios
ionic capacitor build ios

# Android
ionic capacitor add android
ionic capacitor build android
```

### Web Hosting:

```bash
npm run build
# Deploy folder 'dist' to your hosting service
```

## License

MIT

## ผู้พัฒนา

สร้างด้วย ❤️ โดยใช้ Ionic + Supabase
