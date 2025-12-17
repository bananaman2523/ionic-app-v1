import { supabase } from '../lib/supabase'
import type { Database } from '../types/supabase'

type Product = Database['public']['Tables']['products']['Row']
type ProductInsert = Database['public']['Tables']['products']['Insert']
type ProductUpdate = Database['public']['Tables']['products']['Update']

// ===== Get All Products =====
export async function getProducts() {
    try {
        const { data, error } = await supabase
            .from('products')
            .select('*')
            .order('name', { ascending: true })

        if (error) throw error
        return { data, error: null }
    } catch (error: any) {
        return { data: null, error: error.message }
    }
}

// ===== Get Product by ID =====
export async function getProductById(product_id: string) {
    try {
        const { data, error } = await supabase
            .from('products')
            .select('*')
            .eq('product_id', product_id)
            .single()

        if (error) throw error
        return { data, error: null }
    } catch (error: any) {
        return { data: null, error: error.message }
    }
}

// ===== Create Product =====
export async function createProduct(productData: ProductInsert) {
    try {
        const { data, error } = await supabase
            .from('products')
            .insert(productData as any)
            .select()
            .single()

        if (error) throw error
        return { data, error: null }
    } catch (error: any) {
        return { data: null, error: error.message }
    }
}

// ===== Update Product =====
export async function updateProduct(product_id: string, updates: ProductUpdate) {
    try {
        const { data, error } = await supabase
            .from('products' as any)
            .update(updates as any)
            .eq('product_id', product_id)
            .select()
            .single()

        if (error) throw error
        return { data, error: null }
    } catch (error: any) {
        return { data: null, error: error.message }
    }
}

// ===== Delete Product =====
export async function deleteProduct(product_id: string) {
    try {
        const { error } = await supabase
            .from('products')
            .delete()
            .eq('product_id', product_id)

        if (error) throw error
        return { error: null }
    } catch (error: any) {
        return { error: error.message }
    }
}

// ===== Check Low Stock Products =====
export async function getLowStockProducts() {
    try {
        const { data, error } = await supabase
            .from('products')
            .select('*')
            .filter('stock_quantity', 'lte', 'min_stock')

        if (error) throw error
        return { data, error: null }
    } catch (error: any) {
        return { data: null, error: error.message }
    }
}

// ===== Update Stock Manually =====
export async function updateStock(
    product_id: string,
    quantity: number,
    type: 'in' | 'out' | 'return' | 'loss',
    note?: string
) {
    try {
        // ดึงข้อมูลสต็อกปัจจุบัน
        const { data: product, error: productError } = await supabase
            .from('products')
            .select('stock_quantity')
            .eq('product_id', product_id)
            .single()

        if (productError) throw productError
        if (!product) throw new Error('ไม่พบสินค้า')

        // คำนวณสต็อกใหม่
        let newStock = (product as any).stock_quantity
        if (type === 'in' || type === 'return') {
            newStock += quantity
        } else if (type === 'out' || type === 'loss') {
            newStock -= quantity
        }

        if (newStock < 0) {
            throw new Error('สต็อกไม่เพียงพอ')
        }

        // อัพเดทสต็อก
        const { error: stockError } = await supabase
            .from('products' as any)
            .update({ stock_quantity: newStock } as any)
            .eq('product_id', product_id)

        if (stockError) throw stockError

        // บันทึกประวัติใน inventory
        const { error: inventoryError } = await supabase
            .from('inventory')
            .insert({
                product_id,
                quantity,
                type,
                note: note || null,
            } as any)

        if (inventoryError) throw inventoryError

        return { data: { newStock }, error: null }
    } catch (error: any) {
        return { data: null, error: error.message }
    }
}
