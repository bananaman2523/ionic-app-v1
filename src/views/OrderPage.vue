<template>
  <ion-page>
    <ion-header>
      <ion-toolbar>
        <ion-title>ออเดอร์</ion-title>
      </ion-toolbar>
    </ion-header>

    <ion-content :fullscreen="true">
      <!-- Loading -->
      <div v-if="loading" class="ion-padding ion-text-center">
        <ion-spinner></ion-spinner>
      </div>

      <ion-refresher slot="fixed" @ionRefresh="handleRefresh($event)">
        <ion-refresher-content></ion-refresher-content>
      </ion-refresher>

      <!-- Error -->
      <ion-card v-if="error" color="danger">
        <ion-card-content>{{ error }}</ion-card-content>
      </ion-card>

      <ion-card class="products-card">
        <ion-card-header>
          <ion-card-title>เลือกสินค้า</ion-card-title>
        </ion-card-header>
        <ion-card-content>
          <ion-grid class="product-grid">
            <ion-row>
              <ion-col v-for="product in products" :key="product.name" size="4" class="product-col">
                <ion-button expand="full" color="primary" class="product-btn" @click="addOrIncrement(product.name)">
                  {{ product.name }}
                </ion-button>
              </ion-col>
            </ion-row>
          </ion-grid>
        </ion-card-content>
      </ion-card>

    </ion-content>

    <!-- Footer ตะกร้าสินค้า -->
    <ion-footer>
      <ion-card >
        <ion-card-header>
          <ion-card-title>ตะกร้าสินค้า ({{ cart.length }})</ion-card-title>
        </ion-card-header>
        <ion-card-content class="cart-content">
          <ion-item >
            <ion-input label-placement="floating" v-model="customerName" type="text" placeholder="กรอกชื่อผู้สั่ง" required>
              <div slot="label">ชื่อลูกค้า</div>
            </ion-input>
          </ion-item>
          
          <div class="cart-items-scroll">
            <ion-list>
              <ion-item v-for="item in cart" :key="item.name">
                <ion-label>{{ item.name }}</ion-label>
                <ion-input
                type="number"
                min="1"
                v-model.number="item.qty"
                @ionBlur="onQtyBlur(item)"
                style="width: 80px; margin-left: 12px;"
                inputmode="numeric"
              ></ion-input>
                <ion-button color="danger" size="small" slot="end" @click="removeFromCart(item.name)">
                  ลบ
                </ion-button>
              </ion-item>
            </ion-list>
          </div>
          
          <div class="cart-footer-action">
            <ion-button expand="block" color="success" class="cart-action-btn" @click="submitCart">
              ยืนยันออเดอร์
            </ion-button>
          </div>
        </ion-card-content>
      </ion-card>
    </ion-footer>

    <!-- Payment Method Modal -->
    <ion-modal :is-open="showPaymentModal" @did-dismiss="showPaymentModal = false">
      <ion-header>
        <ion-toolbar>
          <ion-title>วิธีชำระเงิน</ion-title>
          <ion-buttons slot="end">
            <ion-button @click="showPaymentModal = false">ปิด</ion-button>
          </ion-buttons>
        </ion-toolbar>
      </ion-header>
      <ion-content>
        <ion-list>
          <ion-radio-group v-model="paymentMethod">
            <ion-item
              v-for="option in paymentOptions"
              :key="option.value"
            >
              <ion-radio :value="option.value">{{ option.label }}</ion-radio>
            </ion-item>
          </ion-radio-group>
        </ion-list>
      </ion-content>
      <ion-footer>
        <ion-toolbar>
          <ion-button color="success" class="cart-action-btn" expand="block" @click="confirmPayment()">
            ยืนยันการชำระเงิน
          </ion-button>
        </ion-toolbar>
      </ion-footer>
    </ion-modal>

    <!-- QR Payment Modal -->
    <ion-modal :is-open="showQRModal" @did-dismiss="showQRModal = false">
      <ion-header>
        <ion-toolbar>
          <ion-title>ชำระเงินด้วย QR</ion-title>
          <ion-buttons slot="end">
            <ion-button @click="showQRModal = false">ปิด</ion-button>
          </ion-buttons>
        </ion-toolbar>
      </ion-header>
      <ion-content class="ion-padding ion-text-center">
        <img :src="qrImageUrl" alt="QR Code" style="max-width: 100%; height: auto; margin: 24px 0;" />
        <!-- <img src="https://promptpay.io/0954020819/50.89999.png" alt="QR Code" style="max-width: 100%; height: auto; margin: 24px 0;" > -->
        <ion-title style="padding-bottom: 24px;">ยอดรวม: {{ totalAmount }} บาท</ion-title>
        <ion-button color="success" class="cart-action-btn" expand="block" @click="confirmQRPayment()">ยืนยันการชำระเงิน</ion-button>
      </ion-content>
    </ion-modal>

    
  </ion-page>
</template>

<script setup lang="ts">
import { ref, computed, onMounted } from 'vue';
import {
  IonPage, IonHeader, IonToolbar, IonTitle, IonContent, IonFooter,
  IonLabel, IonCard, IonCardHeader, IonCardTitle, IonCardContent,
  IonList, IonItem, IonGrid, IonRow, IonCol, IonButton,
  IonModal, IonInput, IonButtons, IonSpinner, toastController, IonRadio, IonRadioGroup, IonRefresher, IonRefresherContent
} from '@ionic/vue';

import { getProducts } from '../services/productService';
import { getAllPendingPayments } from '../services/paymentService';
import { getUsers } from '../services/userService';
import { createBulkOrders } from '../services/orderService';
import type { Database } from '../types/supabase';

const customerName = ref('');
const showPaymentModal = ref(false);
const showQRModal = ref(false);
const paymentMethod = ref('');
const paymentOptions = [
  { label: 'QR', value: 'qr', icon: 'qr-code-outline' },
  { label: 'เงินสด', value: 'cash', icon: 'cash-outline' },
  { label: 'ค้างชำระ', value: 'credit', icon: 'time-outline' },
];

function submitCart() {
  if (!customerName.value.trim()) {
    showToast('กรุณากรอกชื่อลูกค้า', 'danger');
    return;
  }
  if (!cart.value.length) {
    showToast('กรุณาเลือกสินค้าอย่างน้อยหนึ่งรายการ', 'danger');
    return;
  }
  showPaymentModal.value = true;
}

function confirmPayment() {
  if (!paymentMethod.value) {
    showToast('กรุณาเลือกวิธีชำระเงิน', 'danger');
    return;
  }
  if (paymentMethod.value === 'qr') {
    showPaymentModal.value = false;
    showQRModal.value = true;
    return;
  }
  finishOrder();
}

function confirmQRPayment() {
  finishOrder();
  showQRModal.value = false;
}

async function finishOrder() {
  loading.value = true;
  
  try {
    const { error: err } = await createBulkOrders({
      customerName: customerName.value,
      items: cart.value.map(item => ({
        productName: item.name,
        qty: item.qty
      })),
      paymentMethod: paymentMethod.value as 'cash' | 'qr' | 'credit'
    });

    if (err) throw new Error(err);
    
    showToast(`บันทึกออเดอร์สำเร็จ! ${customerName.value} - ${paymentOptions.find(opt => opt.value === paymentMethod.value)?.label}`, 'success');
    
    // ล้างข้อมูล
    cart.value = [];
    customerName.value = '';
    paymentMethod.value = '';
    showPaymentModal.value = false;
    
    // โหลดสินค้าใหม่เพื่ออัพเดทสต็อก
    await loadProducts();
  } catch (err: any) {
    showToast(err.message || 'เกิดข้อผิดพลาดในการบันทึกออเดอร์', 'danger');
  } finally {
    loading.value = false;
  }
}

import type { Database as SupabaseDatabase } from '../types/supabase';
type Product = SupabaseDatabase['public']['Tables']['products']['Row'];
const products = ref<Product[]>([]);

async function loadProducts() {
  loading.value = true;
  try {
    const { data, error: err } = await getProducts();
    if (err) throw new Error(err);
    products.value = data || [];
  } catch (err: any) {
    error.value = err.message;
  } finally {
    loading.value = false;
  }
}

const totalAmount = computed(() => {
  return cart.value.reduce((sum, item) => {
    const product = products.value.find(p => p.name === item.name);
    return sum + (product && product.sell_price ? product.sell_price * item.qty : 0);
  }, 0);
});

const qrImageUrl = computed(() => `https://promptpay.io/0954020819/${totalAmount.value}.png`);

// ตะกร้าสินค้า
const cart = ref<{ name: string; qty: number }[]>([]);

function addOrIncrement(productName: string) {
  const product = products.value.find(p => p.name === productName);
  if (!product) {
    showToast('ไม่พบสินค้านี้', 'danger');
    return;
  }

  const idx = cart.value.findIndex(item => item.name === productName);
  const currentQty = idx > -1 ? cart.value[idx].qty : 0;
  const newQty = currentQty + 1;

  // ตรวจสอบสต็อก
  if (product.stock_quantity !== null && newQty > product.stock_quantity) {
    showToast(`สินค้าไม่เพียงพอ! เหลือเพียง ${product.stock_quantity} ${product.unit || 'หน่วย'}`, 'warning');
    return;
  }

  if (idx > -1) {
    cart.value[idx].qty = newQty;
  } else {
    cart.value.push({ name: productName, qty: 1 });
  }
}

function removeFromCart(productName: string) {
  cart.value = cart.value.filter(item => item.name !== productName);
}

function onQtyBlur(item: { name: string; qty: number }) {
  if (!item.qty || item.qty < 1) {
    item.qty = 1;
    return;
  }

  // ตรวจสอบสต็อก
  const product = products.value.find(p => p.name === item.name);
  if (product && product.stock_quantity !== null && item.qty > product.stock_quantity) {
    showToast(`สินค้าไม่เพียงพอ! เหลือเพียง ${product.stock_quantity} ${product.unit || 'หน่วย'}`, 'warning');
    item.qty = product.stock_quantity;
  }
}

type User = Database['public']['Tables']['users']['Row'];

interface PendingPaymentWithDetails {
  order_id: string;
  user_id: string;
  user_name: string;
  user_phone: string;
  order_date: string;
  amount: number;
  days_overdue: number;
}

// State
const loading = ref(false);
const error = ref('');
const customerStatusFilter = ref('all');

const pendingPayments = ref<PendingPaymentWithDetails[]>([]);
const customers = ref<User[]>([]);

// Methods
async function loadPendingPayments() {
  loading.value = true;
  error.value = '';

  try {
    const { data, error: err } = await getAllPendingPayments();
    if (err) throw new Error(err);
    pendingPayments.value = (data || []).map((item: any) => ({
      order_id: item.order_id,
      user_id: item.user_id || '',
      user_name: item.user_name,
      user_phone: item.user_phone || '',
      order_date: item.order_date,
      amount: item.amount,
      days_overdue: item.days_overdue
    }));
  } catch (err: any) {
    error.value = err.message;
  } finally {
    loading.value = false;
  }
}

async function loadCustomers() {
  loading.value = true;
  error.value = '';

  try {
    const filters = customerStatusFilter.value !== 'all' 
      ? { status: customerStatusFilter.value as any }
      : undefined;

    const { data, error: err } = await getUsers(filters);
    if (err) throw new Error(err);
    customers.value = data || [];
  } catch (err: any) {
    error.value = err.message;
  } finally {
    loading.value = false;
  }
}

async function showToast(message: string, color: string = 'primary') {
  const toast = await toastController.create({
    message,
    duration: 2000,
    color,
    position: 'top'
  });
  await toast.present();
}

onMounted(() => {
  loadProducts();
  loadPendingPayments();
  loadCustomers();
});

async function handleRefresh(event: any) {
  await Promise.all([
    loadProducts(),
    loadPendingPayments(),
    loadCustomers()
  ]);
  event.target.complete();
}
</script>

<style scoped>
/* Card สินค้า */
.products-card {
  border-radius: 16px;
}

.products-card ion-card-title {
  font-size: 1.3rem;
  font-weight: 600;
  color: var(--ion-color-primary);
}

/* Grid สินค้า - ชิดกัน */
.product-grid {
  padding: 0;
}

.product-col {
  padding: 2px;
}

/* ปุ่มสินค้า - สี่เหลี่ยม */
.product-btn {
  font-size: 1rem;
  height: 80px;
  margin: 0;
  border-radius: 8px;
  font-weight: 600;
  letter-spacing: 0.3px;
  box-shadow: 0 2px 8px rgba(33, 150, 243, 0.15);
  --background: linear-gradient(135deg, var(--ion-color-primary) 0%, var(--ion-color-primary-shade) 100%);
}

/* Footer ตะกร้าสินค้า - อยู่ด้านล่างเสมอ */
.cart-footer {
  box-shadow: 0 -4px 20px rgba(0, 0, 0, 0.12);
}

.cart-box {
  margin: 0;
  border-radius: 20px 20px 0 0;
  box-shadow: none;
  background: linear-gradient(to bottom, #ffffff 0%, #f9fafb 100%);
  height: 100%;
  display: flex;
  flex-direction: column;
}

.cart-box ion-card-header {
  padding: 12px 16px;
  background: linear-gradient(135deg, var(--ion-color-success-tint) 0%, var(--ion-color-success) 100%);
  border-radius: 20px 20px 0 0;
}

.cart-box ion-card-title {
  font-size: 1.2rem;
  font-weight: 700;
  color: white;
  text-align: center;
  text-shadow: 0 1px 2px rgba(0, 0, 0, 0.1);
}

.cart-content {
  display: flex;
  flex-direction: column;
  height: 100%;
  padding: 12px;
  overflow: hidden;
}

/* Scrollable area สำหรับรายการสินค้า */
.cart-items-scroll {
  flex: 1;
  overflow-y: auto;
  margin: 8px 0;
  max-height: 200px;
  padding-right: 4px;
}

.cart-items-scroll::-webkit-scrollbar {
  width: 6px;
}

.cart-items-scroll::-webkit-scrollbar-track {
  background: #f1f1f1;
  border-radius: 10px;
}

.cart-items-scroll::-webkit-scrollbar-thumb {
  background: linear-gradient(135deg, var(--ion-color-primary) 0%, var(--ion-color-primary-shade) 100%);
  border-radius: 10px;
}

.cart-items-scroll::-webkit-scrollbar-thumb:hover {
  background: var(--ion-color-primary-shade);
}

/* Footer action - ปุ่มยืนยันอยู่ด้านล่างเสมอ */
.cart-footer-action {
  padding-top: 8px;

  border-top: 2px solid #e9ecef;
}

.cart-name-box {
  margin-bottom: 16px;
  background: linear-gradient(135deg, #f6f8fa 0%, #e9ecef 100%);
  border-radius: 12px;
  padding: 12px;
  border: none;
  --padding-start: 12px;
  --inner-padding-end: 12px;
}

.cart-name-box ion-label {
  font-size: 1.05rem;
  font-weight: 600;
  margin-bottom: 4px;
}

.cart-name-box ion-input {
  font-size: 1.1rem;
  font-weight: 500;
  /* --background: #fff; */
  --padding-start: 12px;
  --padding-end: 12px;
  border-radius: 8px;
  margin-top: 6px;
}

.cart-box ion-list {
  background: transparent;
  padding: 0;
}

.cart-box ion-item {
  border-radius: 12px;
  margin-bottom: 8px;
  background: linear-gradient(135deg, #ffffff 0%, #f8f9fa 100%);
  box-shadow: 0 2px 8px rgba(0, 0, 0, 0.06);
  --padding-start: 12px;
  --inner-padding-end: 12px;
  border: 1px solid rgba(0, 0, 0, 0.05);
  transition: all 0.2s ease;
}

.cart-box ion-item:hover {
  box-shadow: 0 3px 12px rgba(0, 0, 0, 0.1);
  transform: translateY(-1px);
}

.cart-box ion-label {
  font-size: 1.1rem;
  font-weight: 600;
}

.cart-box ion-input[type="number"] {
  width: 70px;
  margin-left: 12px;
  /* background: #fff; */
  border-radius: 8px;
  border: 2px solid #e0e0e0;
  font-size: 1.1rem;
  font-weight: 600;
  text-align: center;
  --padding-start: 8px;
  --padding-end: 8px;
  transition: border-color 0.2s ease;
}

.cart-box ion-input[type="number"]:focus-within {
  border-color: var(--ion-color-primary);
}

.cart-box ion-button[color="danger"] {
  --background: linear-gradient(135deg, #ff5252 0%, #f44336 100%);
  --border-radius: 8px;
  font-size: 0.95rem;
  font-weight: 600;
  margin-left: 8px;
  box-shadow: 0 2px 6px rgba(244, 67, 54, 0.2);
}

.cart-action-btn {
  margin: 0;
  font-size: 1.15rem;
  height: 48px;
  font-weight: 700;
  border-radius: 12px;
  letter-spacing: 0.8px;
  text-transform: uppercase;
  box-shadow: 0 4px 12px rgba(76, 175, 80, 0.3);
  --background: linear-gradient(135deg, var(--ion-color-success) 0%, var(--ion-color-success-shade) 100%);
  transition: all 0.3s ease;
}

.cart-action-btn:hover {
  transform: translateY(-2px);
  box-shadow: 0 6px 20px rgba(76, 175, 80, 0.4);
}

.cart-action-btn:active {
  transform: translateY(0);
  box-shadow: 0 2px 8px rgba(76, 175, 80, 0.3);
}
.summary-box {
  text-align: center;
  padding: 16px;
}

.summary-box h2 {
  font-size: 32px;
  font-weight: bold;
  margin: 8px 0;
}

.summary-box p {
  color: var(--ion-color-medium);
  font-size: 14px;
}

.text-danger {
  color: var(--ion-color-danger);
}

.days-badge {
  display: flex;
  align-items: center;
  justify-content: center;
  width: 100%;
  height: 100%;
  font-size: 18px;
  font-weight: bold;
  color: white;
}

.overdue-low {
  background: var(--ion-color-warning);
}

.overdue-medium {
  background: var(--ion-color-danger);
}

.overdue-high {
  background: var(--ion-color-dark);
}

.status-normal ion-icon {
  color: var(--ion-color-success);
}

.status-has_pending ion-icon {
  color: var(--ion-color-warning);
}

.status-suspended ion-icon {
  color: var(--ion-color-danger);
}

ion-avatar {
  width: 48px;
  height: 48px;
}
</style>
