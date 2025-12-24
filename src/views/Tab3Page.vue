<template>
  <ion-page>
    <ion-header>
      <ion-toolbar>
        <ion-title>ลูกค้า & ค้างชำระ</ion-title>
      </ion-toolbar>
      <ion-toolbar>
        <ion-segment v-model="selectedSegment">
          <ion-segment-button value="pending">
            <ion-label>ค้างชำระ</ion-label>
          </ion-segment-button>
          <ion-segment-button value="planning">
            <ion-label>แพลนสินค้า</ion-label>
          </ion-segment-button>
        </ion-segment>
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

      <!-- Pending Payments Section -->
      <div v-if="selectedSegment === 'pending' && !loading">
        <!-- Summary Card -->
        <ion-card>
          <ion-card-header>
            <ion-card-title>สรุปค้างชำระทั้งหมด</ion-card-title>
          </ion-card-header>
          <ion-card-content>
            <ion-grid>
              <ion-row>
                <ion-col size="6">
                  <div class="summary-box">
                    <h2>{{ pendingPayments.length }}</h2>
                    <p>รายการ</p>
                  </div>
                </ion-col>
                <ion-col size="6">
                  <div class="summary-box">
                    <h2 class="text-danger">{{ formatCurrency(totalPendingAmount) }}</h2>
                    <p>ยอดรวม</p>
                  </div>
                </ion-col>
              </ion-row>
            </ion-grid>
          </ion-card-content>
        </ion-card>

        <!-- Pending Payments List -->
        <ion-card v-if="pendingPayments.length > 0">
          <ion-card-header>
            <ion-card-title>รายการค้างชำระ</ion-card-title>
            <ion-card-subtitle>เรียงตามวันที่เก่าสุด</ion-card-subtitle>
          </ion-card-header>
          <ion-card-content>
            <ion-list>
              <ion-item-sliding v-for="pending in pendingPayments" :key="pending.order_id">
                <ion-item button @click="viewPendingDetail(pending)">
                  <ion-avatar slot="start" :class="getDaysOverdueClass(pending.days_overdue)">
                    <div class="days-badge">{{ pending.days_overdue }}</div>
                  </ion-avatar>
                  <ion-label>
                    <h2>{{ pending.user_name }}</h2>
                    <p>{{ pending.user_phone }}</p>
                    <p>
                      <small>วันที่สั่ง: {{ formatDate(pending.order_date) }}</small>
                    </p>
                    <ion-badge :color="getDaysOverdueColor(pending.days_overdue)">
                      ค้าง {{ pending.days_overdue }} วัน
                    </ion-badge>
                  </ion-label>
                  <ion-note slot="end" color="danger">
                    <strong>{{ formatCurrency(pending.amount) }}</strong>
                  </ion-note>
                </ion-item>

                <ion-item-options side="end">
                  <ion-item-option color="success" @click="markPendingAsPaid(pending)">
                    <ion-icon :icon="checkmarkCircle"></ion-icon>
                    ชำระแล้ว
                  </ion-item-option>
                  <ion-item-option color="primary" @click="contactCustomer(pending)">
                    <ion-icon :icon="callOutline"></ion-icon>
                    ติดต่อ
                  </ion-item-option>
                </ion-item-options>
              </ion-item-sliding>
            </ion-list>
          </ion-card-content>
        </ion-card>

        <!-- No Pending Payments -->
        <div v-if="pendingPayments.length === 0" class="ion-padding ion-text-center">
          <ion-icon :icon="checkmarkCircleOutline" size="large" color="success"></ion-icon>
          <h3>ไม่มีค้างชำระ</h3>
          <p>ลูกค้าทุกคนชำระเงินครบแล้ว</p>
        </div>
      </div>

      <!-- Customers Section -->
      <div v-if="selectedSegment === 'customers' && !loading">
        <!-- Search and Filter -->
        <ion-toolbar>
          <ion-searchbar
            v-model="searchQuery"
            placeholder="ค้นหาลูกค้า..."
            @ionInput="searchCustomers"
          ></ion-searchbar>
        </ion-toolbar>

        <ion-toolbar>
          <ion-segment v-model="customerStatusFilter" @ionChange="loadCustomers">
            <ion-segment-button value="all">
              <ion-label>ทั้งหมด</ion-label>
            </ion-segment-button>
            <ion-segment-button value="normal">
              <ion-label>ปกติ</ion-label>
            </ion-segment-button>
            <ion-segment-button value="has_pending">
              <ion-label>มีค้าง</ion-label>
            </ion-segment-button>
            <ion-segment-button value="suspended">
              <ion-label>งดบริการ</ion-label>
            </ion-segment-button>
          </ion-segment>
        </ion-toolbar>

        <!-- Add Customer Button -->
        <div class="ion-padding">
          <ion-button expand="block" @click="openAddCustomerModal">
            <ion-icon :icon="personAddOutline" slot="start"></ion-icon>
            เพิ่มลูกค้าใหม่
          </ion-button>
        </div>

        <!-- Customers List -->
        <ion-list v-if="filteredCustomers.length > 0">
          <ion-item-sliding v-for="customer in filteredCustomers" :key="customer.user_id">
            <ion-item button @click="viewCustomerDetail(customer)">
              <ion-avatar slot="start" :class="`status-${customer.status}`">
                <ion-icon :icon="personCircleOutline" size="large"></ion-icon>
              </ion-avatar>
              <ion-label>
                <h2>{{ customer.name }}</h2>
                <p>{{ customer.phone }}</p>
                <p><small>{{ customer.address || 'ไม่ระบุที่อยู่' }}</small></p>
                <ion-badge :color="getCustomerStatusColor(customer.status)">
                  {{ getCustomerStatusText(customer.status) }}
                </ion-badge>
              </ion-label>
            </ion-item>

            <ion-item-options side="end">
              <ion-item-option color="primary" @click="viewCustomerOrders(customer)">
                <ion-icon :icon="receiptOutline"></ion-icon>
                ประวัติ
              </ion-item-option>
              <ion-item-option color="warning" @click="editCustomer(customer)">
                <ion-icon :icon="createOutline"></ion-icon>
                แก้ไข
              </ion-item-option>
              <ion-item-option color="danger" @click="toggleCustomerStatus(customer)">
                <ion-icon :icon="banOutline"></ion-icon>
                {{ customer.status === 'suspended' ? 'เปิดใช้' : 'ระงับ' }}
              </ion-item-option>
            </ion-item-options>
          </ion-item-sliding>
        </ion-list>

        <!-- No Customers -->
        <div v-if="filteredCustomers.length === 0" class="ion-padding ion-text-center">
          <ion-icon :icon="peopleOutline" size="large" color="medium"></ion-icon>
          <p>ไม่พบลูกค้า</p>
        </div>
      </div>

      <!-- Add/Edit Customer Modal -->
      <ion-modal :is-open="showCustomerModal" @didDismiss="closeCustomerModal">
        <ion-header>
          <ion-toolbar>
            <ion-title>{{ editingCustomer ? 'แก้ไขข้อมูลลูกค้า' : 'เพิ่มลูกค้าใหม่' }}</ion-title>
            <ion-buttons slot="end">
              <ion-button @click="closeCustomerModal">ปิด</ion-button>
            </ion-buttons>
          </ion-toolbar>
        </ion-header>

        <ion-content class="ion-padding">
          <ion-list>
            <ion-item>
              <ion-label position="stacked">ชื่อ *</ion-label>
              <ion-input v-model="customerForm.name" placeholder="ชื่อลูกค้า"></ion-input>
            </ion-item>

            <ion-item>
              <ion-label position="stacked">เบอร์โทรศัพท์ *</ion-label>
              <ion-input v-model="customerForm.phone" type="tel" placeholder="08X-XXX-XXXX"></ion-input>
            </ion-item>

            <ion-item>
              <ion-label position="stacked">ที่อยู่</ion-label>
              <ion-textarea v-model="customerForm.address" placeholder="ที่อยู่ลูกค้า" :rows="3"></ion-textarea>
            </ion-item>

            <ion-item v-if="editingCustomer">
              <ion-label position="stacked">สถานะ</ion-label>
              <ion-select v-model="customerForm.status">
                <ion-select-option value="normal">ปกติ</ion-select-option>
                <ion-select-option value="has_pending">มีค้างชำระ</ion-select-option>
                <ion-select-option value="suspended">งดบริการ</ion-select-option>
              </ion-select>
            </ion-item>
          </ion-list>

          <div class="ion-padding">
            <ion-button expand="block" @click="saveCustomer" :disabled="!isCustomerFormValid">
              {{ editingCustomer ? 'บันทึกการแก้ไข' : 'เพิ่มลูกค้า' }}
            </ion-button>
          </div>
        </ion-content>
      </ion-modal>

      <!-- Planning Section -->
      <div v-if="selectedSegment === 'planning' && !loading">
        <!-- Date Picker -->
        <ion-card>
          <ion-card-header>
            <ion-card-title>เลือกวันที่แพลน</ion-card-title>
          </ion-card-header>
          <ion-card-content>
            <ion-datetime-button style="justify-content: flex-start;" datetime="plan-datetime"></ion-datetime-button>
              <ion-modal :keep-contents-mounted="true">
                <ion-datetime 
                  id="plan-datetime" 
                  presentation="date" 
                  v-model="planDate"
                  :prefer-wheel="false"
                ></ion-datetime>
              </ion-modal>
          </ion-card-content>
        </ion-card>

        <!-- Product Selection -->
        <!-- <ion-card class="products-card">
          <ion-card-header>
            <ion-card-title>เลือกสินค้า</ion-card-title>
          </ion-card-header>
          <ion-card-content>
            <ion-grid>
              <ion-row>
                <ion-col v-for="product in products" :key="product.name" size="4" class="product-col">
                  <ion-button expand="full" color="primary" class="product-btn" @click="addToPlanCart(product.name)">
                    {{ product.name }}
                  </ion-button>
                </ion-col>
              </ion-row>
            </ion-grid>
          </ion-card-content>
        </ion-card> -->

        <ion-card class="products-card">
        <ion-card-header>
          <ion-card-title>เลือกสินค้า</ion-card-title>
        </ion-card-header>
        <ion-card-content>
          <ion-grid class="product-grid">
            <ion-row>
              <ion-col v-for="product in products" :key="product.name" size="4" class="product-col">
                <ion-button expand="full" color="primary" class="product-btn" @click="addToPlanCart(product.name)">
                  {{ product.name }}
                </ion-button>
              </ion-col>
            </ion-row>
          </ion-grid>
        </ion-card-content>
      </ion-card>

        <!-- Plan Cart -->
        <ion-card v-if="planCart.length > 0">
          <ion-card-header>
            <ion-card-title>รายการสั่งจอง ({{ planCart.length }})</ion-card-title>
            <ion-card-subtitle>{{ formatPlanDate(planDate) }}</ion-card-subtitle>
          </ion-card-header>
          <ion-card-content class="cart-content">
            <ion-item>
              <ion-input 
                label-placement="floating" 
                v-model="planCustomerName" 
                type="text" 
                placeholder="กรอกชื่อผู้สั่ง"
              >
                <div slot="label">ชื่อลูกค้า *</div>
              </ion-input>
            </ion-item>
            
            <ion-list>
              <ion-item v-for="item in planCart" :key="item.name">
                <ion-label>{{ item.name }}</ion-label>
                <ion-input
                  type="number"
                  min="1"
                  v-model.number="item.qty"
                  @ionBlur="onPlanQtyBlur(item)"
                  style="width: 80px; margin-left: 12px;"
                  inputmode="numeric"
                ></ion-input>
                <ion-button color="danger" size="small" slot="end" @click="removeFromPlanCart(item.name)">
                  <ion-icon :icon="trashOutline"></ion-icon>
                </ion-button>
              </ion-item>
            </ion-list>

            <div class="ion-padding">
              <ion-button expand="block" color="success" @click="savePlan" :disabled="!planCustomerName.trim()">
                <ion-icon :icon="saveOutline" slot="start"></ion-icon>
                บันทึกสั่งจองล่วงหน้า
              </ion-button>
            </div>
          </ion-card-content>
        </ion-card>

        <!-- Saved Pre-Orders List -->
        <ion-card>
          <ion-card-header>
            <ion-card-title>รายการสั่งจองล่วงหน้า</ion-card-title>
          </ion-card-header>
          <ion-card-content>
            <ion-list v-if="groupedPreOrders.length > 0">
              <ion-item-sliding v-for="group in groupedPreOrders" :key="group.date + group.customerName">
                <ion-item button @click="viewPreOrderDetail(group)">
                  <ion-icon :icon="calendarOutline" slot="start" color="primary"></ion-icon>
                  <ion-label>
                    <h2>{{ group.customerName }}</h2>
                    <p>{{ formatPlanDate(group.date) }}</p>
                    <p>{{ group.items.length }} รายการ</p>
                  </ion-label>
                  <ion-badge slot="end" color="warning">
                    สั่งจอง
                  </ion-badge>
                </ion-item>

                <ion-item-options side="end">
                  <ion-item-option color="success" @click="completePreOrderGroup(group)">
                    <ion-icon :icon="checkmarkCircle"></ion-icon>
                    ส่งแล้ว
                  </ion-item-option>
                  <ion-item-option color="danger" @click="cancelPreOrderGroup(group)">
                    <ion-icon :icon="trashOutline"></ion-icon>
                    ยกเลิก
                  </ion-item-option>
                </ion-item-options>
              </ion-item-sliding>
            </ion-list>
            <p v-else class="ion-text-center ion-padding">ยังไม่มีรายการสั่งจองล่วงหน้า</p>
          </ion-card-content>
        </ion-card>
      </div>

      <!-- Pre-Order Detail Modal -->
      <ion-modal :is-open="showPlanDetailModal" @didDismiss="closePlanDetailModal">
        <ion-header>
          <ion-toolbar>
            <ion-title>รายละเอียดสั่งจอง</ion-title>
            <ion-buttons slot="end">
              <ion-button @click="closePlanDetailModal">ปิด</ion-button>
            </ion-buttons>
          </ion-toolbar>
        </ion-header>

        <ion-content class="ion-padding" v-if="selectedPreOrderGroup">
          <ion-card>
            <ion-card-header>
              <ion-card-title>{{ selectedPreOrderGroup.customerName }}</ion-card-title>
              <ion-card-subtitle>
                {{ formatPlanDate(selectedPreOrderGroup.date) }}
                <ion-badge color="warning" style="margin-left: 8px;">สั่งจองล่วงหน้า</ion-badge>
              </ion-card-subtitle>
            </ion-card-header>
            <ion-card-content>
              <ion-list>
                <ion-item v-for="item in selectedPreOrderGroup.items" :key="item.order_id">
                  <ion-label>
                    <h3>{{ item.product_name }}</h3>
                  </ion-label>
                  <ion-note slot="end">{{ item.quantity }} หน่วย</ion-note>
                </ion-item>
              </ion-list>
              
              <div class="ion-padding-top">
                <p><strong>ยอดรวม:</strong> {{ formatCurrency(selectedPreOrderGroup.totalPrice) }}</p>
              </div>
            </ion-card-content>
          </ion-card>

          <div class="ion-padding">
            <ion-button expand="block" color="success" @click="completePreOrderWithPayment(selectedPreOrderGroup)">
              <ion-icon :icon="checkmarkCircle" slot="start"></ion-icon>
              ส่งสินค้าและรับชำระเงิน
            </ion-button>
          </div>
        </ion-content>
      </ion-modal>

      <!-- Customer Detail Modal -->
      <ion-modal :is-open="showCustomerDetailModal" @didDismiss="closeCustomerDetailModal">
        <ion-header>
          <ion-toolbar>
            <ion-title>{{ selectedCustomer?.name }}</ion-title>
            <ion-buttons slot="end">
              <ion-button @click="closeCustomerDetailModal">ปิด</ion-button>
            </ion-buttons>
          </ion-toolbar>
        </ion-header>

        <ion-content class="ion-padding" v-if="selectedCustomer">
          <ion-card>
            <ion-card-header>
              <ion-card-title>ข้อมูลลูกค้า</ion-card-title>
            </ion-card-header>
            <ion-card-content>
              <ion-list>
                <ion-item>
                  <ion-label>
                    <h3>ชื่อ</h3>
                    <p>{{ selectedCustomer.name }}</p>
                  </ion-label>
                </ion-item>
                <ion-item>
                  <ion-label>
                    <h3>เบอร์โทร</h3>
                    <p>{{ selectedCustomer.phone }}</p>
                  </ion-label>
                  <ion-button slot="end" @click="callCustomer(selectedCustomer.phone)">
                    <ion-icon :icon="callOutline"></ion-icon>
                  </ion-button>
                </ion-item>
                <ion-item>
                  <ion-label>
                    <h3>ที่อยู่</h3>
                    <p>{{ selectedCustomer.address || 'ไม่ระบุ' }}</p>
                  </ion-label>
                </ion-item>
                <ion-item>
                  <ion-label>
                    <h3>สถานะ</h3>
                    <ion-badge :color="getCustomerStatusColor(selectedCustomer.status)">
                      {{ getCustomerStatusText(selectedCustomer.status) }}
                    </ion-badge>
                  </ion-label>
                </ion-item>
              </ion-list>
            </ion-card-content>
          </ion-card>

          <ion-card>
            <ion-card-header>
              <ion-card-title>ประวัติการสั่งซื้อ</ion-card-title>
            </ion-card-header>
            <ion-card-content>
              <ion-list v-if="customerOrders.length > 0">
                <ion-item v-for="order in customerOrders" :key="order.order_id">
                  <ion-label>
                    <h3>{{ formatDate(order.order_date) }}</h3>
                    <p>{{ order.product_name }} x {{ order.quantity }}</p>
                    <ion-badge :color="getPaymentStatusColor(order.payment_status)">
                      {{ getPaymentStatusText(order.payment_status) }}
                    </ion-badge>
                  </ion-label>
                  <ion-note slot="end">{{ formatCurrency(order.total_price) }}</ion-note>
                </ion-item>
              </ion-list>
              <p v-else class="ion-text-center ion-padding">ไม่มีประวัติการสั่งซื้อ</p>
            </ion-card-content>
          </ion-card>
        </ion-content>
      </ion-modal>

    </ion-content>
  </ion-page>
</template>

<script setup lang="ts">
import { ref, computed, onMounted } from 'vue';
import {
  IonPage, IonHeader, IonToolbar, IonTitle, IonContent, IonSegment, IonSegmentButton,
  IonLabel, IonCard, IonCardHeader, IonCardTitle, IonCardSubtitle, IonCardContent,
  IonList, IonItem, IonNote, IonBadge, IonIcon, IonGrid, IonRow, IonCol, IonButton,
  IonSearchbar, IonAvatar, IonModal, IonInput, IonTextarea, IonSelect, IonSelectOption,
  IonButtons, IonSpinner, IonItemSliding, IonItemOptions, IonItemOption,
  alertController, toastController, IonRefresher, IonRefresherContent,
  IonDatetime, IonDatetimeButton, onIonViewWillEnter
} from '@ionic/vue';
import {
  checkmarkCircle, checkmarkCircleOutline, callOutline, personCircleOutline,
  personAddOutline, peopleOutline, receiptOutline, createOutline, banOutline,
  trashOutline, saveOutline, calendarOutline
} from 'ionicons/icons';
import { getAllPendingPayments } from '../services/paymentService';
import { getUsers, createUser, updateUser, getUserOrderHistory } from '../services/userService';
import { getProducts } from '../services/productService';
import { updatePaymentStatus, createPreOrder, getPreOrders, completePreOrder, cancelPreOrder } from '../services/orderService';
import type { Database } from '../types/supabase';
import type { OrderWithDetails } from '../services/orderService';

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
const selectedSegment = ref('pending');
const searchQuery = ref('');
const customerStatusFilter = ref('all');
const showCustomerModal = ref(false);
const showCustomerDetailModal = ref(false);
const editingCustomer = ref<User | null>(null);
const selectedCustomer = ref<User | null>(null);

const pendingPayments = ref<PendingPaymentWithDetails[]>([]);
const customers = ref<User[]>([]);
const customerOrders = ref<OrderWithDetails[]>([]);

// Planning state
type Product = Database['public']['Tables']['products']['Row'];
const products = ref<Product[]>([]);
const planDate = ref(new Date().toISOString());
const planCustomerName = ref('');
const planCart = ref<{ name: string; qty: number }[]>([]);
const savedPlans = ref<ProductPlan[]>([]);
const preOrders = ref<any[]>([]);
const showPlanDetailModal = ref(false);
const selectedPlan = ref<ProductPlan | null>(null);
const selectedPreOrderGroup = ref<PreOrderGroup | null>(null);

interface PreOrderGroup {
  date: string;
  customerName: string;
  items: any[];
  totalPrice: number;
  orderIds: string[];
}

interface ProductPlanItem {
  name: string;
  qty: number;
}

interface ProductPlan {
  id: string;
  plan_date: string;
  items: ProductPlanItem[];
  status: 'pending' | 'completed';
  created_at: string;
}

const customerForm = ref({
  name: '',
  phone: '',
  address: '',
  status: 'normal' as 'normal' | 'has_pending' | 'suspended'
});

// Computed
const totalPendingAmount = computed(() => {
  return pendingPayments.value.reduce((sum, p) => sum + p.amount, 0);
});

const filteredCustomers = computed(() => {
  let filtered = customers.value;

  if (customerStatusFilter.value !== 'all') {
    filtered = filtered.filter(c => c.status === customerStatusFilter.value);
  }

  if (searchQuery.value) {
    const query = searchQuery.value.toLowerCase();
    filtered = filtered.filter(c =>
      c.name.toLowerCase().includes(query) ||
      c.phone.includes(query)
    );
  }

  return filtered;
});

const isCustomerFormValid = computed(() => {
  return customerForm.value.name.trim() && customerForm.value.phone.trim();
});

// Methods
async function loadPendingPayments() {
  loading.value = true;
  error.value = '';

  try {
    const { data, error: err } = await getAllPendingPayments();
    if (err) throw new Error(err);
    pendingPayments.value = (data || []).map((item: any) => ({
      ...item,
      user_id: item.user_id || '',
      user_phone: item.user_phone || ''
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

function searchCustomers() {
  // Filtering is handled by computed property
}

async function markPendingAsPaid(pending: PendingPaymentWithDetails) {
  const alert = await alertController.create({
    header: 'ยืนยันการชำระเงิน',
    message: `ยืนยันว่าลูกค้า ${pending.user_name} ชำระเงิน ${formatCurrency(pending.amount)} แล้ว?`,
    inputs: [
      {
        name: 'payment_method',
        type: 'radio',
        label: 'เงินสด',
        value: 'cash',
        checked: true
      },
      {
        name: 'payment_method',
        type: 'radio',
        label: 'โอนเงิน',
        value: 'transfer'
      }
    ],
    buttons: [
      { text: 'ยกเลิก', role: 'cancel' },
      {
        text: 'ยืนยัน',
        role: 'confirm',
        handler: async (data) => {
          const { error: err } = await updatePaymentStatus(
            pending.order_id,
            'paid',
            undefined,
            data.payment_method
          );

          if (err) {
            await showToast(err, 'danger');
          } else {
            await showToast('อัพเดทสถานะชำระเงินสำเร็จ', 'success');
            loadPendingPayments();
          }
        }
      }
    ]
  });

  await alert.present();
}

function contactCustomer(pending: PendingPaymentWithDetails) {
  callCustomer(pending.user_phone);
}

function callCustomer(phone: string) {
  window.location.href = `tel:${phone}`;
}

function viewPendingDetail(pending: PendingPaymentWithDetails) {
  // TODO: Implement pending detail view
  console.log('View pending:', pending);
}

function openAddCustomerModal() {
  editingCustomer.value = null;
  resetCustomerForm();
  showCustomerModal.value = true;
}

function closeCustomerModal() {
  showCustomerModal.value = false;
  resetCustomerForm();
}

function resetCustomerForm() {
  customerForm.value = {
    name: '',
    phone: '',
    address: '',
    status: 'normal'
  };
}

async function saveCustomer() {
  loading.value = true;

  try {
    if (editingCustomer.value) {
      const { error: err } = await updateUser(editingCustomer.value.user_id, customerForm.value);
      if (err) throw new Error(err);
      await showToast('แก้ไขข้อมูลลูกค้าสำเร็จ', 'success');
    } else {
      const { error: err } = await createUser(customerForm.value);
      if (err) throw new Error(err);
      await showToast('เพิ่มลูกค้าใหม่สำเร็จ', 'success');
    }

    closeCustomerModal();
    loadCustomers();
  } catch (err: any) {
    await showToast(err.message, 'danger');
  } finally {
    loading.value = false;
  }
}

function editCustomer(customer: User) {
  editingCustomer.value = customer;
  customerForm.value = {
    name: customer.name,
    phone: customer.phone,
    address: customer.address || '',
    status: customer.status
  };
  showCustomerModal.value = true;
}

async function toggleCustomerStatus(customer: User) {
  const newStatus = customer.status === 'suspended' ? 'normal' : 'suspended';
  const action = newStatus === 'suspended' ? 'ระงับ' : 'เปิดใช้';

  const alert = await alertController.create({
    header: `ยืนยัน${action}บัญชี`,
    message: `คุณต้องการ${action}บัญชีของ ${customer.name} หรือไม่?`,
    buttons: [
      { text: 'ยกเลิก', role: 'cancel' },
      {
        text: 'ยืนยัน',
        role: 'confirm',
        handler: async () => {
          const { error: err } = await updateUser(customer.user_id, { status: newStatus });
          if (err) {
            await showToast(err, 'danger');
          } else {
            await showToast(`${action}บัญชีสำเร็จ`, 'success');
            loadCustomers();
          }
        }
      }
    ]
  });

  await alert.present();
}

async function viewCustomerDetail(customer: User) {
  selectedCustomer.value = customer;
  showCustomerDetailModal.value = true;

  // Load customer orders
  const { data } = await getUserOrderHistory(customer.user_id, 20);
  customerOrders.value = data || [];
}

function closeCustomerDetailModal() {
  showCustomerDetailModal.value = false;
  selectedCustomer.value = null;
  customerOrders.value = [];
}

async function viewCustomerOrders(customer: User) {
  await viewCustomerDetail(customer);
}

function getDaysOverdueClass(days: number) {
  if (days <= 7) return 'overdue-low';
  if (days <= 30) return 'overdue-medium';
  return 'overdue-high';
}

function getDaysOverdueColor(days: number) {
  if (days <= 7) return 'warning';
  if (days <= 30) return 'danger';
  return 'dark';
}

function getCustomerStatusColor(status: string) {
  switch (status) {
    case 'normal': return 'success';
    case 'has_pending': return 'warning';
    case 'suspended': return 'danger';
    default: return 'medium';
  }
}

function getCustomerStatusText(status: string) {
  switch (status) {
    case 'normal': return 'ปกติ';
    case 'has_pending': return 'มีค้างชำระ';
    case 'suspended': return 'งดบริการ';
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

function formatDate(dateString: string) {
  const date = new Date(dateString);
  return new Intl.DateTimeFormat('th-TH', {
    year: 'numeric',
    month: 'short',
    day: 'numeric'
  }).format(date);
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

// Planning functions
async function loadProducts() {
  try {
    const { data, error: err } = await getProducts();
    if (err) throw new Error(err);
    products.value = data || [];
  } catch (err: any) {
    error.value = err.message;
  }
}

async function loadPreOrders() {
  try {
    const { data, error: err } = await getPreOrders();
    if (err) throw new Error(err);
    preOrders.value = data || [];
  } catch (err: any) {
    error.value = err.message;
  }
}

// Computed: Group pre-orders by date and customer
const groupedPreOrders = computed(() => {
  const map = new Map<string, PreOrderGroup>();

  for (const order of preOrders.value) {
    const key = `${order.order_date}_${order.user_name}`;
    if (!map.has(key)) {
      map.set(key, {
        date: order.order_date,
        customerName: order.user_name,
        items: [],
        totalPrice: 0,
        orderIds: []
      });
    }
    const group = map.get(key)!;
    group.items.push(order);
    group.totalPrice += order.total_price;
    group.orderIds.push(order.order_id);
  }

  return Array.from(map.values()).sort((a, b) => 
    new Date(a.date).getTime() - new Date(b.date).getTime()
  );
});

function addToPlanCart(productName: string) {
  const idx = planCart.value.findIndex(item => item.name === productName);
  if (idx > -1) {
    planCart.value[idx].qty += 1;
  } else {
    planCart.value.push({ name: productName, qty: 1 });
  }
}

function removeFromPlanCart(productName: string) {
  planCart.value = planCart.value.filter(item => item.name !== productName);
}

function onPlanQtyBlur(item: { name: string; qty: number }) {
  if (!item.qty || item.qty < 1) {
    item.qty = 1;
  }
}

function loadSavedPlans() {
  // โหลดจาก localStorage (สำหรับ backward compatibility)
  const stored = localStorage.getItem('product_plans');
  if (stored) {
    savedPlans.value = JSON.parse(stored);
  }
}

async function savePlan() {
  if (planCart.value.length === 0) {
    await showToast('กรุณาเลือกสินค้าอย่างน้อยหนึ่งรายการ', 'danger');
    return;
  }

  if (!planCustomerName.value.trim()) {
    await showToast('กรุณากรอกชื่อลูกค้า', 'danger');
    return;
  }

  loading.value = true;

  try {
    // บันทึกเป็น Pre-Order ผ่าน API
    const { error: err } = await createPreOrder({
      customerName: planCustomerName.value.trim(),
      items: planCart.value.map(item => ({
        productName: item.name,
        qty: item.qty
      })),
      planDate: planDate.value
    });

    if (err) throw new Error(err);

    await showToast('บันทึกสั่งจองล่วงหน้าสำเร็จ', 'success');

    // ล้างข้อมูล
    planCart.value = [];
    planCustomerName.value = '';
    planDate.value = new Date().toISOString();

    // โหลดรายการใหม่
    await loadPreOrders();
  } catch (err: any) {
    await showToast(err.message, 'danger');
  } finally {
    loading.value = false;
  }
}

function viewPreOrderDetail(group: PreOrderGroup) {
  selectedPreOrderGroup.value = group;
  showPlanDetailModal.value = true;
}

function closePlanDetailModal() {
  showPlanDetailModal.value = false;
  selectedPlan.value = null;
  selectedPreOrderGroup.value = null;
}

async function completePreOrderGroup(group: PreOrderGroup) {
  const alert = await alertController.create({
    header: 'ยืนยันการส่งสินค้า',
    message: `ส่งสินค้าให้ ${group.customerName} และรับชำระเงิน ${formatCurrency(group.totalPrice)}?`,
    inputs: [
      {
        name: 'payment_method',
        type: 'radio',
        label: 'เงินสด',
        value: 'cash',
        checked: true
      },
      {
        name: 'payment_method',
        type: 'radio',
        label: 'โอนเงิน',
        value: 'transfer'
      }
    ],
    buttons: [
      { text: 'ยกเลิก', role: 'cancel' },
      {
        text: 'ยืนยัน',
        role: 'confirm',
        handler: async (data) => {
          loading.value = true;
          try {
            for (const orderId of group.orderIds) {
              const { error: err } = await completePreOrder(orderId, data);
              if (err) throw new Error(err);
            }
            await showToast('ส่งสินค้าและรับชำระเงินสำเร็จ', 'success');
            await loadPreOrders();
          } catch (err: any) {
            await showToast(err.message, 'danger');
          } finally {
            loading.value = false;
          }
        }
      }
    ]
  });

  await alert.present();
}

async function completePreOrderWithPayment(group: PreOrderGroup) {
  closePlanDetailModal();
  await completePreOrderGroup(group);
}

async function cancelPreOrderGroup(group: PreOrderGroup) {
  const alert = await alertController.create({
    header: 'ยืนยันการยกเลิก',
    message: `ต้องการยกเลิกสั่งจองของ ${group.customerName} หรือไม่?`,
    buttons: [
      { text: 'ไม่', role: 'cancel' },
      {
        text: 'ยกเลิก',
        role: 'destructive',
        handler: async () => {
          loading.value = true;
          try {
            for (const orderId of group.orderIds) {
              const { error: err } = await cancelPreOrder(orderId);
              if (err) throw new Error(err);
            }
            await showToast('ยกเลิกสั่งจองสำเร็จ', 'success');
            await loadPreOrders();
          } catch (err: any) {
            await showToast(err.message, 'danger');
          } finally {
            loading.value = false;
          }
        }
      }
    ]
  });
  await alert.present();
}

function formatPlanDate(dateString: string) {
  const date = new Date(dateString);
  return new Intl.DateTimeFormat('th-TH', {
    weekday: 'long',
    year: 'numeric',
    month: 'long',
    day: 'numeric'
  }).format(date);
}

onMounted(() => {
  loadPendingPayments();
  loadCustomers();
  loadProducts();
  loadSavedPlans();
  loadPreOrders();
});

onIonViewWillEnter(() => {
  loadPendingPayments();
  loadCustomers();
  loadProducts();
  loadSavedPlans();
  loadPreOrders();
});

async function handleRefresh(event: any) {
  await Promise.all([
    loadPendingPayments(),
    loadCustomers(),
    loadProducts(),
    loadPreOrders()
  ]);
  loadSavedPlans();
  event.target.complete();
}
</script>

<style scoped>
.products-card {
  border-radius: 16px;
}

.product-grid {
  padding: 0;
}

.product-col {
  padding: 2px;
}

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
