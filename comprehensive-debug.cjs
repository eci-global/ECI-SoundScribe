const fetch = require("node-fetch");

const supabaseUrl = "https://qinkldgvejheppheykfl.supabase.co";

console.log("🧪 COMPREHENSIVE UPLOAD/PROCESS DEBUGGING");
console.log("=========================================");

async function debugUploadProcess() {
  console.log("\\n🔍 Step 1: Testing process-recording function directly...");
  
  // Test the function without auth first (like the working test-azure-basic.js)
  const testCases = [
    {
      name: "Empty body (no auth)",
      body: {},
      useAuth: false
    },
    {
      name: "Invalid UUID (no auth)",
      body: { recording_id: "invalid-uuid" },
      useAuth: false
    },
    {
      name: "Valid UUID format but non-existent (no auth)",
      body: { recording_id: "123e4567-e89b-12d3-a456-426614174000" },
      useAuth: false
    }
  ];
  
  for (const testCase of testCases) {
    console.log(`\\n🧪 Testing: ${testCase.name}`);
    
    try {
      const headers = {
        "Content-Type": "application/json"
      };
      
      const response = await fetch(`${supabaseUrl}/functions/v1/process-recording`, {
        method: "POST",
        headers,
        body: JSON.stringify(testCase.body)
      });
      
      const status = response.status;
      const responseText = await response.text();
      
      console.log(`   📊 Status: ${status}`);
      console.log(`   📄 Response: ${responseText.substring(0, 150)}${responseText.length > 150 ? "..." : ""}`);
      
      if (status === 500) {
        console.error("   🚨 FOUND 500 ERROR!");
        
        // Analyze the error
        if (responseText.includes("TypeError") || responseText.includes("ReferenceError")) {
          console.error("   🐛 JavaScript runtime error detected");
        }
        if (responseText.includes("database") || responseText.includes("Supabase")) {
          console.error("   🗄️  Database-related error detected");
        }
        if (responseText.includes("Azure") || responseText.includes("OpenAI")) {
          console.error("   🤖 AI service error detected");
        }
        if (responseText.includes("file") || responseText.includes("download")) {
          console.error("   📁 File processing error detected");
        }
      }
    } catch (error) {
      console.error(`   ❌ Network Error: ${error.message}`);
    }
  }
  
  console.log("\\n🔍 Step 2: Testing Azure OpenAI connection...");
  await testAzureConnection();
  
  console.log("\\n🔍 Step 3: Checking if we can simulate the upload scenario...");
  await simulateUploadScenario();
}

async function testAzureConnection() {
  try {
    const response = await fetch(`${supabaseUrl}/functions/v1/test-azure-openai`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({})
    });
    
    if (response.ok) {
      const result = await response.json();
      console.log("   ✅ Azure OpenAI connection: WORKING");
      console.log(`   📍 Chat Region: ${result.results?.chatRegion}`);
      console.log(`   📍 Whisper Region: ${result.results?.whisperRegion}`);
    } else {
      console.error("   ❌ Azure OpenAI connection: FAILED");
      const errorText = await response.text();
      console.error(`   Error: ${errorText}`);
    }
  } catch (error) {
    console.error(`   ❌ Azure OpenAI test error: ${error.message}`);
  }
}

async function simulateUploadScenario() {
  console.log("\\n🎯 SIMULATING UPLOAD SCENARIO");
  console.log("------------------------------");
  
  // This simulates what happens when useFileOperations.ts calls process-recording
  console.log("📤 Simulating file upload completion -> process-recording call...");
  
  // Test with a scenario that might occur during actual upload
  const uploadScenarios = [
    {
      name: "Fresh upload with new recording ID",
      recordingId: "12345678-1234-5678-9abc-123456789012" // Valid UUID format
    },
    {
      name: "Upload with malformed data",
      recordingId: null
    },
    {
      name: "Upload with empty string",
      recordingId: ""
    }
  ];
  
  for (const scenario of uploadScenarios) {
    console.log(`\\n🔬 Scenario: ${scenario.name}`);
    
    try {
      const response = await fetch(`${supabaseUrl}/functions/v1/process-recording`, {
        method: "POST",
        headers: {
          "Content-Type": "application/json"
        },
        body: JSON.stringify({ recording_id: scenario.recordingId })
      });
      
      const status = response.status;
      const responseText = await response.text();
      
      console.log(`   📊 Status: ${status}`);
      console.log(`   📄 Response: ${responseText.substring(0, 100)}${responseText.length > 100 ? "..." : ""}`);
      
      // Check for specific patterns that might indicate the source of 500 errors
      if (status === 500) {
        console.error("   🚨 500 ERROR FOUND!");
        console.error("   💡 This is likely the same error you see during upload");
        
        // Try to identify the error type
        const lowerResponse = responseText.toLowerCase();
        if (lowerResponse.includes("cannot read property") || lowerResponse.includes("undefined")) {
          console.error("   🔍 Likely cause: Accessing undefined object property");
        }
        if (lowerResponse.includes("supabase") && lowerResponse.includes("client")) {
          console.error("   🔍 Likely cause: Supabase client configuration issue");
        }
        if (lowerResponse.includes("azure")) {
          console.error("   🔍 Likely cause: Azure OpenAI configuration issue");
        }
      }
    } catch (error) {
      console.error(`   ❌ Error: ${error.message}`);
    }
  }
  
  console.log("\\n📋 DEBUGGING SUMMARY");
  console.log("====================");
  console.log("✅ If you see 400/404 errors above: Function validation is working correctly");
  console.log("🚨 If you see 500 errors above: This is the source of your upload problem");
  console.log("💡 Next steps: Check Supabase Edge Function logs for detailed error traces");
  console.log("🔧 Go to: https://supabase.com/dashboard -> Your Project -> Edge Functions -> process-recording -> Logs");
}

debugUploadProcess().catch(console.error);
