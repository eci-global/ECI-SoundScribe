# 🔧 Troubleshooting "No Coaching Analysis Available"

## Current Issue
You're seeing "No Coaching Analysis Available" because the backend Edge Functions don't have the required environment variables to generate coaching evaluations.

## Step-by-Step Fix

### Step 1: Verify Your OpenAI API Key
First, let's make sure your OpenAI API key is working:

```bash
# Test your OpenAI API key (use the one from your .env file)
curl -H "Authorization: Bearer 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" \
     -H "Content-Type: application/json" \
     https://api.openai.com/v1/models
```

If this returns a list of models, your API key is valid.

### Step 2: Set Up Supabase Environment Variables

#### Option A: Using Supabase Dashboard (Easiest)
1. Go to [https://supabase.com/dashboard/projects](https://supabase.com/dashboard/projects)
2. Select your project: `qinkldgvejheppheykfl`
3. Go to **Settings** → **Edge Functions**
4. Add these environment variables:
   - `OPENAI_API_KEY`: `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`
   - `SUPABASE_SERVICE_ROLE_KEY`: (get this from Settings → API → service_role key)

#### Option B: Using Supabase CLI
If you can authenticate with Supabase CLI:

```bash
# First, login to Supabase
npx supabase login

# Set environment variables
npx supabase secrets set OPENAI_API_KEY=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

# Get your service role key from Supabase dashboard and set it
npx supabase secrets set SUPABASE_SERVICE_ROLE_KEY=your_service_role_key_here
```

### Step 3: Get Your Service Role Key
1. Go to [https://supabase.com/dashboard/projects](https://supabase.com/dashboard/projects)
2. Select your project
3. Go to **Settings** → **API**
4. Copy the **service_role** key (NOT the anon key)
5. It should look like: `eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9...` (much longer than anon key)

### Step 4: Deploy/Redeploy Edge Functions
After setting the environment variables, redeploy the functions:

```bash
npx supabase functions deploy process-recording
npx supabase functions deploy reprocess-coaching
```

### Step 5: Test with New Recording
1. Upload a new audio/video file
2. Wait for processing to complete
3. Check if the CoachingCanvas now shows coaching data

### Step 6: Reprocess Existing Recordings (Optional)
If you want coaching data for existing recordings:
1. Go to Admin Panel → Coaching Setup
2. Click "Scan for Missing Data"
3. Click "Process All" to generate coaching data

## Quick Verification Commands

### Check if secrets are set (requires CLI login):
```bash
npx supabase secrets list
```

### Check function logs for errors:
```bash
npx supabase functions logs process-recording
```

### Test database connection:
```bash
node test-coaching-setup.js
```

## Common Issues & Solutions

### ❌ "Cannot connect to Docker daemon"
- This is expected - we're using remote Supabase, not local
- Use the dashboard method instead of CLI

### ❌ "Access token not provided"
- Use the Supabase Dashboard method instead of CLI
- Or run `npx supabase login` first

### ❌ Still no coaching data after setup
1. Check function logs: `npx supabase functions logs process-recording`
2. Verify the recording has a transcript
3. Ensure content_type is not 'other'
4. Check enable_coaching is not false

### ❌ "Invalid API key" errors
- Verify your OpenAI API key is correct
- Make sure you have credits in your OpenAI account
- Test the key with the curl command above

## What Should Happen After Setup

✅ New recordings will automatically get coaching evaluation during processing  
✅ CoachingCanvas will show:
- Performance scores (talk-time ratio, objection handling, etc.)
- Strengths and areas for improvement
- Suggested response improvements
- Action items

✅ You'll see real data instead of "No Coaching Analysis Available"

## Need Help?

If you're still having issues:
1. Check the function logs: `npx supabase functions logs process-recording`
2. Try uploading a new recording after setting up the environment variables
3. Use the Admin Panel → Coaching Setup to reprocess existing recordings
4. Verify your OpenAI account has available credits

The key is getting those environment variables set in the Supabase project - once that's done, everything should work automatically!