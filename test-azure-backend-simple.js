#!/usr/bin/env node

/**
 * Simple Azure Backend Test
 * Tests if the Azure backend is responding correctly
 */

function formatFeatures(features) {
  if (!features) {
    return 'N/A';
  }
  if (Array.isArray(features)) {
    return features.join(', ');
  }
  if (typeof features === 'object') {
    const entries = Object.entries(features)
      .map(([key, value]) => {
        if (value === true) return `${key}:on`;
        if (value === false) return `${key}:off`;
        return `${key}:${value}`;
      });
    return entries.join(', ') || 'N/A';
  }
  return String(features);
}

const AZURE_BACKEND_URL = 'https://soundscribe-backend.azurewebsites.net';

async function testAzureBackend() {
  console.log('🧪 Testing Azure Backend Status...');
  console.log(`📡 Target URL: ${AZURE_BACKEND_URL}`);
  
  try {
    // Test 1: Health check
    console.log('\n1️⃣ Testing health endpoint...');
    const healthResponse = await fetch(`${AZURE_BACKEND_URL}/health`);
    
    if (healthResponse.ok) {
      const healthData = await healthResponse.json();
      console.log('✅ Azure backend is healthy');
      console.log(`   Status: ${healthData.status}`);
      console.log(`   Port: ${healthData.port}`);
      console.log(`   Uptime: ${healthData.uptime}s`);
      console.log(`   Version: ${healthData.version}`);
      console.log(`   Features: ${formatFeatures(healthData.features)}`);
    } else {
      console.log('❌ Azure backend health check failed');
      console.log(`   Status: ${healthResponse.status} ${healthResponse.statusText}`);
      const errorText = await healthResponse.text();
      console.log(`   Response: ${errorText}`);
      return false;
    }
    
    // Test 2: Root endpoint
    console.log('\n2️⃣ Testing root endpoint...');
    const rootResponse = await fetch(`${AZURE_BACKEND_URL}/`);
    
    if (rootResponse.ok) {
      const rootData = await rootResponse.json();
      console.log('✅ Root endpoint working');
      console.log(`   Message: ${rootData.message}`);
      console.log(`   Features: ${formatFeatures(rootData.features)}`);
    } else {
      console.log('❌ Root endpoint failed');
      console.log(`   Status: ${rootResponse.status} ${rootResponse.statusText}`);
    }
    
    // Test 3: Process Audio endpoint
    console.log('\n3️⃣ Testing /api/process-audio endpoint...');
    
    const testPayload = {
      recording_id: 'test-simple-123',
      file_url: 'https://example.com/test.mp3',
      file_size: 1024 * 1024, // 1MB
      file_type: 'audio'
    };
    
    const processResponse = await fetch(`${AZURE_BACKEND_URL}/api/process-audio`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
      },
      body: JSON.stringify(testPayload)
    });
    
    if (processResponse.ok) {
      const processData = await processResponse.json();
      console.log('✅ Process-audio endpoint working');
      console.log(`   Success: ${processData.success}`);
      console.log(`   Message: ${processData.message}`);
      console.log(`   Recording ID: ${processData.recordingId}`);
      console.log(`   Status: ${processData.status}`);
    } else {
      console.log('❌ Process-audio endpoint failed');
      console.log(`   Status: ${processResponse.status} ${processResponse.statusText}`);
      const errorText = await processResponse.text();
      console.log(`   Response: ${errorText}`);
      return false;
    }
    
    console.log('\n🎉 ALL TESTS PASSED! Azure backend is working correctly.');
    return true;
    
  } catch (error) {
    console.error('💥 Test failed with error:', error.message);
    console.error('   This usually means the Azure backend is not responding at all.');
    console.error('   Check if the app is running and accessible.');
    return false;
  }
}

// Run the test
testAzureBackend().then(success => {
  if (success) {
    console.log('\n✅ Azure backend is ready for large file processing!');
    process.exit(0);
  } else {
    console.log('\n❌ Azure backend has issues that need to be fixed.');
    process.exit(1);
  }
}).catch(error => {
  console.error('💥 Test script failed:', error);
  process.exit(1);
});

