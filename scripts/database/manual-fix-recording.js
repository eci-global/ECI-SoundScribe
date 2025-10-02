// Manual script to fix the stuck 90MB video recording
// Run this from the command line with: node manual-fix-recording.js

console.log('🔧 Manual Recording Fix Script');
console.log('==============================');
console.log('');
console.log('📁 File: VDI creation-20240123_164354-Meeting Recording.mp4');
console.log('💾 Size: ~90MB');
console.log('🆔 Recording ID: a489cc7c-1386-40e7-82cd-7666c2c4eab2');
console.log('');

console.log('📋 Current Status:');
console.log('  - Stuck in "processing" for 8+ hours');
console.log('  - Edge Functions haven\'t run recently');
console.log('  - Getting 406 error when fetching transcript');
console.log('');

console.log('🎯 Solution Steps:');
console.log('');
console.log('1. **Immediate Fix - Mark as Failed:**');
console.log('   Run this SQL in Supabase dashboard:');
console.log('   ```sql');
console.log('   UPDATE recordings');
console.log('   SET status = \'failed\',');
console.log('       error_message = \'Large file (90MB) processing timeout - requires manual re-processing\',');
console.log('       processing_progress = 0,');
console.log('       updated_at = NOW()');
console.log('   WHERE id = \'a489cc7c-1386-40e7-82cd-7666c2c4eab2\';');
console.log('   ```');
console.log('');

console.log('2. **Re-process with Azure Backend:**');
console.log('   The file is too large for Edge Functions (256MB limit).');
console.log('   Azure backend is now deployed at: https://soundscribe-backend.azurewebsites.net');
console.log('');
console.log('   To re-process:');
console.log('   a) Delete the current recording');
console.log('   b) Re-upload the file - it will automatically route to Azure');
console.log('');

console.log('3. **Alternative - Trigger Azure Processing Manually:**');
console.log('   ```bash');
console.log('   curl -X POST https://soundscribe-backend.azurewebsites.net/api/process-audio \\');
console.log('     -H "Content-Type: application/json" \\');
console.log('     -d \'{"recording_id":"a489cc7c-1386-40e7-82cd-7666c2c4eab2","file_size":94371840,"is_large_file":true}\'');
console.log('   ```');
console.log('');

console.log('4. **Check for Edge Function Logs:**');
console.log('   ```bash');
console.log('   npx supabase functions logs process-recording');
console.log('   ```');
console.log('');

console.log('🚀 Recommended Action:');
console.log('   1. Run the SQL query above to mark as failed');
console.log('   2. Delete and re-upload the file');
console.log('   3. The new upload will route to Azure backend automatically');
console.log('');

// Function to generate the API call
function generateCurlCommand(recordingId, fileSize) {
  const command = `curl -X POST https://soundscribe-backend.azurewebsites.net/api/process-audio \\
  -H "Content-Type: application/json" \\
  -d '{
    "recording_id": "${recordingId}",
    "file_size": ${fileSize},
    "is_large_file": true,
    "file_type": "video"
  }'`;
  
  return command;
}

console.log('📝 Generated Azure API Call:');
console.log(generateCurlCommand('a489cc7c-1386-40e7-82cd-7666c2c4eab2', 94371840));
console.log('');

console.log('✅ Script complete. Follow the steps above to fix your stuck recording.');