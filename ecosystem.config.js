module.exports = {
  apps: [
    {
      name: 'gather-api',
      cwd: './apps/api',
      script: 'npm',
      args: 'start',
      env: {
        NODE_ENV: 'production',
      },
      // Puppeteer spawns Chrome child processes — pm2 must not interpret them as crashes
      kill_timeout: 10000,
      wait_ready: false,
    },
    {
      name: 'gather-web',
      cwd: './apps/web',
      script: 'npm',
      args: 'start -- -p 3001',
      env: {
        NODE_ENV: 'production',
        API_URL: 'http://localhost:3000',
      },
    },
  ],
};
