const express = require('express');
const cors = require('cors');

const app = express();
const PORT = process.env.PORT || 3001;

console.log('🚀 Minimal test server starting...');
console.log('📊 Environment variables:');
console.log('- PORT:', process.env.PORT);
console.log('- NODE_ENV:', process.env.NODE_ENV);
console.log('- AZURE_OPENAI_ENDPOINT:', process.env.AZURE_OPENAI_ENDPOINT ? 'SET' : 'NOT SET');
console.log('- AZURE_OPENAI_TRANSCRIBE_ENDPOINT:', process.env.AZURE_OPENAI_TRANSCRIBE_ENDPOINT ? 'SET' : 'NOT SET');

app.use(cors());
app.use(express.json());

app.get('/health', (req, res) => {
  res.json({
    status: 'healthy',
    timestamp: new Date().toISOString(),
    port: PORT,
    environment: process.env.NODE_ENV || 'development',
    message: 'Minimal test server is running'
  });
});

app.get('/', (req, res) => {
  res.json({
    message: 'Azure Backend Test Server',
    status: 'running',
    timestamp: new Date().toISOString()
  });
});

app.listen(PORT, () => {
  console.log(`✅ Minimal test server started on port ${PORT}`);
  console.log(`🔗 Health check: http://localhost:${PORT}/health`);
});

module.exports = app;