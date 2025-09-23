// Ultra-minimal server for Azure App Service debugging
console.log('🚀 Ultra-minimal server starting...');
console.log('📊 Node version:', process.version);
console.log('📊 Platform:', process.platform);
console.log('📊 PORT env:', process.env.PORT);

const express = require('express');
const app = express();
const PORT = process.env.PORT || 3001;

console.log('📊 Attempting to create Express app...');

app.get('/', (req, res) => {
  console.log('📥 Root request received');
  res.json({ 
    message: 'Ultra-minimal Azure backend', 
    timestamp: new Date().toISOString(),
    port: PORT
  });
});

app.get('/health', (req, res) => {
  console.log('📥 Health check request received');
  res.json({ 
    status: 'healthy',
    timestamp: new Date().toISOString(),
    port: PORT,
    uptime: process.uptime()
  });
});

console.log('📊 Attempting to listen on port:', PORT);

app.listen(PORT, (err) => {
  if (err) {
    console.error('❌ Failed to start server:', err);
    process.exit(1);
  }
  console.log(`✅ Ultra-minimal server running on port ${PORT}`);
  console.log(`🔗 URL: http://localhost:${PORT}`);
});

// Error handling
process.on('uncaughtException', (err) => {
  console.error('💥 Uncaught Exception:', err);
  process.exit(1);
});

process.on('unhandledRejection', (reason, promise) => {
  console.error('💥 Unhandled Rejection at:', promise, 'reason:', reason);
  process.exit(1);
});

console.log('✅ Server script completed setup');