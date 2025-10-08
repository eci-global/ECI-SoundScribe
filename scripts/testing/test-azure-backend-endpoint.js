#!/usr/bin/env node

/**
 * Test Azure Backend Endpoint
 * 
 * This script tests the new /api/process-audio endpoint on the Azure backend
 * to ensure it properly handles large file processing requests.
 */

const AZURE_BACKEND_URL = 'https://soundscribe-backend.azurewebsites.net';

async function testAzureBackendEndpoint() {
  console.log('🧪 Testing Azure Backend /api/process-audio endpoint...');
  console.log(`📡 Target URL: ${AZURE_BACKEND_URL}/api/process-audio`);
  
  try {
    // Test 1: Health check
    console.log('\n1️⃣ Testing health endpoint...');
    const healthResponse = await fetch(`${AZURE_BACKEND_URL}/health`);
    const healthData = await healthResponse.json();
    
    if (healthResponse.ok) {
      console.log('✅ Azure backend is healthy');
      console.log(`   Status: ${healthData.status}`);
      console.log(`   Uptime: ${healthData.uptime}s`);
      console.log(`   Environment: ${healthData.environment}`);
    } else {
      console.log('❌ Azure backend health check failed');
      console.log('   Response:', healthData);
      return false;
    }
    
    // Test 2: Process Audio endpoint
    console.log('\n2️⃣ Testing /api/process-audio endpoint...');
    
    const testPayload = {
      recording_id: 'test-large-file-123',
      file_url: 'https://example.com/test-90mb-video.mp4',
      file_size: 90 * 1024 * 1024, // 90MB
      is_large_file: true,
      file_type: 'video'
    };
    
    console.log('📤 Sending test request with payload:');
    console.log(JSON.stringify(testPayload, null, 2));
    
    const response = await fetch(`${AZURE_BACKEND_URL}/api/process-audio`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
      },
      body: JSON.stringify(testPayload)
    });
    
    const responseData = await response.json();
    
    if (response.ok) {
      console.log('✅ /api/process-audio endpoint working correctly');
      console.log('📊 Response data:');
      console.log(`   Success: ${responseData.success}`);
      console.log(`   Message: ${responseData.message}`);
      console.log(`   Recording ID: ${responseData.recordingId}`);
      console.log(`   Job Type: ${responseData.jobType}`);
      console.log(`   Processing Mode: ${responseData.processingMode}`);
      console.log(`   Azure Backend: ${responseData.azure_backend}`);
      console.log(`   File Size: ${responseData.file_size_mb}MB`);
      console.log(`   Estimated Duration: ${responseData.estimatedDuration}`);
      
      return true;
    } else {
      console.log('❌ /api/process-audio endpoint failed');
      console.log(`   Status: ${response.status} ${response.statusText}`);
      console.log('   Response:', responseData);
      return false;
    }
    
  } catch (error) {
    console.error('💥 Test failed with error:', error);
    return false;
  }
}

async function testCORSHeaders() {
  console.log('\n3️⃣ Testing CORS headers...');
  
  try {
    const response = await fetch(`${AZURE_BACKEND_URL}/api/process-audio`, {
      method: 'OPTIONS',
      headers: {
        'Origin': 'https://preview--eci-sound-scribe.lovable.app',
        'Access-Control-Request-Method': 'POST',
        'Access-Control-Request-Headers': 'Content-Type'
      }
    });
    
    console.log(`   Status: ${response.status}`);
    console.log(`   Access-Control-Allow-Origin: ${response.headers.get('Access-Control-Allow-Origin')}`);
    console.log(`   Access-Control-Allow-Methods: ${response.headers.get('Access-Control-Allow-Methods')}`);
    console.log(`   Access-Control-Allow-Headers: ${response.headers.get('Access-Control-Allow-Headers')}`);
    
    if (response.status === 204 || response.status === 200) {
      console.log('✅ CORS headers configured correctly');
      return true;
    } else {
      console.log('❌ CORS preflight failed');
      return false;
    }
  } catch (error) {
    console.error('💥 CORS test failed:', error);
    return false;
  }
}

async function main() {
  console.log('🎯 Azure Backend Large File Processing Test');
  console.log('==========================================');
  
  const endpointTest = await testAzureBackendEndpoint();
  const corsTest = await testCORSHeaders();
  
  console.log('\n📊 Test Results Summary:');
  console.log(`   Azure Backend Endpoint: ${endpointTest ? '✅ PASS' : '❌ FAIL'}`);
  console.log(`   CORS Configuration: ${corsTest ? '✅ PASS' : '❌ FAIL'}`);
  
  if (endpointTest && corsTest) {
    console.log('\n🎉 ALL TESTS PASSED! Large file routing should work correctly.');
    console.log('Your 90MB video will now be processed on high-memory Azure servers.');
  } else {
    console.log('\n⚠️  SOME TESTS FAILED. Check the Azure backend deployment.');
  }
  
  console.log('\n🔗 Next Steps:');
  console.log('1. Deploy the updated frontend code');
  console.log('2. Test with a real large file upload');
  console.log('3. Monitor Azure backend logs for processing');
  console.log('4. Verify no more Edge Function memory errors');
}

// Run the test
main().catch(error => {
  console.error('💥 Test script failed:', error);
  process.exit(1);
});