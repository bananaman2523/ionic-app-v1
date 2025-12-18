<template>
  <ion-page>
    <ion-tabs>
      <ion-router-outlet></ion-router-outlet>
      <ion-tab-bar slot="bottom">
        <ion-tab-button tab="order" href="/tabs/order">
          <ion-icon aria-hidden="true" :icon="cartOutline" />
          <ion-label>ออเดอร์</ion-label>
        </ion-tab-button>

        <ion-tab-button tab="stock" href="/tabs/stock">
          <ion-icon aria-hidden="true" :icon="cubeOutline" />
          <ion-label>คลังสินค้า</ion-label>
        </ion-tab-button>

        <ion-tab-button tab="daily_summary" href="/tabs/daily_summary">
          <ion-icon aria-hidden="true" :icon="statsChartOutline" />
          <ion-label>สรุปรายวัน</ion-label>
        </ion-tab-button>

        <ion-tab-button tab="tab3" href="/tabs/tab3">
          <ion-icon aria-hidden="true" :icon="peopleOutline" />
          <ion-label>ลูกค้า</ion-label>
        </ion-tab-button>
      </ion-tab-bar>
    </ion-tabs>
  </ion-page>
</template>

<script setup lang="ts">
import { IonTabBar, IonTabButton, IonTabs, IonLabel, IonIcon, IonPage, IonRouterOutlet } from '@ionic/vue';
import { cartOutline, statsChartOutline, peopleOutline, cubeOutline } from 'ionicons/icons';
</script>
