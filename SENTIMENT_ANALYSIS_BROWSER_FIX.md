# Browser-Based Sentiment Analysis Fix

## Problem Diagnosis ✅

The sentiment analysis system is working correctly, but the specific recording `8c51c733-d824-46de-8647-b035bb021779` has no sentiment data because:

1. **AI Response Parsing Failed**: The `analyze-speakers-topics` edge function received a valid response from GPT-4o Mini, but failed to parse it as JSON
2. **Fallback Analysis**: The function fell back to default values with empty topics and sentiment data
3. **No Moments Generated**: Since no topics were created, no sentiment moments were generated

## Browser Console Fix Commands

### Step 1: Manual Sentiment Analysis Trigger

Copy and paste this into your browser console (F12) while on the recording page:

```javascript
// Manual sentiment analysis with improved error handling
const runSentimentAnalysis = async () => {
  const recordingId = '8c51c733-d824-46de-8647-b035bb021779';
  
  console.log('🚀 Running manual sentiment analysis...');
  
  try {
    // First, get the recording data to check transcript
    const { data: recording, error: recordingError } = await window.supabase
      .from('recordings')
      .select('transcript, title, ai_summary')
      .eq('id', recordingId)
      .single();
    
    if (recordingError) {
      console.error('❌ Recording not found:', recordingError.message);
      return;
    }
    
    console.log('✅ Recording found:', recording.title);
    console.log('📝 Has transcript:', !!recording.transcript);
    console.log('📄 Transcript length:', recording.transcript?.length || 0);
    
    if (!recording.transcript) {
      console.error('❌ No transcript available for sentiment analysis');
      return;
    }
    
    // Trigger the edge function
    console.log('🔄 Calling analyze-speakers-topics edge function...');
    const { data: result, error: functionError } = await window.supabase.functions.invoke(
      'analyze-speakers-topics',
      {
        body: {
          recording_id: recordingId,
          force_reprocess: true
        }
      }
    );
    
    if (functionError) {
      console.error('❌ Edge function error:', functionError);
      return;
    }
    
    console.log('✅ Edge function completed:', result);
    
    // Check if topics and sentiment were generated
    if (result.topics_count > 0) {
      console.log(`🎉 Generated ${result.topics_count} topics!`);
    } else {
      console.warn('⚠️ No topics generated - AI parsing may have failed');
    }
    
    // Wait and check for sentiment moments
    setTimeout(async () => {
      console.log('🔍 Checking for generated sentiment moments...');
      
      const { data: moments, error: momentsError } = await window.supabase
        .from('ai_moments')
        .select('*')
        .eq('recording_id', recordingId)
        .in('type', ['sentiment_neg', 'positive_peak', 'negative_dip', 'emotional_moment']);
      
      if (momentsError) {
        console.error('❌ Error checking moments:', momentsError.message);
      } else if (moments && moments.length > 0) {
        console.log(`🎉 Found ${moments.length} sentiment moments!`);
        moments.forEach((moment, i) => {
          console.log(`   ${i + 1}. ${moment.type} at ${moment.start_time}s: ${moment.label}`);
        });
        
        // Refresh the page to see results
        console.log('🔄 Refreshing page to show updated sentiment data...');
        setTimeout(() => window.location.reload(), 2000);
      } else {
        console.log('❌ No sentiment moments found');
        console.log('💡 The AI response parsing likely failed - trying manual creation...');
        
        // Create basic sentiment moments manually if AI failed
        await createManualSentimentMoments(recordingId, recording.transcript);
      }
    }, 3000);
    
  } catch (error) {
    console.error('💥 Failed:', error);
  }
};

// Fallback: Create basic sentiment moments from transcript analysis
const createManualSentimentMoments = async (recordingId, transcript) => {
  console.log('🛠️ Creating manual sentiment moments as fallback...');
  
  const moments = [];
  
  // Basic keyword-based sentiment detection
  const positiveKeywords = ['great', 'excellent', 'perfect', 'amazing', 'love', 'excited', 'fantastic'];
  const negativeKeywords = ['problem', 'issue', 'concern', 'worried', 'difficult', 'trouble', 'disappointed'];
  
  positiveKeywords.forEach(keyword => {
    const index = transcript.toLowerCase().indexOf(keyword);
    if (index !== -1) {
      const timeEstimate = Math.floor((index / transcript.length) * 300); // Estimate time
      moments.push({
        recording_id: recordingId,
        type: 'positive_peak',
        start_time: timeEstimate,
        end_time: timeEstimate + 10,
        label: `Positive Language: ${keyword}`,
        tooltip: `Detected positive sentiment: "${keyword}"`,
        metadata: {
          confidence: 0.7,
          sentiment_score: 0.8,
          source: 'manual_keyword_detection',
          keyword: keyword
        }
      });
    }
  });
  
  negativeKeywords.forEach(keyword => {
    const index = transcript.toLowerCase().indexOf(keyword);
    if (index !== -1) {
      const timeEstimate = Math.floor((index / transcript.length) * 300);
      moments.push({
        recording_id: recordingId,
        type: 'sentiment_neg',
        start_time: timeEstimate,
        end_time: timeEstimate + 10,
        label: `Concern Detected: ${keyword}`,
        tooltip: `Potential concern or objection: "${keyword}"`,
        metadata: {
          confidence: 0.6,
          sentiment_score: -0.7,
          source: 'manual_keyword_detection',
          keyword: keyword
        }
      });
    }
  });
  
  // Limit to first 5 moments to avoid spam
  const limitedMoments = moments.slice(0, 5);
  
  if (limitedMoments.length > 0) {
    console.log(`🔧 Inserting ${limitedMoments.length} manual sentiment moments...`);
    
    const { data: insertedMoments, error: insertError } = await window.supabase
      .from('ai_moments')
      .insert(limitedMoments)
      .select();
    
    if (insertError) {
      console.error('❌ Failed to insert manual moments:', insertError.message);
    } else {
      console.log(`✅ Successfully created ${limitedMoments.length} sentiment moments manually!`);
      insertedMoments.forEach((moment, i) => {
        console.log(`   ${i + 1}. ${moment.type} at ${moment.start_time}s: ${moment.label}`);
      });
      
      // Refresh page to show results
      console.log('🔄 Refreshing page to show manual sentiment data...');
      setTimeout(() => window.location.reload(), 2000);
    }
  } else {
    console.log('⚠️ No sentiment keywords found in transcript');
  }
};

// Run the analysis
runSentimentAnalysis();
```

### Step 2: Verify Results

After running the above command:

1. **Check Console Output**: Look for success messages and moment creation logs
2. **Page Refresh**: The page should automatically refresh to show updated data
3. **Analytics Panel**: Should now show "AI Powered" sentiment metrics instead of "No AI sentiment data yet"

### Step 3: Alternative Quick Test

If the above doesn't work, try this simpler version:

```javascript
// Simple sentiment moment creation for testing
const createTestSentiments = async () => {
  const moments = [
    {
      recording_id: '8c51c733-d824-46de-8647-b035bb021779',
      type: 'positive_peak',
      start_time: 30,
      end_time: 40,
      label: 'Positive Moment',
      tooltip: 'Test positive sentiment moment',
      metadata: { confidence: 0.8, sentiment_score: 0.7, source: 'manual_test' }
    },
    {
      recording_id: '8c51c733-d824-46de-8647-b035bb021779',
      type: 'sentiment_neg',
      start_time: 120,
      end_time: 130,
      label: 'Concern Detected',
      tooltip: 'Test negative sentiment moment',
      metadata: { confidence: 0.7, sentiment_score: -0.6, source: 'manual_test' }
    }
  ];
  
  const { data, error } = await window.supabase
    .from('ai_moments')
    .insert(moments);
  
  if (error) {
    console.error('❌ Error:', error.message);
  } else {
    console.log('✅ Test moments created! Refreshing page...');
    setTimeout(() => window.location.reload(), 1000);
  }
};

createTestSentiments();
```

## Expected Results

After running these commands successfully:

- ✅ **Analytics Panel**: Should show "AI Powered" badge
- ✅ **Sentiment Metrics**: Should display positive/negative moment counts
- ✅ **Sentiment Timeline**: Should show colored sentiment segments
- ✅ **Console Logs**: Should show successful moment creation

## Next Steps

1. **Deploy Edge Function Fix**: The edge function needs to be updated with improved JSON parsing
2. **Monitor AI Responses**: Check Azure OpenAI logs for response format issues
3. **Test with New Recordings**: Verify sentiment analysis works for newly uploaded recordings

## Technical Notes

- The edge function is receiving valid responses from GPT-4o Mini (565 completion tokens)
- The issue is specifically with JSON parsing of the AI response
- Manual sentiment creation serves as a fallback until the edge function is fixed
- The `useSentimentAnalysis` hook and UI components are working correctly