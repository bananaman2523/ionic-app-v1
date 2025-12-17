#!/bin/bash

echo "🚀 กำลังติดตั้ง dependencies สำหรับแอปขายน้ำดื่ม..."

# Install Supabase client
echo "📦 ติดตั้ง @supabase/supabase-js..."
npm install @supabase/supabase-js

echo "✅ ติดตั้งเสร็จสิ้น!"
echo ""
echo "📝 ขั้นตอนต่อไป:"
echo "1. สร้างโปรเจค Supabase ที่ https://supabase.com"
echo "2. รันไฟล์ supabase-schema.sql ใน SQL Editor"
echo "3. คัดลอก .env.example เป็น .env"
echo "4. ใส่ SUPABASE_URL และ SUPABASE_ANON_KEY ใน .env"
echo "5. รันคำสั่ง: npm run dev หรือ ionic serve"
echo ""
