<template>
  <ion-page>
    <ion-header>
      <ion-toolbar>
        <ion-title>คลังสินค้า/สต็อก</ion-title>
        <ion-buttons slot="end">
          <ion-button @click="openAddProductModal">
            <ion-icon :icon="addCircleOutline"></ion-icon>
            เพิ่มสินค้า
          </ion-button>
        </ion-buttons>
      </ion-toolbar>
    </ion-header>

    <ion-content :fullscreen="true">
      <!-- Pull to Refresh -->
      <ion-refresher slot="fixed" @ionRefresh="handleRefresh($event)">
        <ion-refresher-content></ion-refresher-content>
      </ion-refresher>

      <!-- Loading -->
      <div v-if="loading" class="ion-padding ion-text-center">
        <ion-spinner></ion-spinner>
      </div>

      <!-- Low Stock Alerts -->
      <ion-card v-if="lowStockProducts.length > 0" color="warning">
        <ion-card-header>
          <ion-card-title>
            <ion-icon :icon="warningOutline"></ion-icon>
            แจ้งเตือนสต็อกต่ำ
          </ion-card-title>
        </ion-card-header>
        <ion-card-content>
          <ion-list>
            <ion-item v-for="product in lowStockProducts" :key="product.product_id" color="warning">
              <ion-label>
                <h3>{{ product.name }}</h3>
                <p>คงเหลือ: {{ product.stock_quantity }} {{ product.unit }}</p>
              </ion-label>
              <ion-badge slot="end" color="danger">สต็อกต่ำ!</ion-badge>
            </ion-item>
          </ion-list>
        </ion-card-content>
      </ion-card>

      <!-- Products List -->
      <ion-card>
        <ion-card-header>
          <ion-card-title>รายการสินค้า</ion-card-title>
        </ion-card-header>
        <ion-card-content>
          <ion-list>
            <ion-item-sliding v-for="product in products" :key="product.product_id">
              <ion-item>
                <ion-label>
                  <h2>{{ product.name }}</h2>
                  <p>ต้นทุน: {{ formatCurrency(product.cost_price) }} | ขาย: {{ formatCurrency(product.sell_price) }}</p>
                  <p>
                    <ion-badge :color="getStockColor(product)">
                      สต็อก: {{ product.stock_quantity }} {{ product.unit }}
                    </ion-badge>
                  </p>
                </ion-label>
                <ion-note slot="end">
                  กำไร/หน่วย<br>
                  <strong>{{ formatCurrency(product.sell_price - product.cost_price) }}</strong>
                </ion-note>
              </ion-item>

              <ion-item-options side="end">
                <ion-item-option color="success" @click="openStockModal(product, 'in')">
                  <ion-icon :icon="arrowDownCircleOutline"></ion-icon>
                  รับเข้า
                </ion-item-option>
                <ion-item-option color="warning" @click="openStockModal(product, 'out')">
                  <ion-icon :icon="arrowUpCircleOutline"></ion-icon>
                  จ่ายออก
                </ion-item-option>
                <ion-item-option color="primary" @click="editProduct(product)">
                  <ion-icon :icon="createOutline"></ion-icon>
                  แก้ไข
                </ion-item-option>
              </ion-item-options>
            </ion-item-sliding>
          </ion-list>
        </ion-card-content>
      </ion-card>

      <!-- Inventory History -->
      <ion-card>
        <ion-card-header>
          <ion-card-title>ประวัติคลังสินค้า</ion-card-title>
          <ion-card-subtitle>10 รายการล่าสุด</ion-card-subtitle>
        </ion-card-header>
        <ion-card-content>
          <ion-list v-if="inventoryHistory.length > 0">
            <ion-item v-for="item in inventoryHistory" :key="item.inventory_id">
              <ion-icon 
                :icon="getInventoryTypeIcon(item.type)" 
                :color="getInventoryTypeColor(item.type)"
                slot="start"
              ></ion-icon>
              <ion-label>
                <h3>{{ item.products?.name }}</h3>
                <p>{{ formatDate(item.date) }}</p>
                <p v-if="item.note">{{ item.note }}</p>
              </ion-label>
              <ion-note slot="end">
                <ion-badge :color="getInventoryTypeColor(item.type)">
                  {{ getInventoryTypeText(item.type) }}
                </ion-badge><br>
                <p style="text-align: end;">{{ item.quantity }} {{ item.products?.unit }}</p>
              </ion-note>
            </ion-item>
          </ion-list>
          <p v-else class="ion-text-center ion-padding">ไม่มีประวัติ</p>
        </ion-card-content>
      </ion-card>

      <!-- Stock Update Modal -->
      <ion-modal :is-open="showStockModal" @didDismiss="closeStockModal">
        <ion-header>
          <ion-toolbar>
            <ion-title>{{ stockModalTitle }}</ion-title>
            <ion-buttons slot="end">
              <ion-button @click="closeStockModal">ปิด</ion-button>
            </ion-buttons>
          </ion-toolbar>
        </ion-header>

        <ion-content class="ion-padding" v-if="selectedProduct">
          <ion-card>
            <ion-card-content>
              <h2>{{ selectedProduct.name }}</h2>
              <p>สต็อกปัจจุบัน: <strong>{{ selectedProduct.stock_quantity }} {{ selectedProduct.unit }}</strong></p>
            </ion-card-content>
          </ion-card>

          <ion-list>
            <ion-item>
              <ion-label position="stacked">ประเภท</ion-label>
              <ion-select v-model="stockForm.type" disabled>
                <ion-select-option value="in">รับเข้า</ion-select-option>
                <ion-select-option value="out">จ่ายออก</ion-select-option>
                <ion-select-option value="return">คืนสินค้า</ion-select-option>
                <ion-select-option value="loss">สูญเสีย</ion-select-option>
              </ion-select>
            </ion-item>

            <ion-item>
              <ion-label position="stacked">จำนวน *</ion-label>
              <ion-input
                v-model.number="stockForm.quantity"
                type="number"
                min="1"
                placeholder="จำนวน"
              ></ion-input>
            </ion-item>

            <ion-item>
              <ion-label position="stacked">หมายเหตุ</ion-label>
              <ion-textarea v-model="stockForm.note" placeholder="หมายเหตุ (ถ้ามี)"></ion-textarea>
            </ion-item>

            <ion-item>
              <ion-label>
                <h3>สต็อกหลังอัพเดท</h3>
                <p>
                  <strong>{{ calculateNewStock() }} {{ selectedProduct.unit }}</strong>
                </p>
              </ion-label>
            </ion-item>
          </ion-list>

          <div class="ion-padding">
            <ion-button expand="block" @click="updateStock" :disabled="!stockForm.quantity">
              บันทึก
            </ion-button>
          </div>
        </ion-content>
      </ion-modal>

      <!-- Add/Edit Product Modal -->
      <ion-modal :is-open="showProductModal" @didDismiss="closeProductModal">
        <ion-header>
          <ion-toolbar>
            <ion-title>{{ editingProduct ? 'แก้ไขสินค้า' : 'เพิ่มสินค้าใหม่' }}</ion-title>
            <ion-buttons slot="end">
              <ion-button @click="closeProductModal">ปิด</ion-button>
            </ion-buttons>
          </ion-toolbar>
        </ion-header>

        <ion-content class="ion-padding">
          <ion-list>
            <ion-item>
              <ion-label position="stacked">ชื่อสินค้า *</ion-label>
              <ion-input v-model="productForm.name" placeholder="เช่น ถังน้ำ 20 ลิตร"></ion-input>
            </ion-item>

            <ion-item>
              <ion-label position="stacked">ราคาต้นทุน *</ion-label>
              <ion-input
                v-model.number="productForm.cost_price"
                type="number"
                placeholder="ราคาต้นทุน"
              ></ion-input>
            </ion-item>

            <ion-item>
              <ion-label position="stacked">ราคาขาย *</ion-label>
              <ion-input
                v-model.number="productForm.sell_price"
                type="number"
                placeholder="ราคาขาย"
              ></ion-input>
            </ion-item>

            <ion-item>
              <ion-label position="stacked">หน่วยนับ *</ion-label>
              <ion-input v-model="productForm.unit" placeholder="เช่น ถัง, ขวด"></ion-input>
            </ion-item>

            <ion-item>
              <ion-label position="stacked">ลำดับ</ion-label>
              <ion-input
                v-model.number="productForm.sequence"
                type="number"
                placeholder="0"
              ></ion-input>
            </ion-item>

            <ion-item>
              <ion-label position="stacked">สต็อกเริ่มต้น</ion-label>
              <ion-input
                v-model.number="productForm.stock_quantity"
                type="number"
                placeholder="0"
              ></ion-input>
            </ion-item>

            <ion-item>
              <ion-label position="stacked">สต็อกขั้นต่ำ (แจ้งเตือน)</ion-label>
              <ion-input
                v-model.number="productForm.min_stock"
                type="number"
                placeholder="10"
              ></ion-input>
            </ion-item>
          </ion-list>

          <div class="ion-padding">
            <ion-button expand="block" @click="saveProduct" :disabled="!isProductFormValid">
              {{ editingProduct ? 'บันทึกการแก้ไข' : 'เพิ่มสินค้า' }}
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
  IonCardTitle, IonCardSubtitle, IonCardContent, IonModal, IonInput, IonTextarea,
  IonSelect, IonSelectOption, IonSpinner, IonItemSliding, IonItemOptions,
  IonItemOption, IonRefresher, IonRefresherContent, toastController, onIonViewWillEnter
} from '@ionic/vue';
import {
  addCircleOutline, warningOutline, createOutline, arrowDownCircleOutline,
  arrowUpCircleOutline
} from 'ionicons/icons';
import { getProducts, createProduct, updateProduct as updateProductService, getLowStockProducts, updateStock as updateStockService } from '../services/productService';
import { getInventoryHistory } from '../services/reportService';
import type { Database } from '../types/supabase';

type Product = Database['public']['Tables']['products']['Row'];

// State
const loading = ref(false);
const products = ref<Product[]>([]);
const lowStockProducts = ref<Product[]>([]);
const inventoryHistory = ref<any[]>([]);
const showStockModal = ref(false);
const showProductModal = ref(false);
const selectedProduct = ref<Product | null>(null);
const editingProduct = ref<Product | null>(null);

const stockForm = ref({
  type: 'in' as 'in' | 'out' | 'return' | 'loss',
  quantity: 0,
  note: ''
});

const productForm = ref({
  name: '',
  cost_price: 0,
  sell_price: 0,
  unit: '',
  sequence: 0,
  stock_quantity: 0,
  min_stock: 10
});

// Computed
const stockModalTitle = computed(() => {
  const typeText = {
    in: 'รับสินค้าเข้า',
    out: 'จ่ายสินค้าออก',
    return: 'คืนสินค้า',
    loss: 'สูญเสีย'
  };
  return typeText[stockForm.value.type];
});

const isProductFormValid = computed(() => {
  return productForm.value.name &&
    productForm.value.sell_price > 0 &&
    productForm.value.unit;
});

// Methods
async function loadProducts() {
  loading.value = true;
  const { data } = await getProducts();
  products.value = data || [];
  loading.value = false;
}

async function loadLowStockProducts() {
  const { data } = await getLowStockProducts();
  lowStockProducts.value = (data || []).map((item: any) => ({
    ...item,
    created_at: item.created_at || '',
    updated_at: item.updated_at || ''
  }));
}

async function loadInventoryHistory() {
  const { data } = await getInventoryHistory({ });
  inventoryHistory.value = (data || []).slice(0, 10);
}

function openStockModal(product: Product, type: 'in' | 'out') {
  selectedProduct.value = product;
  stockForm.value = {
    type,
    quantity: 0,
    note: ''
  };
  showStockModal.value = true;
}

function closeStockModal() {
  showStockModal.value = false;
  selectedProduct.value = null;
  stockForm.value = { type: 'in', quantity: 0, note: '' };
}

function calculateNewStock() {
  if (!selectedProduct.value) return 0;
  const current = selectedProduct.value.stock_quantity;
  const qty = stockForm.value.quantity || 0;
  
  if (stockForm.value.type === 'in' || stockForm.value.type === 'return') {
    return current + qty;
  } else {
    return current - qty;
  }
}

async function updateStock() {
  if (!selectedProduct.value) return;

  loading.value = true;
  const { error } = await updateStockService(
    selectedProduct.value.product_id,
    stockForm.value.quantity,
    stockForm.value.type,
    stockForm.value.note
  );

  if (error) {
    await showToast(error, 'danger');
  } else {
    await showToast('อัพเดทสต็อกสำเร็จ', 'success');
    closeStockModal();
    loadProducts();
    loadLowStockProducts();
    loadInventoryHistory();
  }
  loading.value = false;
}

function openAddProductModal() {
  editingProduct.value = null;
  productForm.value = {
    name: '',
    cost_price: 0,
    sell_price: 0,
    unit: '',
    sequence: 0,
    stock_quantity: 0,
    min_stock: 10
  };
  showProductModal.value = true;
}

function closeProductModal() {
  showProductModal.value = false;
  editingProduct.value = null;
}

function editProduct(product: Product) {
  editingProduct.value = product;
  productForm.value = {
    name: product.name,
    cost_price: product.cost_price,
    sell_price: product.sell_price,
    unit: product.unit,
    sequence: product.sequence || 0,
    stock_quantity: product.stock_quantity,
    min_stock: product.min_stock || 10
  };
  showProductModal.value = true;
}

async function saveProduct() {
  loading.value = true;

  try {
    if (editingProduct.value) {
      const { error } = await updateProductService(editingProduct.value.product_id, productForm.value);
      if (error) throw new Error(error);
      await showToast('แก้ไขสินค้าสำเร็จ', 'success');
    } else {
      const { error } = await createProduct(productForm.value);
      if (error) throw new Error(error);
      await showToast('เพิ่มสินค้าสำเร็จ', 'success');
    }

    closeProductModal();
    loadProducts();
    loadLowStockProducts();
  } catch (err: any) {
    await showToast(err.message, 'danger');
  } finally {
    loading.value = false;
  }
}

function getStockColor(product: Product) {
  if (product.stock_quantity <= (product.min_stock || 10)) return 'danger';
  if (product.stock_quantity <= (product.min_stock || 10) * 2) return 'warning';
  return 'success';
}

function getInventoryTypeIcon(type: string) {
  switch (type) {
    case 'in': return arrowDownCircleOutline;
    case 'out': return arrowUpCircleOutline;
    case 'return': return arrowDownCircleOutline;
    default: return warningOutline;
  }
}

function getInventoryTypeColor(type: string) {
  switch (type) {
    case 'in': return 'success';
    case 'out': return 'primary';
    case 'return': return 'warning';
    default: return 'danger';
  }
}

function getInventoryTypeText(type: string) {
  switch (type) {
    case 'in': return 'รับเข้า';
    case 'out': return 'จ่ายออก';
    case 'return': return 'คืนสินค้า';
    case 'loss': return 'สูญเสีย';
    default: return type;
  }
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
    day: 'numeric',
    hour: '2-digit',
    minute: '2-digit'
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

async function handleRefresh(event: any) {
  await Promise.all([
    loadProducts(),
    loadLowStockProducts(),
    loadInventoryHistory()
  ]);
  event.target.complete();
}

onMounted(() => {
  loadProducts();
  loadLowStockProducts();
  loadInventoryHistory();
});

onIonViewWillEnter(() => {
  loadProducts();
  loadLowStockProducts();
  loadInventoryHistory();
});
</script>

<style scoped>
ion-badge {
  margin-left: 8px;
}
</style>
