# 🔍 Verification Checklist for Supabase Coaching Setup

Since you mentioned you see the data in Supabase already, let's verify what's configured and identify what might be missing.

## Step 1: Check Supabase Dashboard - Environment Variables

Go to your Supabase project dashboard and verify:

### 1.1 Edge Functions Environment Variables
- **URL**: https://supabase.com/dashboard/project/qinkldgvejheppheykfl/settings/functions
- **Check if these variables exist**:
  - ✅ `OPENAI_API_KEY` = sk-proj-z_xo9JtH2CigoBeb9oQ...
  - ✅ `SUPABASE_SERVICE_ROLE_KEY` = eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9...

### 1.2 Edge Functions Status
- **URL**: https://supabase.com/dashboard/project/qinkldgvejheppheykfl/functions
- **Check if these functions are deployed**:
  - ✅ `process-recording`
  - ✅ `chat-with-recording` 
  - ✅ `reprocess-coaching` (if you deployed the new one)

## Step 2: Check Database - Recordings Table

### 2.1 Recordings Structure
- **URL**: https://supabase.com/dashboard/project/qinkldgvejheppheykfl/editor
- **Go to**: recordings table
- **Verify columns exist**:
  - ✅ `coaching_evaluation` (JSONB)
  - ✅ `content_type` (VARCHAR)
  - ✅ `enable_coaching` (BOOLEAN)

### 2.2 Sample Recording Data
Look at a specific recording and check:
- ✅ `status` = 'completed'
- ✅ `transcript` has content (not null)
- ✅ `content_type` is one of: sales_call, customer_support, team_meeting, training_session
- ✅ `enable_coaching` is true or null (not false)
- ❓ `coaching_evaluation` - is this null or does it have data?

## Step 3: Test Current Setup

### 3.1 Check Function Logs
- **URL**: https://supabase.com/dashboard/project/qinkldgvejheppheykfl/logs/functions
- **Look for recent logs from**: `process-recording`
- **Common error patterns to look for**:
  - ❌ "OpenAI API error"
  - ❌ "Invalid API key"
  - ❌ "Environment variable not found"
  - ❌ "Rate limit exceeded"

### 3.2 Test with New Recording
1. Upload a new audio/video file
2. Wait for processing to complete
3. Check if `coaching_evaluation` gets populated
4. Look at function logs during processing

## What to Report Back

Please check the above and let me know:

1. **Environment Variables**: Are `OPENAI_API_KEY` and `SUPABASE_SERVICE_ROLE_KEY` set in Edge Functions settings?

2. **Function Deployment**: Are the functions deployed and showing as active?

3. **Sample Recording**: For a recording that shows "No Coaching Analysis Available", what does the database record look like? Specifically:
   - What is the `content_type`?
   - Is `coaching_evaluation` null or empty?
   - Does it have a `transcript`?
   - What is `enable_coaching` set to?

4. **Function Logs**: Are there any error messages in the process-recording function logs?

## Quick Database Query

If you want to run a quick query in Supabase SQL Editor:

```sql
-- Check recordings that should have coaching but don't
SELECT 
  id,
  title,
  status,
  content_type,
  enable_coaching,
  CASE 
    WHEN transcript IS NULL THEN 'No transcript'
    WHEN coaching_evaluation IS NULL THEN 'No coaching data'
    ELSE 'Has coaching data'
  END as coaching_status,
  created_at
FROM recordings 
WHERE status = 'completed'
ORDER BY created_at DESC
LIMIT 10;
```

This will show us exactly what's happening with your recordings and why coaching data might not be appearing.

## Most Likely Issues

Based on "No Coaching Analysis Available" still showing:

1. **Environment variables not set** - Most common cause
2. **Function not processing coaching** - Check logs for errors
3. **Content type = 'other'** - Only specific content types get coaching
4. **OpenAI API issues** - Rate limits, invalid key, no credits
5. **Database permissions** - Service role key issues

Let me know what you find, and I can pinpoint the exact issue!