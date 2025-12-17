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
        users (name, phone),
        products (name, unit)
      `)
            .order('created_at', { ascending: false })

        if (filters?.date) {
            query = query.eq('order_date', filters.date)
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

        // Transform data to include user and product names
        const ordersWithDetails: OrderWithDetails[] = data?.map((order: any) => ({
            ...order,
            user_name: order.users?.name,
            user_phone: order.users?.phone,
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
        const today = new Date().toISOString().split('T')[0]

        const { data, error } = await supabase
            .from('orders')
            .select('*')
            .eq('order_date', today)

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
            payment_date: payment_date || new Date().toISOString().split('T')[0],
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
