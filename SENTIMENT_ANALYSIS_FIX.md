# Fix for "AI sentiment analysis unavailable" Issue

## Root Cause
The `ai_moments` table was missing the `metadata` field that stores sentiment confidence scores and other AI analysis data.

## Solution Implemented

### 1. Database Schema Fix
**File**: `supabase/migrations/20250130_add_ai_moments_metadata.sql`
- Added `metadata JSONB` column to `ai_moments` table
- Added GIN index for faster metadata queries

**To apply this migration:**
```bash
# If using Supabase CLI locally
npx supabase db reset

# Or apply the migration manually in Supabase dashboard:
# Go to SQL Editor and run the migration file content
```

### 2. TypeScript Types Updated
**File**: `src/integrations/supabase/types.ts` 
- Added `metadata: Json | null` to `ai_moments` Row, Insert, and Update interfaces

### 3. Enhanced Debugging
**File**: `src/hooks/useSentimentAnalysis.ts`
- Added comprehensive logging to track data flow
- Enhanced error handling with specific error messages
- Better handling of missing metadata in sentiment moments

### 4. Improved User Feedback
**File**: `src/components/spotlight/panels/AnalyticsPanel.tsx`
- Better error messages explaining why AI analysis isn't available
- Development mode debugging information
- Clear distinction between loading and unavailable states

### 5. Test Script Created
**File**: `test-sentiment-generation.js`
- Manual test script to trigger sentiment analysis for existing recordings
- Helps verify the end-to-end pipeline works correctly

## How to Test the Fix

### Option 1: Apply Migration and Test Existing Data
1. Apply the database migration (see above)
2. Run the test script: `node test-sentiment-generation.js`
3. Check if sentiment moments are generated for existing recordings

### Option 2: Upload New Recording
1. Apply the database migration
2. Upload a new recording with transcript
3. Wait for AI analysis to complete
4. Check the Analytics panel for sentiment metrics

## Expected Results After Fix

1. **Analytics Panel**: Should show "AI Powered" sentiment metrics instead of "AI sentiment analysis unavailable"
2. **Sentiment Timeline**: Should display colored sentiment segments from real AI data
3. **Sentiment Moments Panel**: Should show AI-generated sentiment moments with confidence scores
4. **Console Logs**: Should show successful sentiment moment insertion and data fetching

## Debugging Steps if Still Not Working

1. **Check Console Logs**: Look for "useSentimentAnalysis Debug" logs to see what data is being fetched
2. **Database Query**: Manually query `ai_moments` table to see if data exists:
   ```sql
   SELECT * FROM ai_moments 
   WHERE recording_id = 'your-recording-id' 
   AND type IN ('sentiment_neg', 'positive_peak', 'negative_dip', 'emotional_moment');
   ```
3. **Edge Function Logs**: Check Supabase Edge Function logs for `analyze-speakers-topics` errors
4. **Test Pipeline**: Use the test script to manually trigger sentiment analysis

## Monitoring

- Watch the console for "AI moments updated, refreshing sentiment data" messages
- Check real-time subscriptions are working properly
- Monitor edge function execution logs in Supabase dashboard

The sentiment analysis should now work properly with real AI-generated data!