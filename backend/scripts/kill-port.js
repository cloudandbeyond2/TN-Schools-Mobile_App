/**
 * kill-port.js — Frees port 5000 before nodemon starts.
 * Runs automatically as "predev" in package.json.
 */
const { execSync } = require('child_process');
const PORT = 5000;

try {
  // Get the PID listening on PORT using PowerShell
  const raw = execSync(
    `powershell -NoProfile -Command "(Get-NetTCPConnection -LocalPort ${PORT} -State Listen -ErrorAction SilentlyContinue).OwningProcess"`,
    { encoding: 'utf8', stdio: 'pipe' }
  ).trim();

  if (raw) {
    const pids = [...new Set(raw.split(/\r?\n/).map(p => p.trim()).filter(Boolean))];
    pids.forEach(pid => {
      try {
        execSync(`taskkill /PID ${pid} /F`, { stdio: 'pipe' });
        console.log(`✅  Freed port ${PORT} (killed PID ${pid})`);
      } catch {
        // already gone
      }
    });
  } else {
    console.log(`✅  Port ${PORT} is already free.`);
  }
} catch (e) {
  // Non-fatal — let nodemon proceed anyway
  console.log(`ℹ️  Port check skipped: ${e.message}`);
}
