const fetch = require("node-fetch");

const supabaseUrl = "https://qinkldgvejheppheykfl.supabase.co";
const anonKey = "eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6InFpbmtsZGd2ZWpoZXBwaGV5a2ZsIiwicm9sZSI6ImFub24iLCJpYXQiOjE3MzQ3MzEwMzcsImV4cCI6MjA1MDMwNzAzN30.lO4fwNdZjPqBgWZPWZDVQxLPp5VjJlGzX0VKW8Jp_qk";

async function checkRecordings() {
  console.log("🔍 CHECKING EXISTING RECORDINGS");
  console.log("===============================");
  
  try {
    const response = await fetch(`${supabaseUrl}/rest/v1/recordings?select=id,title,created_at,file_url&order=created_at.desc&limit=10`, {
      headers: {
        "apikey": anonKey,
        "Authorization": `Bearer ${anonKey}`
      }
    });
    
    if (response.ok) {
      const recordings = await response.json();
      console.log(`📁 Found ${recordings.length} recordings:`);
      
      if (recordings.length === 0) {
        console.log("❌ No recordings found in database");
        console.log("💡 You need to upload a file first to test the process-recording function");
        return;
      }
      
      recordings.forEach((rec, idx) => {
        console.log(`   ${idx + 1}. ID: ${rec.id}`);
        console.log(`      Title: ${rec.title}`);
        console.log(`      Created: ${rec.created_at}`);
        console.log(`      Has File URL: ${!!rec.file_url}`);
        console.log("");
      });
      
      // Test with the first recording
      const testRecording = recordings[0];
      console.log(`🎯 Testing process-recording with: ${testRecording.id}`);
      await testProcessRecording(testRecording.id);
      
    } else {
      console.error("❌ Failed to fetch recordings:", response.status);
      const errorText = await response.text();
      console.error("Error details:", errorText);
    }
  } catch (error) {
    console.error("❌ Error:", error.message);
  }
}

async function testProcessRecording(recordingId) {
  try {
    console.log(`\\n🎯 TESTING PROCESS-RECORDING WITH: ${recordingId}`);
    console.log("================================================");
    
    const startTime = Date.now();
    const response = await fetch(`${supabaseUrl}/functions/v1/process-recording`, {
      method: "POST",
      headers: {
        "Authorization": `Bearer ${anonKey}`,
        "Content-Type": "application/json"
      },
      body: JSON.stringify({ recording_id: recordingId })
    });
    
    const endTime = Date.now();
    const duration = endTime - startTime;
    
    console.log(`⏱️  Request completed in ${duration}ms`);
    console.log(`📊 Response Status: ${response.status} ${response.statusText}`);
    
    const responseText = await response.text();
    console.log(`📄 Response Length: ${responseText.length} characters`);
    
    if (response.ok) {
      try {
        const data = JSON.parse(responseText);
        console.log("✅ SUCCESS - Process Recording Response:");
        console.log(JSON.stringify(data, null, 2));
      } catch (parseError) {
        console.log("✅ SUCCESS - Raw Response:", responseText);
      }
    } else {
      console.error(`❌ ERROR ${response.status}:`);
      
      try {
        const errorData = JSON.parse(responseText);
        console.error("🔍 Parsed Error Response:");
        console.error(JSON.stringify(errorData, null, 2));
      } catch (parseError) {
        console.error("🔍 Raw Error Response:", responseText);
      }
      
      if (response.status === 500) {
        console.error("\\n🚨 500 INTERNAL SERVER ERROR DETECTED!");
        console.error("💡 This indicates an issue in the Edge Function code");
        console.error("🔧 Check Supabase Edge Function logs for details");
      }
    }
  } catch (error) {
    console.error("❌ Network Error:", error.message);
  }
}

checkRecordings().catch(console.error);
