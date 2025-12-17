# 📱 Build Android APK Guide

## วิธี Build APK แบบง่าย (ใช้สคริปต์)

```bash
chmod +x build-android.sh
./build-android.sh
```

## วิธี Build APK แบบ Manual

### ขั้นตอนที่ 1: Build Web Assets

```bash
npm run build
```

### ขั้นตอนที่ 2: เพิ่ม Android Platform (ครั้งแรก)

```bash
# ถ้ายังไม่มี folder android
ionic capacitor add android

# ถ้ามีแล้ว ข้ามไป Step 3
```

### ขั้นตอนที่ 3: Sync ไฟล์ไปยัง Android

```bash
ionic capacitor sync android
```

### ขั้นตอนที่ 4: เปิด Android Studio

```bash
ionic capacitor open android
```

### ขั้นตอนที่ 5: Build APK ใน Android Studio

1. รอให้ **Gradle Sync** เสร็จ (ประมาณ 2-5 นาที)
2. ไปที่เมนู **Build** → **Build Bundle(s) / APK(s)** → **Build APK(s)**
3. รอให้ build เสร็จ (จะมี notification ขวาล่าง)
4. คลิก **locate** เพื่อเปิดโฟลเดอร์ APK

### ที่อยู่ไฟล์ APK:

```
android/app/build/outputs/apk/debug/app-debug.apk
```

---

## 🔧 Build APK แบบ Release (สำหรับเผยแพร่)

### 1. สร้าง Keystore (ครั้งแรก)

```bash
keytool -genkey -v -keystore my-release-key.jks -keyalg RSA -keysize 2048 -validity 10000 -alias my-key-alias
```

จดจำ:

- Password ของ keystore
- Password ของ key alias

### 2. สร้างไฟล์ key.properties

สร้างไฟล์ `android/key.properties`:

```properties
storePassword=your_keystore_password
keyPassword=your_key_password
keyAlias=my-key-alias
storeFile=../my-release-key.jks
```

### 3. แก้ไข android/app/build.gradle

เพิ่มก่อน `android {`:

```gradle
def keystoreProperties = new Properties()
def keystorePropertiesFile = rootProject.file('key.properties')
if (keystorePropertiesFile.exists()) {
    keystoreProperties.load(new FileInputStream(keystorePropertiesFile))
}
```

เพิ่มใน `android { ... }`:

```gradle
signingConfigs {
    release {
        keyAlias keystoreProperties['keyAlias']
        keyPassword keystoreProperties['keyPassword']
        storeFile keystoreProperties['storeFile'] ? file(keystoreProperties['storeFile']) : null
        storePassword keystoreProperties['storePassword']
    }
}

buildTypes {
    release {
        signingConfig signingConfigs.release
        minifyEnabled false
        proguardFiles getDefaultProguardFile('proguard-android.txt'), 'proguard-rules.pro'
    }
}
```

### 4. Build Release APK

```bash
cd android
./gradlew assembleRelease

# APK จะอยู่ที่:
# android/app/build/outputs/apk/release/app-release.apk
```

---

## ⚡ Build AAB (App Bundle) สำหรับ Play Store

```bash
cd android
./gradlew bundleRelease

# AAB จะอยู่ที่:
# android/app/build/outputs/bundle/release/app-release.aab
```

---

## 🛠️ Troubleshooting

### ❌ "Android SDK not found"

**แก้ไข:**

1. ติดตั้ง [Android Studio](https://developer.android.com/studio)
2. เปิด Android Studio → Tools → SDK Manager
3. ติดตั้ง Android SDK (API 33 ขึ้นไป)

### ❌ "Gradle sync failed"

**แก้ไข:**

```bash
cd android
./gradlew clean
./gradlew build
```

### ❌ "Command not found: ionic"

**แก้ไข:**

```bash
npm install -g @ionic/cli
```

### ❌ APK ติดตั้งไม่ได้บนมือถือ

**แก้ไข:**

- ไปที่ Settings → Security → เปิด "Install from Unknown Sources"
- หรือ build เป็น Release APK แทน Debug

---

## 📊 ข้อมูลเพิ่มเติม

### ขนาดไฟล์ APK โดยประมาณ:

- **Debug APK:** 30-50 MB
- **Release APK:** 15-25 MB (minified)
- **AAB (App Bundle):** 10-20 MB

### Requirements:

- ✅ Android Studio (latest)
- ✅ Java JDK 11 or 17
- ✅ Android SDK 33+
- ✅ Node.js 18+
- ✅ Ionic CLI

### Test บน Emulator:

```bash
# รัน emulator
ionic capacitor run android

# หรือ
ionic capacitor run android -l --external
# -l = live reload
# --external = ใช้ได้ทั้ง WiFi
```

---

## 🚀 Quick Commands

```bash
# Build Debug APK
npm run build && ionic cap sync android && ionic cap open android

# Update เฉพาะโค้ด (หลังแก้ไขแอพ)
npm run build && ionic cap copy android

# ดู logs
ionic capacitor run android -l --consolelogs

# Clean build
cd android && ./gradlew clean && cd ..
```

---

## ✅ Checklist ก่อน Build

- [ ] ตรวจสอบ `capacitor.config.ts` (appId, appName)
- [ ] ตั้งค่า icons และ splash screen
- [ ] ทดสอบบน emulator ก่อน
- [ ] ตรวจสอบ permissions ใน AndroidManifest.xml
- [ ] ทดสอบบนมือถือจริง
- [ ] เตรียม keystore สำหรับ release

---

Happy Building! 🎉
