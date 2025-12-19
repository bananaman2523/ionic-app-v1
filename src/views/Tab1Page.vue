<template>
  <ion-page>
    <ion-header>
      <ion-toolbar>
        <ion-title>ระบบออเดอร์/สั่งจองรายวัน</ion-title>
        <ion-buttons slot="end">
          <ion-button @click="openAddOrderModal">
            <ion-icon :icon="addCircleOutline"></ion-icon>
            สร้างออเดอร์
          </ion-button>
        </ion-buttons>
      </ion-toolbar>
      
      <!-- Date Picker and Filters -->
      <ion-toolbar>
        <ion-segment v-model="filterStatus" @ionChange="loadOrders">
          <ion-segment-button value="all">
            <ion-label>ทั้งหมด</ion-label>
          </ion-segment-button>
          <ion-segment-button value="pending">
            <ion-label>รอยืนยัน</ion-label>
          </ion-segment-button>
          <ion-segment-button value="completed">
            <ion-label>สำเร็จ</ion-label>
          </ion-segment-button>
          <ion-segment-button value="cancelled">
            <ion-label>ยกเลิก</ion-label>
          </ion-segment-button>
        </ion-segment>
      </ion-toolbar>

      <ion-toolbar>
        <ion-item lines="none">
          <ion-label>วันที่:</ion-label>
          <ion-datetime-button datetime="orderDate"></ion-datetime-button>
        </ion-item>
      </ion-toolbar>
    </ion-header>

    <ion-content :fullscreen="true">
      <ion-modal :keep-contents-mounted="true">
        <ion-datetime
          id="orderDate"
          presentation="date"
          v-model="selectedDate"
          @ionChange="loadOrders"
        ></ion-datetime>
      </ion-modal>

      <!-- Loading -->
      <div v-if="loading" class="ion-padding ion-text-center">
        <ion-spinner></ion-spinner>
      </div>

      <!-- Error -->
      <ion-card v-if="error" color="danger">
        <ion-card-content>{{ error }}</ion-card-content>
      </ion-card>

      <!-- Orders List -->
      <ion-list v-if="!loading && orders.length > 0">
        <ion-item-sliding v-for="order in orders" :key="order.order_id">
          <ion-item button @click="viewOrderDetail(order)">
            <ion-label>
              <h2 style="padding-bottom: 4px;">{{ order.user_name }}</h2>
              <!-- <p>{{ order.product_name }} x {{ order.quantity }}</p> -->
              <p>
                <ion-badge :color="getStatusColor(order.status)">
                  {{ getStatusText(order.status) }}
                </ion-badge>
                <ion-badge :color="getPaymentStatusColor(order.payment_status)" class="ion-margin-start">
                  {{ getPaymentStatusText(order.payment_status) }}
                </ion-badge>
              </p>
            </ion-label>
            <ion-note slot="end">
              <strong style="float: right;">{{ formatCurrency(order.total_price) }}</strong><br>
              <medium style="float: right;">{{ order.payment_method === 'cash' ? 'เงินสด' : 'โอน' }}</medium>
            </ion-note>
          </ion-item>

          <ion-item-options side="end">
            <ion-item-option color="success" @click="markAsPaid(order)" v-if="order.payment_status === 'pending'">
              <ion-icon :icon="checkmarkCircle"></ion-icon>
              ชำระแล้ว
            </ion-item-option>
            <ion-item-option color="primary" @click="editOrder(order)">
              <ion-icon :icon="createOutline"></ion-icon>
              แก้ไข
            </ion-item-option>
            <ion-item-option color="danger" @click="cancelOrder(order)" v-if="order.status !== 'cancelled'">
              <ion-icon :icon="closeCircle"></ion-icon>
              ยกเลิก
            </ion-item-option>
          </ion-item-options>
        </ion-item-sliding>
      </ion-list>

      <!-- Empty State -->
      <div v-if="!loading && orders.length === 0" class="ion-padding ion-text-center">
        <ion-icon :icon="cartOutline" size="large" color="medium"></ion-icon>
        <p>ไม่มีออเดอร์ในวันนี้</p>
        <ion-button @click="openAddOrderModal">สร้างออเดอร์ใหม่</ion-button>
      </div>

      <!-- Summary Card -->
      <ion-card v-if="orders.length > 0">
        <ion-card-header>
          <ion-card-title>สรุปยอดวันนี้</ion-card-title>
        </ion-card-header>
        <ion-card-content>
          <ion-grid>
            <ion-row>
              <ion-col size="6">
                <div class="summary-item">
                  <ion-label color="medium">จำนวนออเดอร์</ion-label>
                  <h2>{{ summary.totalOrders }}</h2>
                </div>
              </ion-col>
              <ion-col size="6">
                <div class="summary-item">
                  <ion-label color="medium">จำนวนถัง/ขวด</ion-label>
                  <h2>{{ summary.totalBottles }}</h2>
                </div>
              </ion-col>
              <ion-col size="6">
                <div class="summary-item">
                  <ion-label color="medium">ยอดรวม</ion-label>
                  <h2 class="text-success">{{ formatCurrency(summary.totalRevenue) }}</h2>
                </div>
              </ion-col>
              <ion-col size="6">
                <div class="summary-item">
                  <ion-label color="medium">ค้างชำระ</ion-label>
                  <h2 class="text-danger">{{ formatCurrency(summary.pendingAmount) }}</h2>
                </div>
              </ion-col>
            </ion-row>
          </ion-grid>
        </ion-card-content>
      </ion-card>

      <!-- Add/Edit Order Modal -->
      <ion-modal :is-open="showOrderModal" @didDismiss="closeOrderModal">
        <ion-header>
          <ion-toolbar>
            <ion-title>{{ editingOrder ? 'แก้ไขออเดอร์' : 'สร้างออเดอร์ใหม่' }}</ion-title>
            <ion-buttons slot="end">
              <ion-button @click="closeOrderModal">ปิด</ion-button>
            </ion-buttons>
          </ion-toolbar>
        </ion-header>
        
        <ion-content class="ion-padding">
          <ion-list>
            <ion-item>
              <ion-label position="stacked">ลูกค้า *</ion-label>
              <ion-select v-model="orderForm.user_id" placeholder="เลือกลูกค้า">
                <ion-select-option v-for="user in users" :key="user.user_id" :value="user.user_id">
                  {{ user.name }} ({{ user.phone }})
                </ion-select-option>
              </ion-select>
            </ion-item>

            <ion-item>
              <ion-label position="stacked">สินค้า *</ion-label>
              <ion-select v-model="orderForm.product_id" placeholder="เลือกสินค้า" @ionChange="onProductChange">
                <ion-select-option v-for="product in products" :key="product.product_id" :value="product.product_id">
                  {{ product.name }} (คงเหลือ: {{ product.stock_quantity }})
                </ion-select-option>
              </ion-select>
            </ion-item>

            <ion-item>
              <ion-label position="stacked">จำนวน *</ion-label>
              <ion-input
                v-model.number="orderForm.quantity"
                type="number"
                min="1"
                placeholder="จำนวน"
                @ionInput="calculateTotal"
              ></ion-input>
            </ion-item>

            <ion-item>
              <ion-label position="stacked">ราคาต่อหน่วย</ion-label>
              <ion-input
                v-model.number="orderForm.price_per_unit"
                type="number"
                placeholder="ราคา"
                @ionInput="calculateTotal"
              ></ion-input>
            </ion-item>

            <ion-item>
              <ion-label>ราคารวม</ion-label>
              <ion-note slot="end">{{ formatCurrency(orderForm.total_price) }}</ion-note>
            </ion-item>

            <ion-item>
              <ion-label position="stacked">วิธีชำระเงิน</ion-label>
              <ion-select v-model="orderForm.payment_method" placeholder="เลือกวิธีชำระ">
                <ion-select-option value="cash">เงินสด</ion-select-option>
                <ion-select-option value="transfer">โอนเงิน</ion-select-option>
              </ion-select>
            </ion-item>

            <ion-item>
              <ion-label>สถานะการชำระ</ion-label>
              <ion-toggle v-model="orderForm.isPaid" @ionChange="onPaymentToggle">
                {{ orderForm.isPaid ? 'จ่ายแล้ว' : 'ค้างชำระ' }}
              </ion-toggle>
            </ion-item>

            <ion-item>
              <ion-label position="stacked">หมายเหตุ</ion-label>
              <ion-textarea v-model="orderForm.note" placeholder="หมายเหตุ"></ion-textarea>
            </ion-item>
          </ion-list>

          <div class="ion-padding">
            <ion-button expand="block" @click="saveOrder" :disabled="!isFormValid">
              {{ editingOrder ? 'บันทึกการแก้ไข' : 'สร้างออเดอร์' }}
            </ion-button>
          </div>
        </ion-content>
      </ion-modal>

    </ion-content>
  </ion-page>
</template>

<script setup lang="ts">
import { ref, computed, onMounted } from 'vue';
import {
  IonPage, IonHeader, IonToolbar, IonTitle, IonContent, IonButtons, IonButton,
  IonIcon, IonList, IonItem, IonLabel, IonNote, IonBadge, IonCard, IonCardHeader,
  IonCardTitle, IonCardContent, IonGrid, IonRow, IonCol, IonModal, IonInput,
  IonTextarea, IonSelect, IonSelectOption, IonToggle, IonSpinner, IonDatetime,
  IonDatetimeButton, IonSegment, IonSegmentButton, IonItemSliding, IonItemOptions,
  IonItemOption, alertController, toastController
} from '@ionic/vue';
import {
  addCircleOutline, createOutline, closeCircle, checkmarkCircle, cartOutline
} from 'ionicons/icons';
import { getOrders, createOrder, updateOrder, updatePaymentStatus } from '../services/orderService';
import { getUsers } from '../services/userService';
import { getProducts } from '../services/productService';
import type { OrderWithDetails } from '../services/orderService';
import type { Database } from '../types/supabase';

type User = Database['public']['Tables']['users']['Row'];
type Product = Database['public']['Tables']['products']['Row'];

// State
const loading = ref(false);
const error = ref('');
const orders = ref<OrderWithDetails[]>([]);
const users = ref<User[]>([]);
const products = ref<Product[]>([]);
const showOrderModal = ref(false);
const editingOrder = ref<OrderWithDetails | null>(null);
const selectedDate = ref(new Date().toISOString());
const filterStatus = ref('all');

// Order Form
const orderForm = ref({
  user_id: '',
  product_id: '',
  quantity: 1,
  price_per_unit: 0,
  total_price: 0,
  payment_method: 'cash' as 'cash' | 'transfer',
  isPaid: false,
  note: ''
});

// Summary
const summary = computed(() => {
  return {
    totalOrders: orders.value.length,
    totalBottles: orders.value.reduce((sum, o) => sum + o.quantity, 0),
    totalRevenue: orders.value
      .filter(o => o.status !== 'cancelled')
      .reduce((sum, o) => sum + o.total_price, 0),
    pendingAmount: orders.value
      .filter(o => o.payment_status === 'pending' && o.status !== 'cancelled')
      .reduce((sum, o) => sum + o.total_price, 0)
  };
});

const isFormValid = computed(() => {
  return orderForm.value.user_id &&
    orderForm.value.product_id &&
    orderForm.value.quantity > 0 &&
    orderForm.value.price_per_unit > 0;
});

// Methods
async function loadOrders() {
  loading.value = true;
  error.value = '';
  
  try {
    const date = selectedDate.value.split('T')[0];
    const filters: any = { date };
    
    if (filterStatus.value !== 'all') {
      filters.status = filterStatus.value;
    }

    const { data, error: err } = await getOrders(filters);
    
    if (err) throw new Error(err);
    orders.value = data || [];
  } catch (err: any) {
    error.value = err.message;
  } finally {
    loading.value = false;
  }
}

async function loadUsers() {
  const { data } = await getUsers();
  users.value = data || [];
}

async function loadProducts() {
  const { data } = await getProducts();
  products.value = data || [];
}

function openAddOrderModal() {
  editingOrder.value = null;
  resetForm();
  showOrderModal.value = true;
}

function closeOrderModal() {
  showOrderModal.value = false;
  resetForm();
}

function resetForm() {
  orderForm.value = {
    user_id: '',
    product_id: '',
    quantity: 1,
    price_per_unit: 0,
    total_price: 0,
    payment_method: 'cash',
    isPaid: false,
    note: ''
  };
}

function onProductChange() {
  const product = products.value.find(p => p.product_id === orderForm.value.product_id);
  if (product) {
    orderForm.value.price_per_unit = product.sell_price;
    calculateTotal();
  }
}

function calculateTotal() {
  orderForm.value.total_price = orderForm.value.quantity * orderForm.value.price_per_unit;
}

function onPaymentToggle() {
  // Optional: Add logic when payment status changes
}

async function saveOrder() {
  loading.value = true;
  
  try {
    const orderData = {
      user_id: orderForm.value.user_id,
      product_id: orderForm.value.product_id,
      quantity: orderForm.value.quantity,
      price_per_unit: orderForm.value.price_per_unit,
      total_price: orderForm.value.total_price,
      payment_method: orderForm.value.payment_method,
      payment_status: orderForm.value.isPaid ? 'paid' as const : 'pending' as const,
      payment_date: orderForm.value.isPaid ? new Date().toISOString().split('T')[0] : null,
      status: 'completed' as const,
      note: orderForm.value.note || null,
      order_date: selectedDate.value.split('T')[0]
    };

    const { error: err } = await createOrder(orderData);
    
    if (err) throw new Error(err);

    await showToast('สร้างออเดอร์สำเร็จ', 'success');
    closeOrderModal();
    loadOrders();
  } catch (err: any) {
    await showToast(err.message, 'danger');
  } finally {
    loading.value = false;
  }
}

async function markAsPaid(order: OrderWithDetails) {
  const { error: err } = await updatePaymentStatus(order.order_id, 'paid', undefined, order.payment_method || 'cash');
  
  if (err) {
    await showToast(err, 'danger');
  } else {
    await showToast('อัพเดทสถานะชำระเงินสำเร็จ', 'success');
    loadOrders();
  }
}

async function editOrder(order: OrderWithDetails) {
  editingOrder.value = order;
  orderForm.value = {
    user_id: order.user_id,
    product_id: order.product_id,
    quantity: order.quantity,
    price_per_unit: order.price_per_unit,
    total_price: order.total_price,
    payment_method: order.payment_method || 'cash',
    isPaid: order.payment_status === 'paid',
    note: order.note || ''
  };
  showOrderModal.value = true;
}

async function cancelOrder(order: OrderWithDetails) {
  const alert = await alertController.create({
    header: 'ยืนยันการยกเลิก',
    message: `คุณต้องการยกเลิกออเดอร์นี้หรือไม่?`,
    buttons: [
      { text: 'ไม่', role: 'cancel' },
      {
        text: 'ใช่, ยกเลิก',
        role: 'confirm',
        handler: async () => {
          const { error: err } = await updateOrder(order.order_id, { status: 'cancelled' });
          if (err) {
            await showToast(err, 'danger');
          } else {
            await showToast('ยกเลิกออเดอร์สำเร็จ', 'success');
            loadOrders();
          }
        }
      }
    ]
  });
  
  await alert.present();
}

function viewOrderDetail(order: OrderWithDetails) {
  // TODO: Implement order detail view
  console.log('View order:', order);
}

function getStatusColor(status: string) {
  switch (status) {
    case 'completed': return 'success';
    case 'pending': return 'warning';
    case 'cancelled': return 'danger';
    default: return 'medium';
  }
}

function getStatusText(status: string) {
  switch (status) {
    case 'completed': return 'สำเร็จ';
    case 'pending': return 'รอยืนยัน';
    case 'cancelled': return 'ยกเลิก';
    default: return status;
  }
}

function getPaymentStatusColor(status: string) {
  return status === 'paid' ? 'success' : 'warning';
}

function getPaymentStatusText(status: string) {
  return status === 'paid' ? 'ชำระแล้ว' : 'ค้างชำระ';
}

function formatCurrency(amount: number) {
  return new Intl.NumberFormat('th-TH', {
    style: 'currency',
    currency: 'THB'
  }).format(amount);
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
  loadOrders();
  loadUsers();
  loadProducts();
});
</script>

<style scoped>
.summary-item {
  text-align: center;
  padding: 8px;
}

.summary-item h2 {
  margin: 4px 0;
  font-size: 24px;
}

.text-success {
  color: var(--ion-color-success);
}

.text-danger {
  color: var(--ion-color-danger);
}
</style>