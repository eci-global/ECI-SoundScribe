# 🔍 How to Check Edge Function Logs

Since your files are stuck and Azure credentials are already in Supabase, the issue is likely with the Edge Functions themselves. Here's how to check:

## 1. Check Edge Function Logs in Supabase

1. Go to: https://supabase.com/dashboard/project/qinkldgvejheppheykfl/functions
2. Click on `process-recording` function
3. Click on "Logs" tab
4. Look for:
   - ❌ **Timeout errors** (function exceeded 50s limit)
   - ❌ **Memory errors** (out of memory)
   - ❌ **Azure OpenAI errors** (rate limits, authentication)
   - ❌ **File download errors** (can't access file URL)

## 2. Common Error Patterns

### Timeout Error
```
Function execution time exceeded 50000ms
```
**Solution**: File is too large for Edge Functions, needs Azure backend

### Memory Error
```
JavaScript heap out of memory
```
**Solution**: File is consuming too much memory during processing

### Azure OpenAI Error
```
Azure OpenAI configuration error
```
**Solution**: Check if environment variables are set correctly

### File Access Error
```
Failed to fetch recording file
```
**Solution**: Check if file URL is accessible from Edge Functions

## 3. Quick SQL to Check Stuck Files

Run this in Supabase SQL editor to see what's stuck:

```sql
-- See all processing/pending recordings with details
SELECT 
  id,
  title,
  status,
  file_size / 1024 / 1024 as size_mb,
  created_at,
  error_message,
  processing_notes
FROM recordings
WHERE status IN ('pending', 'processing')
ORDER BY created_at DESC;
```

## 4. Immediate Fix

If you see timeout or memory errors in the logs:

```sql
-- Mark large files as failed
UPDATE recordings 
SET 
  status = 'failed',
  error_message = 'File too large for Edge Functions - needs manual processing',
  processing_notes = 'File size exceeds Edge Function limits. Consider using smaller files or Azure backend.'
WHERE status IN ('pending', 'processing')
  AND file_size > 50 * 1024 * 1024; -- Files over 50MB

-- Mark all stuck files as failed
UPDATE recordings 
SET 
  status = 'failed',
  error_message = 'Processing timeout',
  processing_notes = 'Edge Function timeout or error. Check logs for details.'
WHERE status IN ('pending', 'processing')
  AND created_at < NOW() - INTERVAL '10 minutes';
```

## 5. Test with a Small File

To verify Edge Functions are working:
1. Upload a very small audio file (< 5MB)
2. Watch the Edge Function logs in real-time
3. This will help identify if it's a size issue or configuration issue

## 6. Check Environment Variables

Make sure these are set in Supabase Edge Functions:
- `AZURE_OPENAI_ENDPOINT`
- `AZURE_OPENAI_API_KEY`
- `AZURE_OPENAI_API_VERSION`
- `AZURE_OPENAI_GPT4O_MINI_DEPLOYMENT`
- `AZURE_OPENAI_WHISPER_DEPLOYMENT`

Go to: Project Settings → Edge Functions → Secrets

---

**Most Likely Issue**: Your files are too large for Edge Functions (50s timeout, 256MB memory limit) even with Azure OpenAI. The Edge Function is timing out trying to download and process the files.