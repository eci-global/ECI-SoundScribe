const fetch = require("node-fetch");

const supabaseUrl = "https://qinkldgvejheppheykfl.supabase.co";

console.log("🧪 DEBUGGING UPLOAD PROCESS - PROCESS-RECORDING ERROR");
console.log("====================================================");

async function testUploadFlow() {
  console.log("\\n🔍 Step 1: Testing with a valid recording ID from database...");
  
  try {
    const listResponse = await fetch(`${supabaseUrl}/rest/v1/recordings?select=id,title&limit=1`, {
      headers: {
        "apikey": "eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6InFpbmtsZGd2ZWpoZXBwaGV5a2ZsIiwicm9sZSI6ImFub24iLCJpYXQiOjE3MzQ3MzEwMzcsImV4cCI6MjA1MDMwNzAzN30.lO4fwNdZjPqBgWZPWZDVQxLPp5VjJlGzX0VKW8Jp_qk",
        "Authorization": "Bearer eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6InFpbmtsZGd2ZWpoZXBwaGV5a2ZsIiwicm9sZSI6ImFub24iLCJpYXQiOjE3MzQ3MzEwMzcsImV4cCI6MjA1MDMwNzAzN30.lO4fwNdZjPqBgWZPWZDVQxLPp5VjJlGzX0VKW8Jp_qk"
      }
    });
    
    if (listResponse.ok) {
      const recordings = await listResponse.json();
      console.log("📁 Available recordings:", recordings.length);
      
      if (recordings.length > 0) {
        const testRecordingId = recordings[0].id;
        console.log(`✅ Using recording ID: ${testRecordingId} (${recordings[0].title})`);
        
        console.log("\\n🔍 Step 2: Testing process-recording function...");
        await testProcessRecording(testRecordingId);
      } else {
        console.log("❌ No recordings found in database");
      }
    } else {
      console.log("❌ Failed to fetch recordings:", listResponse.status);
    }
  } catch (error) {
    console.error("❌ Error fetching recordings:", error.message);
  }
  
  console.log("\\n🔍 Step 3: Testing upload error scenarios...");
  await testInvalidScenarios();
}

async function testProcessRecording(recordingId) {
  try {
    console.log(`🎯 Calling process-recording with ID: ${recordingId}`);
    
    const response = await fetch(`${supabaseUrl}/functions/v1/process-recording`, {
      method: "POST",
      headers: {
        "Authorization": "Bearer eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6InFpbmtsZGd2ZWpoZXBwaGV5a2ZsIiwicm9sZSI6ImFub24iLCJpYXQiOjE3MzQ3MzEwMzcsImV4cCI6MjA1MDMwNzAzN30.lO4fwNdZjPqBgWZPWZDVQxLPp5VjJlGzX0VKW8Jp_qk",
        "Content-Type": "application/json"
      },
      body: JSON.stringify({ recording_id: recordingId })
    });

    const status = response.status;
    console.log(`📊 Response status: ${status}`);
    
    if (response.ok) {
      const data = await response.json();
      console.log("✅ SUCCESS:", data);
    } else {
      const errorText = await response.text();
      console.error("❌ ERROR Response:", errorText);
      
      try {
        const errorJson = JSON.parse(errorText);
        console.error("🔍 Parsed error:", errorJson);
      } catch (parseError) {
        console.error("🔍 Raw error text:", errorText);
      }
    }
  } catch (error) {
    console.error("❌ Network/Fetch error:", error.message);
  }
}

async function testInvalidScenarios() {
  const testCases = [
    { name: "Empty body", body: {} },
    { name: "Null recording_id", body: { recording_id: null } },
    { name: "Invalid UUID format", body: { recording_id: "invalid-uuid" } },
    { name: "Valid UUID but non-existent", body: { recording_id: "123e4567-e89b-12d3-a456-426614174000" } }
  ];
  
  for (const testCase of testCases) {
    console.log(`\\n🧪 Testing: ${testCase.name}`);
    
    try {
      const response = await fetch(`${supabaseUrl}/functions/v1/process-recording`, {
        method: "POST",
        headers: {
          "Authorization": "Bearer eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6InFpbmtsZGd2ZWpoZXBwaGV5a2ZsIiwicm9sZSI6ImFub24iLCJpYXQiOjE3MzQ3MzEwMzcsImV4cCI6MjA1MDMwNzAzN30.lO4fwNdZjPqBgWZPWZDVQxLPp5VjJlGzX0VKW8Jp_qk",
          "Content-Type": "application/json"
        },
        body: JSON.stringify(testCase.body)
      });

      const status = response.status;
      const responseText = await response.text();
      
      console.log(`📊 Status: ${status}`);
      console.log(`📄 Response: ${responseText.substring(0, 200)}${responseText.length > 200 ? "..." : ""}`);
      
      if (status === 500) {
        console.error("🚨 FOUND 500 ERROR - This needs investigation!");
      }
    } catch (error) {
      console.error("❌ Error:", error.message);
    }
  }
}

testUploadFlow().catch(console.error);
