import { supabase } from '../lib/supabase'
import type { Database } from '../types/supabase'

export type User = Database['public']['Tables']['users']['Row']
type UserInsert = Database['public']['Tables']['users']['Insert']
type UserUpdate = Database['public']['Tables']['users']['Update']

// ===== Get All Users =====
export async function getUsers(filters?: {
    status?: 'normal' | 'has_pending' | 'suspended'
    search?: string
}) {
    try {
        let query = supabase
            .from('users')
            .select('*')
            .order('name', { ascending: true })

        if (filters?.status) {
            query = query.eq('status', filters.status)
        }

        if (filters?.search) {
            query = query.or(`name.ilike.%${filters.search}%,phone.ilike.%${filters.search}%`)
        }

        const { data, error } = await query

        if (error) throw error
        return { data, error: null }
    } catch (error: any) {
        return { data: null, error: error.message }
    }
}

// ===== Get User by ID =====
export async function getUserById(user_id: string) {
    try {
        const { data, error } = await supabase
            .from('users')
            .select('*')
            .eq('user_id', user_id)
            .single()

        if (error) throw error
        return { data, error: null }
    } catch (error: any) {
        return { data: null, error: error.message }
    }
}

// ===== Create User =====
export async function createUser(userData: UserInsert) {
    try {
        const { data, error } = await supabase
            .from('users')
            .insert(userData as any)
            .select()
            .single()

        if (error) throw error
        return { data, error: null }
    } catch (error: any) {
        return { data: null, error: error.message }
    }
}

// ===== Update User =====
export async function updateUser(user_id: string, updates: UserUpdate) {
    try {
        const { data, error } = await supabase
            .from('users' as any)
            .update(updates as any)
            .eq('user_id', user_id)
            .select()
            .single()

        if (error) throw error
        return { data, error: null }
    } catch (error: any) {
        return { data: null, error: error.message }
    }
}// ===== Delete User =====
export async function deleteUser(user_id: string) {
    try {
        const { error } = await supabase
            .from('users')
            .delete()
            .eq('user_id', user_id)

        if (error) throw error
        return { error: null }
    } catch (error: any) {
        return { error: error.message }
    }
}

// ===== Get User Order History =====
export async function getUserOrderHistory(user_id: string, limit = 10) {
    try {
        const { data, error } = await supabase
            .from('orders')
            .select(`
        *,
        products (name, unit)
      `)
            .eq('user_id', user_id)
            .order('order_date', { ascending: false })
            .limit(limit)

        if (error) throw error
        return { data, error: null }
    } catch (error: any) {
        return { data: null, error: error.message }
    }
}

// ===== Get User Pending Payments =====
export async function getUserPendingPayments(user_id: string) {
    try {
        const { data, error } = await supabase
            .from('orders')
            .select(`
        *,
        products (name, unit)
      `)
            .eq('user_id', user_id)
            .eq('payment_status', 'pending')
            .order('order_date', { ascending: true })

        if (error) throw error

        // คำนวณจำนวนวันค้างชำระ
        const ordersWithOverdue = data?.map((order: any) => {
            const orderDate = new Date(order.order_date)
            const today = new Date()
            const diffTime = Math.abs(today.getTime() - orderDate.getTime())
            const diffDays = Math.ceil(diffTime / (1000 * 60 * 60 * 24))

            return {
                ...order,
                days_overdue: diffDays
            }
        })

        return { data: ordersWithOverdue, error: null }
    } catch (error: any) {
        return { data: null, error: error.message }
    }
}

// ===== Update User Status Based on Payments =====
export async function updateUserStatusBasedOnPayments(user_id: string) {
    try {
        // ตรวจสอบว่ามีค้างชำระหรือไม่
        const { data: pendingOrders } = await supabase
            .from('orders')
            .select('order_id')
            .eq('user_id', user_id)
            .eq('payment_status', 'pending')

        const newStatus = pendingOrders && pendingOrders.length > 0 ? 'has_pending' : 'normal'

        const { data, error } = await supabase
            .from('users' as any)
            .update({ status: newStatus } as any)
            .eq('user_id', user_id)
            .select()
            .single()

        if (error) throw error
        return { data, error: null }
    } catch (error: any) {
        return { data: null, error: error.message }
    }
}
