# NexDrop

NexDrop is a file transfer app for sending files, photos, videos, and text between a PC browser and an Android phone.

It has two connection modes:

- Offline Mode: Zapya-style local WiFi transfer. No internet is required after the app is set up.
- Online Mode: Uses a deployed server URL so the phone and PC can connect over the internet.

The project has three parts:

```text
NexDrop/
|-- server/   Node.js + Express + Socket.IO server
|-- web/      React web app for the PC
|-- mobile/   Android app written in Java
```

## How Offline Mode Works

Offline Mode is the recommended mode for normal PC-to-phone transfer.

```text
Android phone  <---- same WiFi network ---->  PC browser
        \                                      /
         \                                    /
          ---- PC local NexDrop server -------
```

1. You start the NexDrop server on your PC.
2. You open the NexDrop web app on your PC.
3. You choose Offline Mode.
4. The PC shows a QR code.
5. The phone scans the QR code.
6. The phone automatically connects to the PC local server.
7. You can send files and text between phone and PC.

No cloud server is needed for Offline Mode. Your phone and PC must be on the same WiFi network.

## Requirements

Install these first.

### Required For PC

1. Node.js LTS
   - Download: https://nodejs.org/
   - Install the LTS version.
   - During install, keep the default options.

2. Git
   - Download: https://git-scm.com/downloads
   - Install with default options.

3. A browser
   - Chrome, Edge, or Firefox.

### Required For Android App

1. Android Studio
   - Download: https://developer.android.com/studio
   - Install Android Studio.
   - Open Android Studio once and let it install the Android SDK.

2. Android phone
   - Android 7.0 or newer is recommended.
   - Camera permission is needed for QR scanning.

3. USB cable, or Android Studio wireless debugging.

## Download The Project

Open PowerShell or Command Prompt and run:

```bash
cd D:\CODING\Nexdrop
git clone https://github.com/SyedAbd110786/NexDrop.git GitHub
cd GitHub
```

If you already have the project, go to the project folder:

```bash
cd D:\CODING\Nexdrop\GitHub
```

## First Time Setup

You need to install dependencies for the server and web app.

### 1. Install Server Dependencies

Open a terminal in the project root:

```bash
cd D:\CODING\Nexdrop\GitHub\server
npm install
```

### 2. Install Web Dependencies

Open another terminal:
## Full setup guide

See **[SETUP.md](SETUP.md)** for step-by-step instructions (online + offline, Vercel, Android, troubleshooting).

**Offline mode:** run `npm run server` and open `http://localhost:3000` — **not** the Vercel HTTPS URL.

---

## Setup — Server

```bash
cd D:\CODING\Nexdrop\GitHub\web
npm install
```

If PowerShell blocks `npm`, use:

```bash
npm.cmd install
```

## Run Offline Mode

Use this when the phone and PC are on the same WiFi.

You need two terminals open on the PC.

### Terminal 1: Start The Local Server

```bash
cd D:\CODING\Nexdrop\GitHub\server
node src/server.js
```

You should see a message like:

```text
NexDrop server running on port 5000
```

Keep this terminal open. Do not close it while using NexDrop.

### Important: Allow Windows Firewall

The first time you start the server, Windows may show a firewall popup for Node.js.

Choose:

- Allow access
- Private networks

If you block it, your phone may not be able to reach your PC.

### Terminal 2: Start The Web App

```bash
cd D:\CODING\Nexdrop\GitHub\web
npm start
```

If PowerShell blocks `npm`, use:

```bash
npm.cmd start
```

The web app usually opens at:

```text
http://localhost:3000
```

Keep this terminal open too.

## Find Your PC WiFi IP Address

Offline Mode works best when the web app is opened using your PC WiFi IP address.

On Windows:

1. Open Command Prompt.
2. Run:

```bash
ipconfig
```

3. Look for your WiFi adapter.
4. Find `IPv4 Address`.

It usually looks like:

```text
192.168.1.5
```

or:

```text
192.168.0.12
```

Now open the web app in your browser using that IP:

```text
http://YOUR_PC_IP:3000
```

Example:

```text
http://192.168.1.5:3000
```

Do this instead of using `localhost` when pairing with your phone.

## Build And Install The Android App

### Option A: Use Android Studio

1. Open Android Studio.
2. Click Open.
3. Select:

```text
D:\CODING\Nexdrop\GitHub\mobile
```

4. Wait for Gradle sync to finish.
5. Connect your Android phone with USB.
6. On the phone, enable Developer Options.
7. Enable USB Debugging.
8. In Android Studio, choose your phone from the device list.
9. Click Run.

### Option B: Build APK From Terminal

Open a terminal:

```bash
cd D:\CODING\Nexdrop\GitHub\mobile
.\gradlew.bat :app:assembleDebug
```

The APK will be created here:

```text
D:\CODING\Nexdrop\GitHub\mobile\app\build\outputs\apk\debug\app-debug.apk
```

Install that APK on your phone.

If Android blocks the install, allow installation from unknown sources for your file manager or browser.

## Use Zapya-Style Offline Mode

Make sure:

- PC and phone are connected to the same WiFi.
- The server is running on port 5000.
- The web app is running on port 3000.
- Windows Firewall allows Node.js on Private networks.

Then:

1. On PC, open the web app using your PC IP:

```text
http://YOUR_PC_IP:3000
```

Example:

```text
http://192.168.1.5:3000
```

2. Click Offline Mode.
3. A QR code appears on the PC.
4. Open NexDrop on your Android phone.
5. Tap Offline Mode.
6. Tap Scan QR Code from PC.
7. Allow camera permission.
8. Scan the QR code on the PC screen.
9. The phone should automatically connect and open the chat/transfer screen.
10. Send files or text from either device.

## Send Files From PC To Phone

1. Pair using Offline Mode.
2. On the PC web app, click the attachment button.
3. Select one or more files.
4. Wait for the upload to complete.
5. On Android, tap the received file message to download it.

Downloaded files are saved through Android Download Manager, usually in the Downloads folder.

## Send Files From Phone To PC

1. Pair using Offline Mode.
2. On Android, tap the attach button.
3. Select a file.
4. Wait for upload to finish.
5. On PC, click the received file message to download it.

## Online Mode Setup

Use Online Mode only if you have a deployed NexDrop server.

### 1. Deploy Server

Deploy the `server/` folder to a Node.js hosting provider such as Railway, Render, or another platform.

The server must expose port from:

```js
process.env.PORT
```

The project already supports this.

### 2. Set Web Server URL

Edit:

```text
web/.env
```

Set:

```env
REACT_APP_SERVER_URL=https://your-server-url.com
```

Then restart the web app:

```bash
cd D:\CODING\Nexdrop\GitHub\web
npm start
```

### 3. Set Android Server URL

Edit:

```text
mobile/app/build.gradle
```

Find:

```groovy
buildConfigField "String", "SERVER_URL", "\"https://your-server-url.com\""
```

Set it to your deployed server URL.

Then rebuild the Android app.

## Troubleshooting

### QR Code Shows localhost

Problem:

The phone cannot connect to `localhost` because `localhost` on the phone means the phone itself, not the PC.

Fix:

Open the web app using your PC IP:

```text
http://YOUR_PC_IP:3000
```

Example:

```text
http://192.168.1.5:3000
```

### Phone Cannot Reach PC

Check these:

1. Phone and PC are on the same WiFi.
2. PC is not using a guest WiFi network.
3. Windows Firewall allows Node.js.
4. Server terminal is still running.
5. Web terminal is still running.
6. You opened the web app with PC IP, not `localhost`.

Test from your phone browser:

```text
http://YOUR_PC_IP:5000/offline-connect
```

Example:

```text
http://192.168.1.5:5000/offline-connect
```

If it works, you should see JSON text saying NexDrop local server.

If it does not open, the phone cannot reach the PC server.

### Windows Firewall Was Blocked By Mistake

1. Open Windows Security.
2. Go to Firewall and network protection.
3. Click Allow an app through firewall.
4. Find Node.js.
5. Allow it on Private networks.
6. Restart the server:

```bash
cd D:\CODING\Nexdrop\GitHub\server
node src/server.js
```

### Port 5000 Already In Use

If the server cannot start because port 5000 is busy, close the other app using port 5000.

On Windows, find the process:

```bash
netstat -ano | findstr :5000
```

Then stop that process from Task Manager.

### Port 3000 Already In Use

React may ask:

```text
Would you like to run the app on another port instead?
```

Type:

```text
y
```

If it runs on another port, open that port with your PC IP.

Example:

```text
http://192.168.1.5:3001
```

### Android Build Fails In Terminal

Try Android Studio first.

If using terminal, run:

```bash
cd D:\CODING\Nexdrop\GitHub\mobile
.\gradlew.bat :app:assembleDebug
```

If Gradle downloads slowly, wait. The first build can take several minutes.

### npm Is Blocked In PowerShell

Use `npm.cmd` instead:

```bash
npm.cmd install
npm.cmd start
```

### Files Upload But Download Fails

Make sure both devices are still connected to the same server.

In Offline Mode:

- PC uploads to `http://YOUR_PC_IP:5000`
- Android uploads to `http://YOUR_PC_IP:5000`

If one side uses the online server and the other side uses the local server, downloads will fail.

## Development Commands

### Server

```bash
cd D:\CODING\Nexdrop\GitHub\server
npm install
node src/server.js
```

### Web

```bash
cd D:\CODING\Nexdrop\GitHub\web
npm install
npm start
```

Build web app:

```bash
cd D:\CODING\Nexdrop\GitHub\web
npm.cmd run build
```

### Android

```bash
cd D:\CODING\Nexdrop\GitHub\mobile
.\gradlew.bat :app:assembleDebug
```

## Tech Stack

| Part | Technology |
| --- | --- |
| Server | Node.js, Express, Socket.IO |
| Web App | React |
| Android App | Java, AndroidX |
| File Upload | Axios on web, OkHttp on Android |
| Real-time | Socket.IO WebSocket |
| QR Code | QRCode on server, ZXing on Android |

## Notes

- Offline Mode does not require internet, but both devices must be on the same local network.
- Online Mode requires a deployed server URL.
- Uploaded files are stored temporarily on the server in `server/uploads`.
- Do not close the server terminal while transferring files.
- Do not close the web terminal while using the PC web app.
