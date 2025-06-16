const { exec } = require('child_process');
const os = require('os');

const port = process.argv[2] || 3005;

if (os.platform() === 'win32') {
  // Windows: Find and kill process using the port
  exec(`netstat -ano | findstr :${port}`, (err, stdout) => {
    if (!err && stdout) {
      const lines = stdout.trim().split('\n');
      const pids = new Set();
      
      lines.forEach(line => {
        const parts = line.trim().split(/\s+/);
        const pid = parts[parts.length - 1];
        if (pid && !isNaN(pid)) {
          pids.add(pid);
        }
      });
      
      pids.forEach(pid => {
        exec(`taskkill /PID ${pid} /F`, (killErr) => {
          if (!killErr) {
            console.log(`Killed process ${pid} on port ${port}`);
          }
        });
      });
    }
    process.exit(0);
  });
} else {
  // Unix/Linux/Mac: Use fuser
  exec(`fuser -k ${port}/tcp 2>/dev/null || true`, () => {
    process.exit(0);
  });
}