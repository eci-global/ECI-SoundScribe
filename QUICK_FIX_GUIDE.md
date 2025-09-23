# 🚨 Quick Fix for Stuck Recordings

## Immediate Steps to Fix Your Stuck Files

### 1️⃣ Mark Stuck Files as Failed (So You Can Retry)

1. Go to Supabase SQL Editor: https://supabase.com/dashboard/project/qinkldgvejheppheykfl/sql/new
2. Copy and paste this SQL:

```sql
-- See stuck recordings
SELECT 
  id,
  title,
  status,
  file_size / 1024 / 1024 as size_mb,
  created_at
FROM recordings
WHERE status IN ('pending', 'processing')
ORDER BY created_at DESC;
```

3. Run it to see your stuck files
4. Then run this to mark them as failed:

```sql
UPDATE recordings 
SET 
  status = 'failed',
  error_message = 'Processing timeout - retry needed',
  updated_at = NOW()
WHERE status IN ('pending', 'processing');
```

### 2️⃣ Use Edge Functions Instead (Temporary)

The code is already updated to use Edge Functions for files under 200MB, so your next uploads should work.

### 3️⃣ Retry Failed Recordings

1. Go back to your app
2. Find the failed recordings
3. Click the "Retry Processing" button
4. They should now process via Edge Functions

## 📊 Why This Happened

1. **Azure Backend Issue**: The Azure backend doesn't have Supabase credentials to update status
2. **Files Get Stuck**: Processing might work but status never updates from "processing" to "completed"
3. **No Visibility**: Logs are on Azure, not in Supabase

## 🔧 Permanent Fix Options

### Option A: Configure Azure Backend (Recommended)
1. Get your Supabase service role key
2. Add it to Azure App Service environment variables
3. Follow the full guide in `AZURE_BACKEND_SETUP.md`

### Option B: Use Only Edge Functions
Keep the current setup where files < 200MB use Edge Functions. This works but may have memory issues with very large files.

### Option C: Hybrid Approach
- Small files (< 50MB): Edge Functions
- Large files (> 50MB): Properly configured Azure Backend
- Best of both worlds

## 🎯 Next Steps

1. **Right Now**: Run the SQL to mark files as failed
2. **Retry**: Click retry on failed recordings  
3. **Monitor**: Check Supabase Edge Function logs
4. **Long Term**: Configure Azure backend properly

## ❓ Need Help?

- Check browser console for errors (F12)
- Look at Supabase Edge Function logs
- The threshold is currently 200MB (files under this use Edge Functions)

---

**Status**: Your files should process correctly after following step 1 & 2!