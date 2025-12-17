import { supabase } from '../lib/supabase'
import type { Database } from '../types/supabase'

export type Payment = Database['public']['Tables']['payments']['Row']
type PaymentInsert = Database['public']['Tables']['payments']['Insert']

// ===== Create Payment =====
export async function createPayment(paymentData: PaymentInsert) {
    try {
        const { data, error } = await supabase
            .from('payments')
            .insert(paymentData as any)
            .select()
            .single()

        if (error) throw error

        // ถ้าชำระเงินสำหรับออเดอร์ ให้อัพเดทสถานะออเดอร์
        if (paymentData.order_id) {
            const { error: orderError } = await supabase
                .from('orders' as any)
                .update({
                    payment_status: 'paid',
                    payment_date: paymentData.payment_date,
                    payment_method: paymentData.payment_method
                } as any)
                .eq('order_id', paymentData.order_id)

            if (orderError) throw orderError
        }

        return { data, error: null }
    } catch (error: any) {
        return { data: null, error: error.message }
    }
}

// ===== Get Payments =====
export async function getPayments(filters?: {
    user_id?: string
    date?: string
    startDate?: string
    endDate?: string
}) {
    try {
        let query = supabase
            .from('payments')
            .select(`
        *,
        users (name, phone),
        orders (order_date, total_price)
      `)
            .order('payment_date', { ascending: false })

        if (filters?.user_id) {
            query = query.eq('user_id', filters.user_id)
        }

        if (filters?.date) {
            query = query.eq('payment_date', filters.date)
        }

        if (filters?.startDate && filters?.endDate) {
            query = query.gte('payment_date', filters.startDate).lte('payment_date', filters.endDate)
        }

        const { data, error } = await query

        if (error) throw error
        return { data, error: null }
    } catch (error: any) {
        return { data: null, error: error.message }
    }
}

// ===== Get All Pending Payments =====
export async function getAllPendingPayments() {
    try {
        const { data, error } = await supabase
            .from('orders')
            .select(`
        order_id,
        user_id,
        order_date,
        total_price,
        users (name, phone)
    `)
            .eq('payment_status', 'pending')
            .order('order_date', { ascending: true })

        if (error) throw error

        // คำนวณจำนวนวันค้างชำระ
        const pendingWithOverdue = data?.map((order: any) => {
            const orderDate = new Date(order.order_date)
            const today = new Date()
            const diffTime = Math.abs(today.getTime() - orderDate.getTime())
            const diffDays = Math.ceil(diffTime / (1000 * 60 * 60 * 24))

            return {
                order_id: order.order_id,
                user_id: order.user_id,
                user_name: order.users?.name,
                user_phone: order.users?.phone,
                order_date: order.order_date,
                amount: order.total_price,
                days_overdue: diffDays
            }
        })

        return { data: pendingWithOverdue, error: null }
    } catch (error: any) {
        return { data: null, error: error.message }
    }
}

// ===== Get Payment Summary =====
export async function getPaymentSummary(startDate: string, endDate: string) {
    try {
        const { data, error } = await supabase
            .from('payments')
            .select('amount, payment_method')
            .gte('payment_date', startDate)
            .lte('payment_date', endDate)

        if (error) throw error

        const totalCash = data
            ?.filter((p: any) => p.payment_method === 'cash')
            .reduce((sum: number, p: any) => sum + p.amount, 0) || 0

        const totalTransfer = data
            ?.filter((p: any) => p.payment_method === 'transfer')
            .reduce((sum: number, p: any) => sum + p.amount, 0) || 0

        const totalAmount = totalCash + totalTransfer

        return {
            data: {
                totalAmount,
                totalCash,
                totalTransfer,
                count: data?.length || 0
            },
            error: null
        }
    } catch (error: any) {
        return { data: null, error: error.message }
    }
}
