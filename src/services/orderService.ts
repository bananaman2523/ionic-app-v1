import { supabase } from '../lib/supabase'
import type { Database } from '../types/supabase'

type Order = Database['public']['Tables']['orders']['Row']
type OrderInsert = Database['public']['Tables']['orders']['Insert']
type OrderUpdate = Database['public']['Tables']['orders']['Update']

export interface OrderWithDetails extends Order {
    user_name?: string
    product_name?: string
    user_phone?: string
}

// ===== Create Order =====
export async function createOrder(orderData: OrderInsert) {
    try {
        // ตรวจสอบสต็อก
        const { data: product, error: productError } = await supabase
            .from('products')
            .select('stock_quantity, name')
            .eq('product_id', orderData.product_id)
            .single()

        if (productError) throw productError
        if (!product) throw new Error('ไม่พบสินค้า')

        if ((product as any).stock_quantity < orderData.quantity) {
            throw new Error(`สต็อก ${(product as any).name} ไม่เพียงพอ (คงเหลือ ${(product as any).stock_quantity} ${orderData.quantity > 1 ? 'ชิ้น' : 'ชิ้น'})`)
        }

        // สร้าง order
        const { data, error } = await supabase
            .from('orders')
            .insert(orderData as any)
            .select()
            .single()

        if (error) throw error
        return { data, error: null }
    } catch (error: any) {
        return { data: null, error: error.message }
    }
}

// ===== Create Bulk Orders (สำหรับตะกร้าสินค้า) =====
export async function createBulkOrders(params: {
    customerName: string
    items: Array<{ productName: string; qty: number }>
    paymentMethod: 'cash' | 'qr' | 'credit'
    orderDate?: string
}) {
    try {
        const { customerName, items, paymentMethod, orderDate } = params
        const today = orderDate || new Date().toISOString()

        // ดึงข้อมูลสินค้าทั้งหมด
        const { data: allProducts, error: productsError } = await supabase
            .from('products')
            .select('*')

        if (productsError) throw productsError
        if (!allProducts || allProducts.length === 0) throw new Error('ไม่พบข้อมูลสินค้า')

        // สร้าง orders
        const ordersToInsert = []

        for (const item of items) {
            const product = allProducts.find((p: any) => p.name === item.productName)
            if (!product) {
                throw new Error(`ไม่พบสินค้า: ${item.productName}`)
            }

            // ตรวจสอบสต็อก
            if ((product as any).stock_quantity !== null && item.qty > (product as any).stock_quantity) {
                throw new Error(`สต็อก ${item.productName} ไม่เพียงพอ (คงเหลือ ${(product as any).stock_quantity})`)
            }

            const totalPrice = ((product as any).sell_price || 0) * item.qty
            const paymentStatus = paymentMethod === 'credit' ? 'pending' : 'paid'
            const actualPaymentMethod = paymentMethod === 'qr' ? 'transfer' : paymentMethod === 'credit' ? 'cash' : 'cash'

            ordersToInsert.push({
                user_name: customerName,
                product_id: (product as any).product_id,
                order_date: today,
                quantity: item.qty,
                price_per_unit: (product as any).sell_price || 0,
                total_price: totalPrice,
                payment_method: actualPaymentMethod,
                payment_status: paymentStatus,
                payment_date: paymentStatus === 'paid' ? today : null,
                status: 'completed'
            })
        }

        // บันทึกทั้งหมด
        const { data, error } = await supabase
            .from('orders')
            .insert(ordersToInsert as any)
            .select()

        if (error) throw error

        // อัพเดทสต็อกและบันทึก inventory
        for (let i = 0; i < items.length; i++) {
            const item = items[i]
            const product = allProducts.find((p: any) => p.name === item.productName)
            const orderData = data?.[i]

            if (product && (product as any).stock_quantity !== null) {
                const newStock = (product as any).stock_quantity - item.qty

                // อัพเดทสต็อก
                await supabase
                    .from('products')
                    .update({ stock_quantity: newStock } as any)
                    .eq('product_id', (product as any).product_id)

                // บันทึกประวัติ inventory
                await supabase
                    .from('inventory')
                    .insert({
                        product_id: (product as any).product_id,
                        date: today,
                        quantity: item.qty,
                        type: 'out',
                        note: `ขายให้ลูกค้า: ${customerName}`,
                        order_id: orderData?.order_id || null
                    } as any)
            }
        }

        return { data, error: null }
    } catch (error: any) {
        return { data: null, error: error.message }
    }
}

// ===== Get Orders =====
export async function getOrders(filters?: {
    date?: string
    user_id?: string
    payment_status?: 'paid' | 'pending'
    status?: 'completed' | 'pending' | 'cancelled'
}) {
    try {
        let query = supabase
            .from('orders')
            .select(`
        *,
        products (name, unit)
      `)
            .order('created_at', { ascending: false })

        if (filters?.date) {
            // ถ้ามี date filter ให้เทียบแบบ range ของวันนั้น
            const startOfDay = new Date(filters.date)
            startOfDay.setHours(0, 0, 0, 0)
            const endOfDay = new Date(filters.date)
            endOfDay.setHours(23, 59, 59, 999)
            query = query.gte('order_date', startOfDay.toISOString()).lte('order_date', endOfDay.toISOString())
        }
        if (filters?.user_id) {
            query = query.eq('user_id', filters.user_id)
        }
        if (filters?.payment_status) {
            query = query.eq('payment_status', filters.payment_status)
        }
        if (filters?.status) {
            query = query.eq('status', filters.status)
        }

        const { data, error } = await query

        if (error) throw error

        // Transform data to include product names
        const ordersWithDetails: OrderWithDetails[] = data?.map((order: any) => ({
            ...order,
            product_name: order.products?.name,
        })) || []

        return { data: ordersWithDetails, error: null }
    } catch (error: any) {
        return { data: null, error: error.message }
    }
}

// ===== Get Order by ID =====
export async function getOrderById(order_id: string) {
    try {
        const { data, error } = await supabase
            .from('orders')
            .select(`
        *,
        users (name, phone, address),
        products (name, unit, sell_price)
      `)
            .eq('order_id', order_id)
            .single()

        if (error) throw error
        return { data, error: null }
    } catch (error: any) {
        return { data: null, error: error.message }
    }
}

// ===== Update Order =====
export async function updateOrder(order_id: string, updates: OrderUpdate) {
    try {
        const { data, error } = await supabase
            .from('orders' as any)
            .update(updates as any)
            .eq('order_id', order_id)
            .select()
            .single()

        if (error) throw error
        return { data, error: null }
    } catch (error: any) {
        return { data: null, error: error.message }
    }
}

// ===== Delete Order =====
export async function deleteOrder(order_id: string) {
    try {
        const { error } = await supabase
            .from('orders')
            .delete()
            .eq('order_id', order_id)

        if (error) throw error
        return { error: null }
    } catch (error: any) {
        return { error: error.message }
    }
}

// ===== Get Today's Orders Summary =====
export async function getTodayOrdersSummary() {
    try {
        const startOfDay = new Date()
        startOfDay.setHours(0, 0, 0, 0)
        const endOfDay = new Date()
        endOfDay.setHours(23, 59, 59, 999)

        const { data, error } = await supabase
            .from('orders')
            .select('*')
            .gte('order_date', startOfDay.toISOString())
            .lte('order_date', endOfDay.toISOString())

        if (error) throw error

        const totalOrders = data?.length || 0
        const totalBottles = data?.reduce((sum: number, order: any) => sum + order.quantity, 0) || 0
        const totalRevenue = data?.reduce((sum: number, order: any) => sum + order.total_price, 0) || 0
        const cashReceived = data
            ?.filter((order: any) => order.payment_status === 'paid')
            .reduce((sum: number, order: any) => sum + order.total_price, 0) || 0
        const pendingAmount = data
            ?.filter((order: any) => order.payment_status === 'pending')
            .reduce((sum: number, order: any) => sum + order.total_price, 0) || 0

        return {
            data: {
                totalOrders,
                totalBottles,
                totalRevenue,
                cashReceived,
                pendingAmount,
                orders: data || []
            },
            error: null
        }
    } catch (error: any) {
        return { data: null, error: error.message }
    }
}

// ===== Update Payment Status =====
export async function updatePaymentStatus(
    order_id: string,
    payment_status: 'paid' | 'pending',
    payment_date?: string,
    payment_method?: 'cash' | 'transfer'
) {
    try {
        const updates: OrderUpdate = {
            payment_status,
            payment_date: payment_date || new Date().toISOString(),
        }

        if (payment_method) {
            updates.payment_method = payment_method
        }

        const { data, error } = await supabase
            .from('orders' as any)
            .update(updates as any)
            .eq('order_id', order_id)
            .select()
            .single()

        if (error) throw error
        return { data, error: null }
    } catch (error: any) {
        return { data: null, error: error.message }
    }
}

// ===== Cancel Order with Stock Management =====
export async function cancelOrderWithReason(
    order_id: string,
    cancellation_reason: 'return' | 'loss',
    cancel_quantity?: number
) {
    try {
        // ดึงข้อมูล order
        const { data: order, error: orderError } = await supabase
            .from('orders')
            .select('*')
            .eq('order_id', order_id)
            .single()

        if (orderError) throw orderError
        if (!order) throw new Error('ไม่พบออเดอร์')

        const orderData = order as any
        const quantityToCancel = cancel_quantity || orderData.quantity

        // ตรวจสอบจำนวนที่ยกเลิก
        if (quantityToCancel > orderData.quantity) {
            throw new Error('จำนวนที่ยกเลิกมากกว่าจำนวนในออเดอร์')
        }

        // ถ้ายกเลิกบางส่วน
        if (quantityToCancel < orderData.quantity) {
            const remainingQuantity = orderData.quantity - quantityToCancel

            // สร้าง order ใหม่สำหรับส่วนที่ยกเลิก
            const cancelledOrder = {
                user_name: orderData.user_name,
                order_date: orderData.order_date,
                product_id: orderData.product_id,
                quantity: quantityToCancel,
                status: 'cancelled',
                price_per_unit: orderData.price_per_unit,
                total_price: orderData.price_per_unit * quantityToCancel,
                payment_method: orderData.payment_method,
                payment_date: orderData.payment_date,
                payment_status: orderData.payment_status,
                cancellation_reason,
                note: orderData.note
            }

            // สร้าง order ที่ยกเลิก
            const { error: insertError } = await supabase
                .from('orders')
                .insert(cancelledOrder as any)

            if (insertError) throw insertError

            // อัพเดท order เดิมให้เหลือเฉพาะจำนวนที่ไม่ยกเลิก
            const { error: updateError } = await supabase
                .from('orders')
                .update({
                    quantity: remainingQuantity,
                    total_price: orderData.price_per_unit * remainingQuantity
                } as any)
                .eq('order_id', order_id)

            if (updateError) throw updateError
        } else {
            // ยกเลิกทั้งหมด - อัพเดทสถานะออเดอร์
            const { error: updateError } = await supabase
                .from('orders')
                .update({
                    status: 'cancelled',
                    cancellation_reason
                } as any)
                .eq('order_id', order_id)

            if (updateError) throw updateError
        }

        // ถ้าเป็น return ให้คืนสต็อก
        if (cancellation_reason === 'return') {
            // ดึงข้อมูลสินค้าปัจจุบัน
            const { data: product, error: productError } = await supabase
                .from('products')
                .select('stock_quantity')
                .eq('product_id', orderData.product_id)
                .single()

            if (productError) throw productError

            // อัพเดทสต็อก (เพิ่มกลับเข้าไป)
            const newStock = ((product as any).stock_quantity || 0) + quantityToCancel

            const { error: stockError } = await supabase
                .from('products')
                .update({ stock_quantity: newStock } as any)
                .eq('product_id', orderData.product_id)

            if (stockError) throw stockError

            // บันทึกใน inventory
            await supabase
                .from('inventory')
                .insert({
                    product_id: orderData.product_id,
                    date: new Date().toISOString(),
                    quantity: quantityToCancel,
                    type: 'return',
                    note: `คืนสินค้า - ${orderData.user_name} (${quantityToCancel} จาก ${orderData.quantity})`,
                    order_id: order_id
                } as any)
        } else {
            // บันทึกใน inventory เป็น loss
            await supabase
                .from('inventory')
                .insert({
                    product_id: orderData.product_id,
                    date: new Date().toISOString(),
                    quantity: quantityToCancel,
                    type: 'loss',
                    note: `สินค้าเสียหาย - ${orderData.user_name} (${quantityToCancel} จาก ${orderData.quantity})`,
                    order_id: order_id
                } as any)
        }

        return { error: null }
    } catch (error: any) {
        return { error: error.message }
    }
}

