export type Json =
    | string
    | number
    | boolean
    | null
    | { [key: string]: Json | undefined }
    | Json[]

export interface Database {
    public: {
        Tables: {
            users: {
                Row: {
                    user_id: string
                    name: string
                    address: string | null
                    phone: string
                    status: 'normal' | 'has_pending' | 'suspended'
                    created_at: string
                    updated_at: string
                }
                Insert: {
                    user_id?: string
                    name: string
                    address?: string | null
                    phone: string
                    status?: 'normal' | 'has_pending' | 'suspended'
                    created_at?: string
                    updated_at?: string
                }
                Update: {
                    user_id?: string
                    name?: string
                    address?: string | null
                    phone?: string
                    status?: 'normal' | 'has_pending' | 'suspended'
                    created_at?: string
                    updated_at?: string
                }
            }
            products: {
                Row: {
                    product_id: string
                    name: string
                    cost_price: number
                    sell_price: number
                    unit: string
                    sequence: number
                    stock_quantity: number
                    min_stock: number | null
                    created_at: string
                    updated_at: string
                }
                Insert: {
                    product_id?: string
                    name: string
                    cost_price?: number
                    sell_price: number
                    unit: string
                    stock_quantity?: number
                    min_stock?: number | null
                    created_at?: string
                    updated_at?: string
                }
                Update: {
                    product_id?: string
                    name?: string
                    cost_price?: number
                    sell_price?: number
                    unit?: string
                    stock_quantity?: number
                    min_stock?: number | null
                    created_at?: string
                    updated_at?: string
                }
            }
            orders: {
                Row: {
                    order_id: string
                    user_id: string
                    order_date: string
                    product_id: string
                    quantity: number
                    status: 'completed' | 'pending' | 'cancelled'
                    price_per_unit: number
                    total_price: number
                    payment_method: 'cash' | 'transfer' | null
                    payment_date: string | null
                    payment_status: 'paid' | 'pending'
                    cancellation_reason?: 'return' | 'loss' | null;
                    note: string | null
                    created_at: string
                    updated_at: string
                }
                Insert: {
                    order_id?: string
                    user_id: string
                    order_date?: string
                    product_id: string
                    quantity: number
                    status?: 'completed' | 'pending' | 'cancelled'
                    price_per_unit: number
                    total_price: number
                    payment_method?: 'cash' | 'transfer' | null
                    payment_date?: string | null
                    payment_status?: 'paid' | 'pending'
                    note?: string | null
                    created_at?: string
                    updated_at?: string
                }
                Update: {
                    order_id?: string
                    user_id?: string
                    order_date?: string
                    product_id?: string
                    quantity?: number
                    status?: 'completed' | 'pending' | 'cancelled'
                    price_per_unit?: number
                    total_price?: number
                    payment_method?: 'cash' | 'transfer' | null
                    payment_date?: string | null
                    payment_status?: 'paid' | 'pending'
                    note?: string | null
                    created_at?: string
                    updated_at?: string
                }
            }
            inventory: {
                Row: {
                    inventory_id: string
                    product_id: string
                    date: string
                    quantity: number
                    type: 'in' | 'out' | 'return' | 'loss'
                    note: string | null
                    order_id: string | null
                    created_at: string
                }
                Insert: {
                    inventory_id?: string
                    product_id: string
                    date?: string
                    quantity: number
                    type: 'in' | 'out' | 'return' | 'loss'
                    note?: string | null
                    order_id?: string | null
                    created_at?: string
                }
                Update: {
                    inventory_id?: string
                    product_id?: string
                    date?: string
                    quantity?: number
                    type?: 'in' | 'out' | 'return' | 'loss'
                    note?: string | null
                    order_id?: string | null
                    created_at?: string
                }
            }
            daily_reports: {
                Row: {
                    report_id: string
                    date: string
                    total_sales: number
                    cash_received: number
                    pending_amount: number
                    total_orders: number
                    new_customers: number
                    created_at: string
                }
                Insert: {
                    report_id?: string
                    date: string
                    total_sales?: number
                    cash_received?: number
                    pending_amount?: number
                    total_orders?: number
                    new_customers?: number
                    created_at?: string
                }
                Update: {
                    report_id?: string
                    date?: string
                    total_sales?: number
                    cash_received?: number
                    pending_amount?: number
                    total_orders?: number
                    new_customers?: number
                    created_at?: string
                }
            }
            payments: {
                Row: {
                    payment_id: string
                    user_id: string
                    payment_date: string
                    amount: number
                    order_id: string | null
                    payment_method: 'cash' | 'transfer'
                    note: string | null
                    created_at: string
                }
                Insert: {
                    payment_id?: string
                    user_id: string
                    payment_date?: string
                    amount: number
                    order_id?: string | null
                    payment_method: 'cash' | 'transfer'
                    note?: string | null
                    created_at?: string
                }
                Update: {
                    payment_id?: string
                    user_id?: string
                    payment_date?: string
                    amount?: number
                    order_id?: string | null
                    payment_method?: 'cash' | 'transfer'
                    note?: string | null
                    created_at?: string
                }
            }
        }
        Views: {
            [_ in never]: never
        }
        Functions: {
            [_ in never]: never
        }
        Enums: {
            [_ in never]: never
        }
    }
}
