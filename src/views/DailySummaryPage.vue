<template>
  <ion-page>
    <ion-header>
      <ion-toolbar>
        <ion-title>สรุปยอดรายวัน</ion-title>
      </ion-toolbar>
      <ion-toolbar>
        <ion-item lines="none">
          <ion-label>วันที่:</ion-label>
          <ion-datetime-button datetime="reportDate"></ion-datetime-button>
        </ion-item>
      </ion-toolbar>
    </ion-header>

    <ion-content :fullscreen="true">
      <ion-modal :keep-contents-mounted="true">
        <ion-datetime
          id="reportDate"
          presentation="date"
          v-model="selectedDate"
          @ionChange="loadDailyReport"
        ></ion-datetime>
      </ion-modal>

      <ion-refresher slot="fixed" @ionRefresh="handleRefresh($event)">
        <ion-refresher-content></ion-refresher-content>
      </ion-refresher>

      <!-- Loading -->
      <div v-if="loading" class="ion-padding ion-text-center">
        <ion-spinner></ion-spinner>
      </div>

      <!-- Error -->
      <ion-card v-if="error" color="danger">
        <ion-card-content>{{ error }}</ion-card-content>
      </ion-card>

      <!-- Summary Cards -->
      <div v-if="!loading && (dailyReport || todayOrders.length > 0)">
        <!-- Main Summary -->
        <!-- <ion-card>
          <ion-card-header>
            <ion-card-subtitle>{{ formatDate(selectedDate) }}</ion-card-subtitle>
            <ion-card-title>สรุปยอดขาย</ion-card-title>
          </ion-card-header>
          <ion-card-content>
            <ion-grid>
              <ion-row>
                <ion-col size="6">
                  <div class="stat-box">
                    <ion-icon :icon="cartOutline" size="large" color="primary"></ion-icon>
                    <h3>{{ dailyReport?.total_orders || todayOrders.length }}</h3>
                    <p>ออเดอร์ทั้งหมด</p>
                  </div>
                </ion-col>
                <ion-col size="6">
                  <div class="stat-box">
                    <ion-icon :icon="waterOutline" size="large" color="secondary"></ion-icon>
                    <h3>{{ totalBottles }}</h3>
                    <p>จำนวนถัง/ขวด</p>
                  </div>
                </ion-col>
              </ion-row>
            </ion-grid>
          </ion-card-content>
        </ion-card> -->

        <!-- Financial Summary -->
        <ion-card>
          <ion-card-header>
            <ion-card-title>สรุปการเงิน</ion-card-title>
          </ion-card-header>
          <ion-card-content>
            <ion-list>
              <ion-item>
                <ion-icon :icon="cashOutline" slot="start" color="success"></ion-icon>
                <ion-label>
                  <h3>ยอดขายรวม</h3>
                  <p>รายได้ทั้งหมด</p>
                </ion-label>
                <ion-note slot="end" class="amount-success">
                  {{ formatCurrency(dailyReport?.total_sales || calculateTotalSales) }}
                </ion-note>
              </ion-item>

              <ion-item>
                <ion-icon :icon="walletOutline" slot="start" color="primary"></ion-icon>
                <ion-label>
                  <h3>เงินสดที่ได้รับ</h3>
                  <p>เงินที่ชำระแล้ว</p>
                </ion-label>
                <ion-note slot="end" class="amount-primary">
                  {{ formatCurrency(dailyReport?.cash_received || paymentBreakdown.cash) }}
                </ion-note>
              </ion-item>

              <ion-item>
                <ion-icon :icon="cardOutline" slot="start" color="primary"></ion-icon>
                <ion-label>
                  <h3>เงินโอนที่ได้รับ</h3>
                  <p>เงินที่โอนแล้ว</p>
                </ion-label>
                <ion-note slot="end" class="amount-primary">
                  {{ formatCurrency(paymentBreakdown.transfer) }}
                </ion-note>
              </ion-item>

              <ion-item>
                <ion-icon :icon="timeOutline" slot="start" color="warning"></ion-icon>
                <ion-label>
                  <h3>ยอดค้างชำระ</h3>
                  <p>ยังไม่ได้ชำระ</p>
                </ion-label>
                <ion-note slot="end" class="amount-warning">
                  {{ formatCurrency(dailyReport?.pending_amount || calculatePendingAmount) }}
                </ion-note>
              </ion-item>
            </ion-list>
          </ion-card-content>
        </ion-card>

        <!-- New Pending Payments -->
        <ion-card v-if="newPendingPayments.length > 0">
          <ion-card-header>
            <ion-card-title>รายการค้างชำระใหม่วันนี้</ion-card-title>
            <ion-card-subtitle>{{ newPendingPayments.length }} รายการ</ion-card-subtitle>
          </ion-card-header>
          <ion-card-content>
            <ion-list>
              <ion-item v-for="pending in newPendingPayments" :key="pending.order_id">
                <ion-label>
                  <h3>{{ pending.user_name }}</h3>
                  <p>{{ pending.product_name }} x {{ pending.quantity }}</p>
                </ion-label>
                <ion-note slot="end" color="danger">
                  {{ formatCurrency(pending.total_price) }}
                </ion-note>
              </ion-item>
            </ion-list>
          </ion-card-content>
        </ion-card>

        <!-- Today's Orders -->
        <ion-list>
          <ion-item-sliding>
            <ion-card-header>
              <ion-card-title>ออเดอร์วันนี้</ion-card-title>
              <ion-card-subtitle>{{ groupedOrders.length }} รายการ</ion-card-subtitle>
            </ion-card-header>
            <ion-list style="max-height: 400px; overflow-y: auto;" v-if="groupedOrders.length > 0">
              <ion-item v-for="orderGroup in groupedOrders" :key="orderGroup.key" button @click="openOrderDetail(orderGroup)">
                <ion-label>
                  <h3 style="padding-bottom: 4px;">{{ orderGroup.user_name }}</h3>
                  <p>
                    <ion-badge :color="getStatusColor(orderGroup.status)">
                      {{ getStatusText(orderGroup.status) }}
                    </ion-badge>
                    <ion-badge :color="getPaymentStatusColor(orderGroup.payment_status)" class="ion-margin-start">
                      {{ getPaymentStatusText(orderGroup.payment_status) }}
                    </ion-badge>
                  </p>
                  <p style="font-size: 12px; color: var(--ion-color-medium); margin-top: 4px;">
                    {{ orderGroup.items.length }} รายการ
                  </p>
                </ion-label>
                <ion-note slot="end">
                  <strong style="float: right;">{{ formatCurrency(orderGroup.total_price) }}</strong><br>
                  <medium style="float: right;">{{ orderGroup.payment_method === 'cash' ? 'เงินสด' : 'โอน' }}</medium>
                </ion-note>
              </ion-item>
            </ion-list>
            <div v-else class="ion-padding ion-text-center">
              <p>ไม่มีออเดอร์ในวันนี้</p>
            </div>
          </ion-item-sliding>
        </ion-list>
      </div>

      <!-- Order Detail Modal -->
      <ion-modal :is-open="showOrderModal" @didDismiss="closeOrderDetail">
        <ion-header>
          <ion-toolbar>
            <ion-title>รายละเอียดออเดอร์</ion-title>
            <ion-buttons slot="end">
              <ion-button @click="closeOrderDetail">ปิด</ion-button>
            </ion-buttons>
          </ion-toolbar>
        </ion-header>
        <ion-content v-if="selectedOrderGroup">
          <ion-card>
            <ion-card-header>
              <ion-card-title>{{ selectedOrderGroup.user_name }}</ion-card-title>
              <ion-card-subtitle>{{ formatDate(selectedOrderGroup.order_date) }}</ion-card-subtitle>
            </ion-card-header>
            <ion-card-content>
              <ion-list>
                <ion-item lines="none">
                  <ion-label>
                    <p>สถานะ</p>
                  </ion-label>
                  <ion-badge :color="getStatusColor(selectedOrderGroup.status)" slot="end">
                    {{ getStatusText(selectedOrderGroup.status) }}
                  </ion-badge>
                </ion-item>
                <ion-item lines="none">
                  <ion-label>
                    <p>การชำระเงิน</p>
                  </ion-label>
                  <ion-badge :color="getPaymentStatusColor(selectedOrderGroup.payment_status)" slot="end">
                    {{ getPaymentStatusText(selectedOrderGroup.payment_status) }}
                  </ion-badge>
                </ion-item>
                <ion-item lines="none">
                  <ion-label>
                    <p>วิธีชำระเงิน</p>
                  </ion-label>
                  <ion-note slot="end">
                    <p>{{ selectedOrderGroup.payment_method === 'cash' ? 'เงินสด' : 'โอน' }}</p>
                  </ion-note>
                </ion-item>
              </ion-list>
            </ion-card-content>
          </ion-card>

          <ion-card>
            <ion-card-header>
              <ion-card-title>รายการสินค้า</ion-card-title>
            </ion-card-header>
            <ion-card-content>
              <ion-list>
                <ion-item v-for="item in selectedOrderGroup.items" :key="item.order_id">
                  <ion-label>
                    <h3>{{ item.product_name }}</h3>
                    <p>{{ formatCurrency(item.price_per_unit) }} x {{ item.quantity }}</p>
                  </ion-label>
                  <ion-note slot="end" class="order-item-price">
                    {{ formatCurrency(item.total_price) }}
                  </ion-note>
                </ion-item>
                <ion-item lines="none">
                  <ion-label>
                    <h2><strong>รวมทั้งหมด</strong></h2>
                  </ion-label>
                  <ion-note slot="end" class="order-total-price">
                    {{ formatCurrency(selectedOrderGroup.total_price) }}
                  </ion-note>
                </ion-item>
              </ion-list>
            </ion-card-content>
          </ion-card>
        </ion-content>
      </ion-modal>
      

      <!-- No Data -->
      <div v-if="!loading && !dailyReport && groupedOrders.length === 0" class="ion-padding ion-text-center">
        <ion-icon :icon="documentTextOutline" size="large" color="medium"></ion-icon>
        <p>ไม่มีข้อมูลในวันที่เลือก</p>
      </div>
    </ion-content>
  </ion-page>
</template>

<script setup lang="ts">
import { ref, computed, onMounted } from 'vue';
import {
  IonPage, IonHeader, IonToolbar, IonTitle, IonContent, IonCard, IonCardHeader,
  IonCardTitle, IonCardSubtitle, IonCardContent, IonList, IonItem, IonLabel,
  IonNote, IonIcon, IonGrid, IonRow, IonCol, IonBadge, IonSpinner, IonItemSliding,
  IonDatetime, IonDatetimeButton, IonModal, IonRefresher, IonRefresherContent,
  IonButtons, IonButton
} from '@ionic/vue';
import {
  cartOutline, waterOutline, cashOutline, walletOutline, timeOutline,
  documentTextOutline, cardOutline
} from 'ionicons/icons';
import { getDailyReport } from '../services/reportService';
import { getOrders } from '../services/orderService';
import type { OrderWithDetails } from '../services/orderService';
import type { Database } from '../types/supabase';

type DailyReport = Database['public']['Tables']['daily_reports']['Row'];

interface OrderGroup {
  key: string;
  user_name: string;
  order_date: string;
  status: string;
  payment_status: string;
  payment_method: string;
  total_price: number;
  items: OrderWithDetails[];
}

// State
const loading = ref(false);
const error = ref('');
const selectedDate = ref(new Date().toISOString());
const dailyReport = ref<DailyReport | null>(null);
const todayOrders = ref<OrderWithDetails[]>([]);
const showOrderModal = ref(false);
const selectedOrderGroup = ref<OrderGroup | null>(null);

// Computed
const groupedOrders = computed(() => {
  // จัดกลุ่มออเดอร์ตาม user_name และเวลาใกล้เคียงกัน (ภายใน 5 นาที)
  const groups: { [key: string]: OrderGroup } = {};
  
  todayOrders.value.forEach(order => {
    // สร้าง key จาก user_name และเวลา (ปัดเป็น 5 นาที)
    const orderTime = new Date(order.order_date);
    const roundedTime = new Date(Math.floor(orderTime.getTime() / (5 * 60 * 1000)) * (5 * 60 * 1000));
    const key = `${order.user_name}_${roundedTime.toISOString()}`;
    
    if (!groups[key]) {
      groups[key] = {
        key,
        user_name: order.user_name || 'ไม่ระบุชื่อ',
        order_date: order.order_date,
        status: order.status,
        payment_status: order.payment_status,
        payment_method: order.payment_method,
        total_price: 0,
        items: []
      };
    }
    
    groups[key].items.push(order);
    groups[key].total_price += order.total_price;
  });
  
  return Object.values(groups).sort((a, b) => 
    new Date(b.order_date).getTime() - new Date(a.order_date).getTime()
  );
});

const newPendingPayments = computed(() => {
  return todayOrders.value.filter(o => o.payment_status === 'pending' && o.status !== 'cancelled');
});

const totalBottles = computed(() => {
  return todayOrders.value
    .filter(o => o.status !== 'cancelled')
    .reduce((sum, o) => sum + o.quantity, 0);
});

const paymentBreakdown = computed(() => {
  const cash = todayOrders.value
    .filter(o => o.payment_method === 'cash' && o.payment_status === 'paid' && o.status !== 'cancelled')
    .reduce((sum, o) => sum + o.total_price, 0);

  const transfer = todayOrders.value
    .filter(o => o.payment_method === 'transfer' && o.payment_status === 'paid' && o.status !== 'cancelled')
    .reduce((sum, o) => sum + o.total_price, 0);

  return { cash, transfer };
});

const calculateTotalSales = computed(() => {
  return todayOrders.value
    .filter(o => o.status !== 'cancelled' && o.payment_status !== 'pending')
    .reduce((sum, o) => sum + o.total_price, 0);
});

const calculatePendingAmount = computed(() => {
  return todayOrders.value
    .filter(o => o.payment_status === 'pending' && o.status !== 'cancelled')
    .reduce((sum, o) => sum + o.total_price, 0);
});

// Methods
async function loadDailyReport() {
  loading.value = true;
  error.value = '';

  try {
    const date = selectedDate.value.split('T')[0];

    // Load daily report
    const { data: reportData, error: reportError } = await getDailyReport(date);
    if (reportError) throw new Error(reportError);

    // Load orders for the day
    const { data: ordersData, error: ordersError } = await getOrders({ date });
    if (ordersError) throw new Error(ordersError);

    dailyReport.value = reportData;
    todayOrders.value = ordersData || [];

    // If no report exists, create a summary from orders
    if (!dailyReport.value && todayOrders.value.length > 0) {
      const completedOrders = todayOrders.value.filter(o => o.status !== 'cancelled');
      const paidOrders = todayOrders.value.filter(o => o.payment_status === 'paid' && o.status !== 'cancelled');
      
      // สร้าง timestamp ของวันที่เลือก
      const reportDate = new Date(date);
      reportDate.setHours(12, 0, 0, 0); // ตั้งเวลาเที่ยง
      
      dailyReport.value = {
        report_id: '',
        date: reportDate.toISOString(),
        total_sales: completedOrders.reduce((sum, o) => sum + o.total_price, 0),
        cash_received: paidOrders
          .filter(o => o.payment_method === 'cash')
          .reduce((sum, o) => sum + o.total_price, 0),
        pending_amount: todayOrders.value
          .filter(o => o.payment_status === 'pending' && o.status !== 'cancelled')
          .reduce((sum, o) => sum + o.total_price, 0),
        total_orders: todayOrders.value.length,
        new_customers: 0,
        created_at: new Date().toISOString()
      };
    }
  } catch (err: any) {
    error.value = err.message;
  } finally {
    loading.value = false;
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

function getStatusText(status: string) {
  switch (status) {
    case 'completed': return 'สำเร็จ';
    case 'pending': return 'รอยืนยัน';
    case 'cancelled': return 'ยกเลิก';
    default: return status;
  }
}

function getStatusColor(status: string) {
  switch (status) {
    case 'completed': return 'success';
    case 'pending': return 'warning';
    case 'cancelled': return 'danger';
    default: return 'medium';
  }
}

function formatDate(dateString: string) {
  const date = new Date(dateString);
  return new Intl.DateTimeFormat('th-TH', {
    year: 'numeric',
    month: 'long',
    day: 'numeric',
    weekday: 'long'
  }).format(date);
}

function openOrderDetail(orderGroup: OrderGroup) {
  selectedOrderGroup.value = orderGroup;
  showOrderModal.value = true;
}

function closeOrderDetail() {
  showOrderModal.value = false;
  selectedOrderGroup.value = null;
}

onMounted(() => {
  loadDailyReport();
});

function viewOrderDetail(order: OrderWithDetails) {
  console.log('View order:', order);
}

async function handleRefresh(event: any) {
  await Promise.all([
    loadDailyReport()
  ]);
  event.target.complete();
}
</script>

<style scoped>
.stat-box {
  text-align: center;
  padding: 16px;
}

.stat-box h3 {
  font-size: 32px;
  font-weight: bold;
  margin: 8px 0;
}

.stat-box p {
  color: var(--ion-color-medium);
  font-size: 14px;
}

.payment-method-box {
  text-align: center;
  padding: 12px;
  border: 1px solid var(--ion-color-light);
  border-radius: 8px;
}

.payment-method-box h3 {
  font-size: 20px;
  margin: 8px 0;
}

.payment-method-box p {
  color: var(--ion-color-medium);
  font-size: 12px;
}

.amount-success {
  color: var(--ion-color-success);
  font-weight: bold;
  font-size: 18px;
}

.amount-primary {
  color: var(--ion-color-primary);
  font-weight: bold;
  font-size: 18px;
}

.amount-warning {
  color: var(--ion-color-warning);
  font-weight: bold;
  font-size: 18px;
}

.amount-tertiary {
  color: var(--ion-color-tertiary);
  font-weight: bold;
  font-size: 18px;
}

.order-item-price {
  font-weight: bold;
  font-size: 16px;
}

.order-total-price {
  color: var(--ion-color-success);
  font-weight: bold;
  font-size: 20px;
}

ion-list {
  padding: 0;
}
</style>
