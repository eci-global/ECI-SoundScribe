# Automatic Scorecard Generation Setup

This document explains how to set up automatic employee scorecard generation when recordings complete.

## Overview

When a recording upload completes and has a transcript, the system automatically:
1. ✅ Detects the employee from the transcript
2. ✅ Creates an employee participation record
3. ✅ Generates a performance scorecard with real data

**No manual browser console commands required!**

## Architecture

```
Recording Upload → Process → Status='completed' + Transcript
                                    ↓
                         Database Webhook triggers
                                    ↓
                    auto-process-recording Edge Function
                                    ↓
          ┌─────────────────────┴─────────────────────┐
          ↓                                           ↓
  extract-employee-name                  generate-employee-scorecard
  (detects employee)                     (creates scorecard)
          ↓                                           ↓
   Participation record                        Scorecard data
          ↓                                           ↓
          └─────────────────────┬─────────────────────┘
                                ↓
                    ✅ Employee profile updated
```

## Setup Instructions

### Step 1: Deploy Edge Functions

```bash
# Deploy all required functions
npx supabase functions deploy auto-process-recording
npx supabase functions deploy extract-employee-name
npx supabase functions deploy generate-employee-scorecard
```

### Step 2: Set Up Database Webhook

1. Go to Supabase Dashboard: https://supabase.com/dashboard/project/qinkldgvejheppheykfl/database/hooks

2. Click **"Create a new hook"**

3. **Configure the webhook:**
   - **Name:** `auto-process-completed-recordings`
   - **Table:** `recordings`
   - **Events:** Select `UPDATE`
   - **Webhook Type:** HTTP Request
   - **HTTP Method:** POST
   - **HTTP URL:** `https://qinkldgvejheppheykfl.supabase.co/functions/v1/auto-process-recording`

4. **Add Conditions:**
   ```sql
   -- Only trigger when recording completes with transcript
   NEW.status = 'completed' AND NEW.transcript IS NOT NULL
   ```

5. **Add Headers:**
   ```json
   {
     "Authorization": "Bearer YOUR_SERVICE_ROLE_KEY",
     "Content-Type": "application/json"
   }
   ```

   Replace `YOUR_SERVICE_ROLE_KEY` with your Supabase service role key from: https://supabase.com/dashboard/project/qinkldgvejheppheykfl/settings/api

6. Click **"Create hook"**

### Step 3: Test the Setup

#### Option A: Upload New Recording
1. Upload a new recording via the UI
2. Wait for it to complete processing
3. Check the employee's profile - data should appear automatically
4. Check Supabase Logs to verify the webhook fired

#### Option B: Manual Test
Run in browser console:
```javascript
const { data } = await window.supabase.functions.invoke(
  'auto-process-recording',
  {
    body: {
      recording_id: '<recording-id-here>'
    }
  }
);
console.log('Result:', data);
```

## Monitoring

### Check Webhook Logs
1. Go to: https://supabase.com/dashboard/project/qinkldgvejheppheykfl/database/hooks
2. Click on your webhook
3. View "Webhook Logs" tab to see firing history

### Check Edge Function Logs
1. Go to: https://supabase.com/dashboard/project/qinkldgvejheppheykfl/functions
2. Click on `auto-process-recording`
3. Click "Logs" tab
4. Look for:
   - ✅ `Auto-processing completed`
   - ✅ `Employee extraction completed`
   - ✅ `Scorecard generation completed`
   - ❌ Any error messages

## How It Works

### Idempotency
The system is **safe to run multiple times** on the same recording:
- ✅ Skips employee extraction if participation already exists
- ✅ Skips scorecard generation if scorecard already exists
- ✅ No duplicate data created

### Error Handling
- Each step runs independently
- If one step fails, others still attempt to run
- Returns detailed results for each step
- Logs all errors for debugging

### Response Format
```json
{
  "recording_id": "uuid",
  "recording_title": "Call Title",
  "status": "success" | "partial_success",
  "all_steps_completed": true,
  "results": [
    {
      "step": "employee_extraction",
      "success": true,
      "data": {...}
    },
    {
      "step": "scorecard_generation",
      "success": true,
      "data": {...}
    }
  ],
  "summary": {
    "employee_extracted": true,
    "scorecard_generated": true
  }
}
```

## Troubleshooting

### Webhook Not Firing
1. Check webhook is enabled in Supabase dashboard
2. Verify the condition matches: `status = 'completed' AND transcript IS NOT NULL`
3. Check webhook logs for errors

### Employee Not Detected
1. Check `extract-employee-name` function logs
2. Verify transcript contains employee name
3. Check employee exists in `employees` table
4. Name might need fuzzy matching (e.g., "Hector" in transcript)

### Scorecard Not Generated
1. Check `generate-employee-scorecard` function logs
2. Verify participation record exists
3. Check Azure OpenAI API limits/errors
4. Verify database schema matches (see schema issues below)

### Common Errors

**"Could not find column in schema cache"**
- Run in Supabase SQL Editor: `NOTIFY pgrst, 'reload schema';`
- Wait 30 seconds and try again

**"Recording not found"**
- RLS policy may be blocking service role
- Check RLS policies on `recordings` table

**"No transcript available"**
- Recording still processing
- Webhook triggered too early
- Check recording status in database

## Disabling Automation

If you need to temporarily disable automatic processing:

1. Go to Supabase Dashboard → Database → Hooks
2. Click on `auto-process-completed-recordings`
3. Toggle "Enabled" to OFF
4. Fall back to manual browser console commands

## Manual Fallback

If automation fails, you can still process manually via browser console:

```javascript
// 1. Check recording
const { data: recording } = await window.supabase
  .from('recordings')
  .select('*')
  .eq('id', 'RECORDING_ID')
  .single();

// 2. Extract employee (or create participation manually)
await window.supabase.functions.invoke('extract-employee-name', {
  body: { recording_id: 'RECORDING_ID' }
});

// 3. Generate scorecard
await window.supabase.functions.invoke('generate-employee-scorecard', {
  body: { recording_id: 'RECORDING_ID' }
});
```

## Future Enhancements

- [ ] Email notifications on failures
- [ ] Retry logic for transient errors
- [ ] Dashboard showing auto-processing status
- [ ] Batch processing for historical recordings
- [ ] Custom criteria per team/role
