// Temporary CORS test - Test your background worker directly
// Run this with: node cors-test.js

const testRecordingId = 'test-123'; // Replace with real recording ID
const WORKER_URL = 'https://eci-soundscribe.onrender.com';

console.log('🧪 Testing CORS and background worker...');

// Test 1: Health check
fetch(`${WORKER_URL}/health`)
  .then(res => res.json())
  .then(data => {
    console.log('✅ Health check success:', data);
  })
  .catch(err => {
    console.error('❌ Health check failed:', err.message);
  });

// Test 2: Process recording (will show CORS details)
fetch(`${WORKER_URL}/api/process-recording`, {
  method: 'POST',
  headers: {
    'Content-Type': 'application/json'
  },
  body: JSON.stringify({
    recording_id: testRecordingId
  })
})
  .then(res => {
    console.log('Response headers:', res.headers);
    return res.json();
  })
  .then(data => {
    console.log('✅ Process recording response:', data);
  })
  .catch(err => {
    console.error('❌ Process recording failed:', err.message);
  });

console.log('Check the network tab in your browser for detailed CORS headers');