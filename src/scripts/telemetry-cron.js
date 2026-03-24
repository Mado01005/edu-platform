const { fetch } = require('node-fetch');
const cron = require('node-cron');
const VERCEL_URL = 'https://<your-project-name>.vercel.app';
const heartbeatUrl = `${VERCEL_URL}/api/analytics/heartbeat`;
const dummyData = { currentPage: 'dashboard', isIdle: false };
cron.schedule('*/5 * * * *', () => {
  fetch(heartbeatUrl, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify(dummyData)
  });
});