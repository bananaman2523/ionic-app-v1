<template>
  <ion-page>
    <ion-header>
      <ion-toolbar>
        <ion-title>สต็อกสินค้า</ion-title>
          <ion-buttons slot="end">
            <ion-button @click="onAddStock">
              <ion-icon name="add-circle-outline"></ion-icon>
              เพิ่มสต็อก
            </ion-button>
          </ion-buttons>
      </ion-toolbar>
    </ion-header>
    <ion-content :fullscreen="true">
      <div v-if="loading" class="ion-padding ion-text-center">
        <ion-spinner></ion-spinner>
      </div>
      <ion-card v-if="error" color="danger">
        <ion-card-content>{{ error }}</ion-card-content>
      </ion-card>
      <ion-card>
        <ion-card-header>
          <ion-card-title>รายการสินค้าในสต็อก</ion-card-title>
        </ion-card-header>
        <ion-card-content>
          <ion-list>
            <ion-item v-for="product in products" :key="product.product_id">
              <ion-label>
                <h2>{{ product.name }}</h2>
                <p>กำไร/หน่วย <strong>{{ formatCurrency(product.sell_price - product.cost_price) }}</strong></p>
                <p>ต้นทุน: <strong>{{ formatCurrency(product.cost_price) }}</strong> | ขาย: <strong>{{ formatCurrency(product.sell_price) }}</strong></p>
              </ion-label>
              <ion-label slot="end">
                <p>คงเหลือ</p>
                <ion-badge
                  :color="product.stock_quantity <= 0 ? 'danger' : (product.stock_quantity > 0 && product.stock_quantity <= 5 ? 'warning' : 'success')"
                >
                  {{ product.stock_quantity }} {{ product.unit }}
                </ion-badge>
              </ion-label>
            </ion-item>
          </ion-list>
        </ion-card-content>
      </ion-card>

      <!-- Modal เพิ่มสต็อก -->
      <ion-modal :is-open="showAddStockModal" @didDismiss="closeAddStockModal">
        <ion-content class="ion-padding">
          <h2>เพิ่มสต็อกสินค้า</h2>
          <ion-list>
            <ion-item>
              <ion-label position="stacked">เลือกสินค้า</ion-label>
              <ion-select v-model="addStockForm.product_id" placeholder="เลือกสินค้า">
                <ion-select-option v-for="product in products" :key="product.product_id" :value="product.product_id">
                  {{ product.name }} (คงเหลือ: {{ product.stock_quantity }})
                </ion-select-option>
              </ion-select>
            </ion-item>
            <ion-item>
              <ion-label position="stacked">จำนวนที่เพิ่ม</ion-label>
              <ion-input
                v-model="addStockForm.quantity"
                type="number"
                min="1"
                placeholder="จำนวน"
                @ionChange="onQuantityChange"
              ></ion-input>
            </ion-item>
          </ion-list>
          <div class="ion-padding-top">
            <ion-button expand="block" @click="submitAddStock" :disabled="!addStockForm.product_id || !addStockForm.quantity">บันทึก</ion-button>
            <ion-button expand="block" color="medium" @click="closeAddStockModal" fill="outline">ยกเลิก</ion-button>
          </div>
        </ion-content>
      </ion-modal>
    </ion-content>
  </ion-page>
</template>

<script setup lang="ts">
import { ref, onMounted } from 'vue';
import { IonPage, IonHeader, IonToolbar, IonTitle, IonContent, IonCard, IonCardHeader, IonCardTitle, IonCardContent, IonList, IonItem, IonLabel, IonSelect, IonSpinner , IonBadge, IonInput, IonModal, onIonViewWillEnter } from '@ionic/vue';
import { getProducts, updateStock } from '../services/productService';
import { toastController } from '@ionic/vue';
import type { Database } from '../types/supabase';

type Product = Database['public']['Tables']['products']['Row'];

const loading = ref(false);
const error = ref('');
const products = ref<Product[]>([]);

function onQuantityChange(event: CustomEvent) {
  const value = event.detail.value;
  addStockForm.value.quantity = value ? Number(value) : 1;
}

// Modal เพิ่มสต็อก
const showAddStockModal = ref(false);
const addStockForm = ref({
  product_id: '',
  quantity: 1,
});

function formatCurrency(amount: number): string {
  return new Intl.NumberFormat('th-TH', {
    style: 'currency',
    currency: 'THB'
  }).format(amount);
}

async function loadProducts() {
  loading.value = true;
  error.value = '';
  try {
    const { data, error: err } = await getProducts();
    if (err) throw new Error(err);
    products.value = data || [];
  } catch (err) {
    if (err instanceof Error) {
      error.value = err.message;
    } else {
      error.value = String(err);
    }
  } finally {
    loading.value = false;
  }
}

onMounted(() => {
  loadProducts();
});

onIonViewWillEnter(() => {
  loadProducts();
});

function onAddStock() {
  addStockForm.value = { product_id: '', quantity: 1 };
  showAddStockModal.value = true;
}

function closeAddStockModal() {
  showAddStockModal.value = false;
}

async function submitAddStock() {
  const selectedProduct = products.value.find(p => p.product_id === addStockForm.value.product_id);
  if (!selectedProduct || !addStockForm.value.quantity) return;
  // Ensure quantity is a number
  const quantity = Number(addStockForm.value.quantity);
  if (!quantity || isNaN(quantity)) return;
  loading.value = true;
  try {
    // ใช้ updateStock เพื่อบันทึกประวัติและอัพเดทสต็อก
    const { error } = await updateStock(
      addStockForm.value.product_id,
      quantity,
      'in',
      ''
    );
    if (error) throw new Error(error);
    showAddStockModal.value = false;
    await loadProducts();
    await toastController.create({
      message: 'เพิ่มสต็อกสำเร็จ',
      duration: 1500,
      color: 'success',
      position: 'top'
    }).then(t => t.present());
  } catch (err) {
    await toastController.create({
      message: err instanceof Error ? err.message : String(err),
      duration: 2000,
      color: 'danger',
      position: 'top'
    }).then(t => t.present());
  } finally {
    loading.value = false;
  }
}
</script>

<style scoped>
ion-list {
  padding: 0;
}
</style>
