#!/bin/bash

echo "🚀 Build Android APK for Water Delivery App"
echo "=============================================="
echo ""

# Step 1: Build the web assets
echo "📦 Step 1: Building web assets..."
npm run build

if [ $? -ne 0 ]; then
    echo "❌ Build failed!"
    exit 1
fi

echo "✅ Web build complete!"
echo ""

# Step 2: Add Android platform (if not exists)
echo "📱 Step 2: Adding Android platform..."
if [ ! -d "android" ]; then
    ionic capacitor add android
else
    echo "✅ Android platform already exists"
fi

echo ""

# Step 3: Sync files to Android
echo "🔄 Step 3: Syncing files to Android..."
ionic capacitor sync android

echo ""

# Step 4: Copy assets
echo "📋 Step 4: Copying assets..."
ionic capacitor copy android

echo ""

# Step 5: Open in Android Studio
echo "🎨 Step 5: Opening Android Studio..."
echo ""
echo "📝 Next steps in Android Studio:"
echo "1. Wait for Gradle sync to complete"
echo "2. Build → Build Bundle(s) / APK(s) → Build APK(s)"
echo "3. APK will be at: android/app/build/outputs/apk/debug/app-debug.apk"
echo ""

ionic capacitor open android

echo ""
echo "✅ Done! Android Studio should open now."
echo "If not, run: ionic capacitor open android"
