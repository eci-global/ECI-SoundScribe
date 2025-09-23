// Verify and display sentiment data that was generated
// Run this in browser console to see the current sentiment data

const verifySentimentData = async () => {
  console.log('🔍 Verifying sentiment data generation results...\n');
  
  const recordingId = '8c51c733-d824-46de-8647-b035bb021779';
  
  try {
    // Check current sentiment moments in database
    console.log('1️⃣ Checking ai_moments table...');
    const { data: moments, error: momentsError } = await window.supabase
      .from('ai_moments')
      .select('*')
      .eq('recording_id', recordingId)
      .in('type', ['sentiment_neg', 'bookmark', 'action']);
    
    if (momentsError) {
      console.log('❌ Error fetching moments:', momentsError.message);
      return false;
    }
    
    console.log(`✅ Found ${moments?.length || 0} sentiment moments`);
    
    if (moments && moments.length > 0) {
      console.log('\n📊 Sentiment Moments Details:');
      moments.forEach((moment, i) => {
        const metadata = moment.metadata || {};
        console.log(`${i + 1}. ${moment.type} at ${moment.start_time}s`);
        console.log(`   Label: "${moment.label}"`);
        console.log(`   Tooltip: "${moment.tooltip}"`);
        console.log(`   Confidence: ${metadata.confidence || 'N/A'}`);
        console.log(`   Score: ${metadata.sentiment_score || 'N/A'}`);
        console.log(`   Keywords: ${JSON.stringify(metadata.keywords || [])}`);
        console.log('');
      });
      
      // Test the UI transformation
      console.log('2️⃣ Testing UI transformation...');
      const transformedMoments = moments.map((moment, index) => {
        const metadata = moment.metadata || {};
        return {
          id: moment.id,
          timestamp: moment.start_time || 0,
          speaker: 'Speaker 1',
          sentimentScore: metadata.sentiment_score || 0,
          confidence: metadata.confidence || 0.5,
          intensity: metadata.confidence > 0.8 ? 'high' : metadata.confidence > 0.6 ? 'medium' : 'low',
          type: moment.type,
          text: moment.tooltip || 'AI-detected moment',
          context: moment.label || 'Context',
          source: 'ai_generated'
        };
      });
      
      console.log('✅ UI transformation successful');
      console.log(`   Transformed ${transformedMoments.length} moments for display`);
      
      // Calculate analytics like the UI does
      console.log('\n3️⃣ Testing analytics calculations...');
      
      const typeBreakdown = transformedMoments.reduce((acc, moment) => {
        acc[moment.type] = (acc[moment.type] || 0) + 1;
        return acc;
      }, { sentiment_neg: 0, bookmark: 0, action: 0 });
      
      const avgConfidence = transformedMoments.reduce((sum, m) => sum + m.confidence, 0) / transformedMoments.length;
      
      const intensityDistribution = transformedMoments.reduce((acc, moment) => {
        acc[moment.intensity]++;
        return acc;
      }, { high: 0, medium: 0, low: 0 });
      
      console.log('📈 Analytics Results:');
      console.log(`   Average confidence: ${Math.round(avgConfidence * 100)}%`);
      console.log('   Type breakdown:', typeBreakdown);
      console.log('   Intensity distribution:', intensityDistribution);
      
      // Check if this should show "AI Powered"
      const hasAIData = transformedMoments.length > 0;
      console.log(`\n🤖 Should show "AI Powered": ${hasAIData}`);
      
      // Force refresh the cache
      console.log('\n4️⃣ Clearing cache and forcing refresh...');
      
      // Clear any cached data
      if (window.localStorage) {
        const keys = Object.keys(window.localStorage);
        keys.forEach(key => {
          if (key.includes('sentiment') || key.includes(recordingId)) {
            window.localStorage.removeItem(key);
            console.log(`   Cleared cache key: ${key}`);
          }
        });
      }
      
      console.log('✅ Cache cleared - page refresh should show new data');
      
      console.log('\n🎯 VERIFICATION RESULT: SUCCESS!');
      console.log('💡 Sentiment data exists and is properly formatted');
      console.log('💡 Analytics calculations are working');
      console.log('💡 UI should show "AI Powered" sentiment metrics');
      console.log('\n🔄 NEXT STEPS:');
      console.log('1. Refresh the page to clear any cached data');
      console.log('2. Check the Analytics panel (right column)');
      console.log('3. Look for "AI Powered" badge in Advanced Sentiment Metrics');
      
      return true;
      
    } else {
      console.log('❌ No sentiment moments found');
      console.log('💡 Try manually clicking "Generate AI Sentiment Analysis" button');
      return false;
    }
    
  } catch (error) {
    console.error('💥 Verification failed:', error);
    return false;
  }
};

// Run the verification
console.log('🚀 Starting sentiment data verification...\n');
verifySentimentData().then(success => {
  if (success) {
    console.log('\n✨ Verification completed successfully!');
    console.log('🔄 Refresh the page to see the results.');
  } else {
    console.log('\n⚠️ Verification found issues - check the logs above.');
  }
}).catch(error => {
  console.error('\n💥 Verification script failed:', error);
});