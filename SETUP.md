# NexDrop — Complete setup guide

NexDrop has **two ways** to connect your phone and PC:

| Mode | PC opens | Server | Phone |
|------|----------|--------|-------|
| **Online** | Vercel URL or anywhere | Cloud (Back4App / Railway) | Online mode + pairing code |
| **Offline** | `http://localhost:3000` on your PC only | Your PC (`npm run server`) | Offline mode + scan QR |

> **Important:** Offline mode does **not** work on `https://….vercel.app`. Browsers block it. You must run the web app locally on your PC.

---

## Prerequisites

- **Windows PC** with Node.js 18+ ([nodejs.org](https://nodejs.org))
- **Android phone** with NexDrop app installed
- Phone and PC on the **same Wi‑Fi** (for offline mode)
- **Android Studio** (only if building the app yourself)

---

## Part 1 — One-time project setup (PC)

Open PowerShell:

```powershell
cd D:\NexDrop\NexDrop

# Install server dependencies (root + server folder)
npm install
cd server
npm install
cd ..

# Install web app dependencies
cd web
npm install
cd ..
```

### Cloud server URL (for Online mode)

Create `web/.env` (copy from example):

```powershell
cd web
copy .env.example .env
```

Edit `web/.env`:

```
REACT_APP_SERVER_URL=https://nexdrop-7t5qv8sp.b4a.run
```

Use your real deployed backend URL if different.

For **Vercel**, add the same variable in Project → Settings → Environment Variables.

---

## Part 2 — Online mode (works from Vercel)

Good when phone and PC are not on the same Wi‑Fi, or you only use the hosted website.

### On PC

1. Open: `https://nex-drop-three.vercel.app` (or your Vercel URL)
2. Choose **Online Mode**
3. Wait until it says connected to server

### On Android

1. Open NexDrop → **Online Mode**
2. Tap to **generate pairing code**
3. Type that code on the PC → **Connect**

### If online fails

- Confirm `REACT_APP_SERVER_URL` in Vercel points to a **running** backend
- Confirm Android `SERVER_URL` in `mobile/app/build.gradle` matches that backend
- Rebuild and reinstall the Android app after changing `SERVER_URL`

---

## Part 3 — Offline mode (same Wi‑Fi, no internet required)

### Step 1 — Start the server on your PC

**Terminal 1** (leave open):

```powershell
cd D:\NexDrop\NexDrop
npm run server
```

You should see: `✅ NexDrop server running on port 5000`

If Windows Firewall asks, allow **Node.js** on **private networks**.

### Step 2 — Start the web app on your PC

**Terminal 2**:

```powershell
cd D:\NexDrop\NexDrop\web
npm start
```

Browser opens **http://localhost:3000** — use this URL, **not** Vercel.

### Step 3 — Get your PC’s Wi‑Fi IP (if needed)

```powershell
ipconfig
```

Under **Wi‑Fi**, note **IPv4 Address** (e.g. `192.168.1.8`).

On the Offline screen, if detection fails, paste that IP and click **Apply**.

### Step 4 — Pair on PC

1. In the browser at **localhost:3000**, choose **Offline Mode**
2. Status should become: **Local server ready — waiting for phone**
3. QR code should show: `http://192.168.x.x:5000/offline-connect` (not `vercel.app`)

### Step 5 — Pair on phone

1. Same Wi‑Fi as PC
2. NexDrop → **Offline Mode** → **Scan QR Code from PC**
3. Scan the QR on your PC screen
4. Chat should open on both devices

### Step 6 — Send a file

- PC: drag a file into the chat or use the paperclip
- Phone: attach button → pick a file

---

## Part 4 — Build Android app (optional)

1. Open `mobile/` in Android Studio
2. Edit `mobile/app/build.gradle` → `SERVER_URL` = your cloud backend for online mode
3. **Build → Build APK** or Run on device
4. Install on phone

Offline mode uses the IP from the QR scan; cloud `SERVER_URL` is only for online + default socket.

---

## Quick troubleshooting

| Problem | Fix |
|---------|-----|
| QR shows `vercel.app:5000` | You are on Vercel. Use `http://localhost:3000` instead |
| Stuck on “Starting local server” | Run `npm run server` on PC; allow firewall |
| Phone “Cannot reach PC” | Same Wi‑Fi; use PC IPv4 in QR; server must be running |
| Online pairing invalid code | Code expires in 5 min; generate a new one on phone |
| HTTPS Vercel + manual IP still fails | Expected — use localhost for offline |

---

## Quick start script (Windows)

```powershell
cd D:\NexDrop\NexDrop
.\scripts\start-offline.ps1
```

This starts the server and prints instructions for `npm start` in `web/`.

---

## Repo structure

```
NexDrop/
├── server/     → Backend (port 5000)
├── web/        → React PC app (port 3000)
├── mobile/     → Android app
└── SETUP.md    → This file
```
