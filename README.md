# NexDrop 🚀

Fast, simple file transfer between your PC and Android phone.  
No cables. No third-party services. Your files stay yours.

---

## How it works

```
Mobile App (Android)  ←──── WiFi / Internet ────→  PC Web App (Browser)
                                    ↑
                            NexDrop Server
                           (Node.js + Socket.IO)
```

1. Server runs on the cloud (or your local machine)
2. Mobile generates a 6-digit pairing code
3. PC enters the code → permanently paired
4. Send files, photos, videos, text — all in real time

---

## Project Structure

```
NexDrop/
├── server/      → Node.js backend (Socket.IO + Express)
├── web/         → React PC web app
└── mobile/      → Android app (Java)
```

---

## Setup — Server

```bash
cd server
npm install
node src/server.js
# Server runs on http://localhost:5000
```

For deployment → push to GitHub → connect to Render.com (free)

---

## Setup — Web App

```bash
cd web
npm install
npm start
# Opens at http://localhost:3000
```

Before deploying, update `.env`:
```
REACT_APP_SERVER_URL=https://your-server-url.com
```

---

## Setup — Android App

1. Open `mobile/` in **Android Studio**
2. In `app/build.gradle`, update `SERVER_URL`:
   ```groovy
   buildConfigField "String", "SERVER_URL", "\"https://your-server-url.com\""
   ```
3. Run on your Android device or emulator
4. For local testing, use your PC's local IP:
   ```
   http://192.168.x.x:5000
   ```
   (Find it with `ipconfig` on Windows or `ifconfig` on Mac/Linux)

---

## Tech Stack

| Part        | Technology              |
|-------------|------------------------|
| Server      | Node.js, Express, Socket.IO |
| Web App     | React                  |
| Mobile App  | Java (Android)         |
| File Upload | OkHttp (Android), Axios (Web) |
| Real-time   | Socket.IO (WebSocket)  |
| QR Code     | ZXing (Android)        |

---

## Features — v1.0

- ✅ Persistent pairing — connect once, always connected
- ✅ Send files from phone to PC
- ✅ Send files from PC to phone  
- ✅ Text messages between devices
- ✅ Real-time file transfer progress
- ✅ Transfer history
- ✅ QR code pairing
- ✅ Works over WiFi and internet

---

Built with ❤️ by the NexDrop team
