/** Node verification of offline URL logic (mirrors network.js) */
function isPrivateIP(ip) {
  if (!ip || typeof ip !== "string") return false;
  const parts = ip.split(".").map(Number);
  if (parts.length !== 4 || parts.some((n) => Number.isNaN(n))) return false;
  if (parts[0] === 10) return true;
  if (parts[0] === 172 && parts[1] >= 16 && parts[1] <= 31) return true;
  if (parts[0] === 192 && parts[1] === 168) return true;
  if (parts[0] === 169 && parts[1] === 254) return true;
  return false;
}

function isHostedDeploy(hostname) {
  if (!hostname) return false;
  const h = hostname.toLowerCase();
  return (
    h.endsWith(".vercel.app") ||
    h.endsWith(".netlify.app") ||
    h.endsWith(".github.io") ||
    h.includes("vercel") ||
    (!["localhost", "127.0.0.1"].includes(h) && !isPrivateIP(h) && h.includes("."))
  );
}

function buildOfflineUrl(ip, hostname) {
  if (isHostedDeploy(hostname) && !isPrivateIP(ip)) return null;
  if (!ip || !isPrivateIP(ip)) return null;
  return `http://${ip}:5000/offline-connect`;
}

const cases = [
  { ip: null, host: "nex-drop-three.vercel.app", expect: null },
  { ip: "nex-drop-three.vercel.app", host: "nex-drop-three.vercel.app", expect: null },
  { ip: "192.168.1.8", host: "localhost", expect: "http://192.168.1.8:5000/offline-connect" },
  { ip: "192.168.1.8", host: "nex-drop-three.vercel.app", expect: "http://192.168.1.8:5000/offline-connect" },
];

let ok = true;
for (const c of cases) {
  const got = buildOfflineUrl(c.ip, c.host);
  const pass = got === c.expect;
  if (!pass) ok = false;
  console.log(pass ? "PASS" : "FAIL", c, "=>", got);
}

process.exit(ok ? 0 : 1);
