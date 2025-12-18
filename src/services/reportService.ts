import { supabase } from '../lib/supabase'

// ===== Get Daily Report =====
export async function getDailyReport(date: string) {
    try {
        // แปลง date string เป็น timestamp range ของวันนั้น
        const startOfDay = new Date(date)
        startOfDay.setHours(0, 0, 0, 0)
        const endOfDay = new Date(date)
        endOfDay.setHours(23, 59, 59, 999)

        const { data, error } = await supabase
            .from('daily_reports')
            .select('*')
            .gte('date', startOfDay.toISOString())
            .lte('date', endOfDay.toISOString())
            .single()

        if (error && error.code !== 'PGRST116') throw error // PGRST116 = no rows returned
        return { data, error: null }
    } catch (error: any) {
        return { data: null, error: error.message }
    }
}

// ===== Get Monthly Summary =====
export async function getMonthlySummary(year: number, month: number) {
    try {
        // สร้างช่วงวันที่ของเดือน เป็น timestamp
        const startDate = new Date(year, month - 1, 1)
        startDate.setHours(0, 0, 0, 0)
        const endDate = new Date(year, month, 0)
        endDate.setHours(23, 59, 59, 999)

        // ดึงข้อมูล daily reports
        const { data: dailyReports, error: reportError } = await supabase
            .from('daily_reports')
            .select('*')
            .gte('date', startDate.toISOString())
            .lte('date', endDate.toISOString())
            .order('date', { ascending: true })

        if (reportError) throw reportError

        // คำนวณสรุปรายเดือน
        const totalSales = dailyReports?.reduce((sum: number, r: any) => sum + r.total_sales, 0) || 0
        const cashReceived = dailyReports?.reduce((sum: number, r: any) => sum + r.cash_received, 0) || 0
        const pendingAmount = dailyReports?.reduce((sum: number, r: any) => sum + r.pending_amount, 0) || 0
        const totalOrders = dailyReports?.reduce((sum: number, r: any) => sum + r.total_orders, 0) || 0
        const newCustomers = dailyReports?.reduce((sum: number, r: any) => sum + r.new_customers, 0) || 0

        // คำนวณกำไร (ต้องดึงข้อมูลต้นทุนจาก orders)
        const { data: orders, error: ordersError } = await supabase
            .from('orders')
            .select(`
        total_price,
        quantity,
        products (cost_price)
      `)
            .gte('order_date', startDate.toISOString())
            .lte('order_date', endDate.toISOString())
            .eq('status', 'completed')

        if (ordersError) throw ordersError

        const totalCost = orders?.reduce((sum: number, order: any) => {
            const cost = order.products?.cost_price || 0
            return sum + (cost * order.quantity)
        }, 0) || 0

        const profit = totalSales - totalCost

        return {
            data: {
                year,
                month,
                total_sales: totalSales,
                total_cost: totalCost,
                profit,
                pending_amount: pendingAmount,
                cash_received: cashReceived,
                total_orders: totalOrders,
                new_customers: newCustomers,
                daily_reports: dailyReports || []
            },
            error: null
        }
    } catch (error: any) {
        return { data: null, error: error.message }
    }
}

// ===== Get Yearly Summary =====
export async function getYearlySummary(year: number) {
    try {
        const monthlySummaries = []

        for (let month = 1; month <= 12; month++) {
            const { data } = await getMonthlySummary(year, month)
            if (data) {
                monthlySummaries.push(data)
            }
        }

        const totalSales = monthlySummaries.reduce((sum, m) => sum + m.total_sales, 0)
        const totalCost = monthlySummaries.reduce((sum, m) => sum + m.total_cost, 0)
        const profit = totalSales - totalCost
        const totalOrders = monthlySummaries.reduce((sum, m) => sum + m.total_orders, 0)
        const newCustomers = monthlySummaries.reduce((sum, m) => sum + m.new_customers, 0)
        const pendingAmount = monthlySummaries.reduce((sum, m) => sum + m.pending_amount, 0)

        return {
            data: {
                year,
                total_sales: totalSales,
                total_cost: totalCost,
                profit,
                pending_amount: pendingAmount,
                total_orders: totalOrders,
                new_customers: newCustomers,
                monthly_summaries: monthlySummaries
            },
            error: null
        }
    } catch (error: any) {
        return { data: null, error: error.message }
    }
}

// ===== Get Inventory History =====
export async function getInventoryHistory(filters?: {
    product_id?: string
    type?: 'in' | 'out' | 'return' | 'loss'
    startDate?: string
    endDate?: string
}) {
    try {
        let query = supabase
            .from('inventory')
            .select(`
        *,
        products (name, unit)
      `)
            .order('date', { ascending: false })
            .order('created_at', { ascending: false })

        if (filters?.product_id) {
            query = query.eq('product_id', filters.product_id)
        }

        if (filters?.type) {
            query = query.eq('type', filters.type)
        }

        if (filters?.startDate && filters?.endDate) {
            query = query.gte('date', filters.startDate).lte('date', filters.endDate)
        }

        const { data, error } = await query

        if (error) throw error
        return { data, error: null }
    } catch (error: any) {
        return { data: null, error: error.message }
    }
}
