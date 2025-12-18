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
        <ion-card>
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
        </ion-card>

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
        <ion-card>
          <ion-card-header>
            <ion-card-title>ออเดอร์วันนี้</ion-card-title>
            <ion-card-subtitle>{{ todayOrders.length }} รายการ</ion-card-subtitle>
          </ion-card-header>
          <ion-card-content>
            <ion-list v-if="todayOrders.length > 0">
              <ion-item v-for="order in todayOrders" :key="order.order_id">
                <ion-label>
                  <h3>{{ order.user_name }}</h3>
                  <p>
                    {{ order.product_name }} x {{ order.quantity }}
                    <ion-badge :color="getPaymentStatusColor(order.payment_status)" class="ion-margin-start">
                      {{ getPaymentStatusText(order.payment_status) }}
                    </ion-badge>
                  </p>
                </ion-label>
                <ion-note slot="end">
                  <strong>{{ formatCurrency(order.total_price) }}</strong><br>
                  <small>{{ order.payment_method === 'cash' ? 'เงินสด' : 'โอน' }}</small>
                </ion-note>
              </ion-item>
            </ion-list>
            <div v-else class="ion-padding ion-text-center">
              <p>ไม่มีออเดอร์ในวันนี้</p>
            </div>
          </ion-card-content>
        </ion-card>
      </div>

      <!-- No Data -->
      <div v-if="!loading && !dailyReport && todayOrders.length === 0" class="ion-padding ion-text-center">
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
  IonNote, IonIcon, IonGrid, IonRow, IonCol, IonBadge, IonSpinner,
  IonDatetime, IonDatetimeButton, IonModal, IonRefresher, IonRefresherContent
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

// State
const loading = ref(false);
const error = ref('');
const selectedDate = ref(new Date().toISOString());
const dailyReport = ref<DailyReport | null>(null);
const todayOrders = ref<OrderWithDetails[]>([]);

// Computed
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

function formatDate(dateString: string) {
  const date = new Date(dateString);
  return new Intl.DateTimeFormat('th-TH', {
    year: 'numeric',
    month: 'long',
    day: 'numeric',
    weekday: 'long'
  }).format(date);
}

onMounted(() => {
  loadDailyReport();
});

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

ion-list {
  padding: 0;
}
</style>
