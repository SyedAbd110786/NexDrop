/**
 * Simulates online pairing (PC joins) vs offline flow (phone generates, PC does NOT join).
 * Run: node server/scripts/debug-pairing-sim.js
 */
const { io } = require("socket.io-client");
const fs = require("fs");
const path = require("path");

const LOG = path.join(__dirname, "../../debug-d0cfc0.log");
const SERVER = process.env.SERVER_URL || "http://127.0.0.1:5000";

function log(hypothesisId, location, message, data) {
  const line = JSON.stringify({
    sessionId: "d0cfc0",
    hypothesisId,
    location,
    message,
    data,
    timestamp: Date.now(),
    runId: "sim-pre-fix",
  });
  fs.appendFileSync(LOG, line + "\n");
}

function connectClient(name, deviceType) {
  return new Promise((resolve, reject) => {
    const socket = io(SERVER, { transports: ["websocket"], forceNew: true });
    const timeout = setTimeout(() => reject(new Error(`${name} connect timeout`)), 8000);
    socket.on("connect", () => {
      socket.emit("device:register", { deviceName: name, deviceType });
    });
    socket.on("device:registered", (payload) => {
      clearTimeout(timeout);
      resolve({ socket, deviceId: payload.deviceId });
    });
    socket.on("connect_error", (e) => {
      clearTimeout(timeout);
      reject(e);
    });
  });
}

async function testOnlinePairing() {
  const pc = await connectClient("SimPC", "pc");
  const phone = await connectClient("SimPhone", "mobile");

  const code = await new Promise((resolve) => {
    phone.socket.on("pairing:code", ({ sessionCode }) => resolve(sessionCode));
    phone.socket.emit("pairing:generate");
  });

  log("A", "sim:online", "phone generated code", { code });

  const pcPaired = new Promise((resolve) => {
    pc.socket.on("pairing:success", (d) => resolve(d));
    pc.socket.on("pairing:error", (e) => resolve({ error: e }));
  });

  pc.socket.emit("pairing:join", { sessionCode: code });
  const result = await Promise.race([
    pcPaired,
    new Promise((r) => setTimeout(() => r({ timeout: true }), 5000)),
  ]);

  log("A", "sim:online", "PC join result", { result: !!result.pairedDevice, error: result.error, timeout: result.timeout });

  pc.socket.disconnect();
  phone.socket.disconnect();
  return !result.timeout && !!result.pairedDevice;
}

async function testOfflinePairingAutoJoin() {
  const pc = await connectClient("SimPC-Offline", "pc");
  const phone = await connectClient("SimPhone-Offline", "mobile");

  const pcPaired = new Promise((resolve) => {
    pc.socket.on("pairing:code:available", ({ sessionCode }) => {
      log("A", "sim:offline", "PC got pairing:code:available", { sessionCode, runId: "post-fix" });
      pc.socket.emit("pairing:join", { sessionCode });
    });
    pc.socket.on("pairing:success", (d) => resolve({ ok: true, d }));
    setTimeout(() => resolve({ ok: false, timeout: true }), 5000);
  });

  phone.socket.emit("pairing:generate");

  const result = await pcPaired;
  log("A", "sim:offline", "offline auto-pair result", { ...result, runId: "post-fix" });

  pc.socket.disconnect();
  phone.socket.disconnect();
  return result.ok === true;
}

async function testOfflineConnectEndpoint() {
  const res = await fetch(`${SERVER}/offline-connect`);
  const body = await res.json();
  log("E", "sim:offline-connect", "endpoint response", body);
  return body.socketUrl && body.mode === "offline" && !String(body.socketUrl).includes("undefined");
}

async function main() {
  fs.writeFileSync(LOG, "");
  log("INIT", "sim", "starting simulation", { SERVER });

  const endpointOk = await testOfflineConnectEndpoint();
  const onlineOk = await testOnlinePairing();
  const offlineAutoPair = await testOfflinePairingAutoJoin();

  log("SUMMARY", "sim", "results", { endpointOk, onlineOk, offlineAutoPair, runId: "post-fix" });
  console.log({ endpointOk, onlineOk, offlineAutoPair });
  process.exit(0);
}

main().catch((e) => {
  log("ERROR", "sim", e.message, {});
  console.error(e);
  process.exit(1);
});
