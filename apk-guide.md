# FitTrack APK Generation & Testing Guide

This guide explains how to run your FitTrack app on a mobile device and compile it into a signed Android APK.

---

## 1. Testing the App on your Phone (Local Network)

Before compiling, you can run the app directly on your phone to test it in the gym:

1. **Find your computer's IP address**:
   - Open PowerShell and run `ipconfig`.
   - Look for the IPv4 Address under your active network adapter (e.g., `192.168.1.150`).
2. **Access from your phone**:
   - Make sure your phone and computer are connected to the same Wi-Fi network.
   - Open Chrome or Safari on your phone and navigate to `http://<your-computer-ip>:8000` (e.g., `http://192.168.1.150:8000`).
3. **Install as PWA**:
   - **On Android (Chrome)**: Tap the three dots menu button and select **"Add to Home Screen"** or **"Install App"**.
   - **On iOS (Safari)**: Tap the **Share** button (arrow up) and select **"Add to Home Screen"**.
   - The app will now have a launcher icon on your phone and run in full-screen standalone mode, completely offline!

---

## 2. Compiling into a signed Android APK (.apk)

To wrap the web app as a native Android package, we use **PWA Builder**, which is a free tool provided by Microsoft to package progressive web apps into store-ready formats.

### Step 1: Push or Publish your App
PWA Builder needs a public URL. You can host your app for free using:
- **GitHub Pages** (e.g., `https://username.github.io/fitnesstracker`)
- **Vercel** (deploy the directory with 1 click: `vercel`)
- **Netlify** (drag-and-drop the `fitnesstracker` folder to deploy in seconds)

### Step 2: Generate the APK on PWA Builder
1. Go to [pwabuilder.com](https://www.pwabuilder.com).
2. Enter the public URL of your published FitTrack PWA (e.g., `https://my-fittrack.vercel.app`) and click **Start**.
3. PWA Builder will inspect your `manifest.json` and confirm it is ready for packaging.
4. Click **Build My App** and select **Google Play (Android)**.
5. In the settings modal, configure:
   - **Package ID**: `com.fittrack.app`
   - **App Name**: `FitTrack`
   - **Launcher Title**: `FitTrack`
6. Click **Generate**. Once finished, download the generated zip file.

### Step 3: Extract and Install
1. Open the downloaded zip file.
2. Inside, find the file named `app-release-signed.apk` (or similar `.apk` file).
3. Copy this `.apk` file to your Android phone (via USB cable, Google Drive, or email).
4. On your phone, tap the `.apk` file to install it.
   - *Note: You may need to enable "Allow installation from unknown sources" in your Android settings.*

Your FitTrack app is now running as a native Android application!
