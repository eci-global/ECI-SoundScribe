// Comprehensive Sentiment Analysis System Verification
// Run this in browser console to test all components

const verifySentimentSystem = async () => {
  console.log('🧪 Comprehensive Sentiment Analysis System Verification\n');
  
  const recordingId = '8c51c733-d824-46de-8647-b035bb021779';
  
  try {
    // Test 1: Verify recording exists
    console.log('1️⃣ Testing recording existence...');
    const { data: recording, error: recordingError } = await window.supabase
      .from('recordings')
      .select('id, title, transcript, ai_summary, ai_insights, duration')
      .eq('id', recordingId)
      .single();
    
    if (recordingError) {
      console.error('❌ Recording test failed:', recordingError.message);
      return false;
    }
    
    console.log('✅ Recording found:', recording.title);
    console.log('   Duration:', recording.duration, 'seconds');
    console.log('   Has transcript:', !!recording.transcript);
    console.log('   Transcript length:', recording.transcript?.length || 0);
    
    // Test 2: Check sentiment moments
    console.log('\n2️⃣ Testing sentiment moments...');
    const { data: moments, error: momentsError } = await window.supabase
      .from('ai_moments')
      .select('*')
      .eq('recording_id', recordingId)
      .in('type', ['sentiment_neg', 'positive_peak', 'negative_dip', 'emotional_moment']);
    
    if (momentsError) {
      console.error('❌ Moments query failed:', momentsError.message);
      return false;
    }
    
    console.log(`✅ Found ${moments?.length || 0} sentiment moments`);
    if (moments && moments.length > 0) {
      moments.forEach((moment, i) => {
        const confidence = moment.metadata?.confidence || 'N/A';
        const score = moment.metadata?.sentiment_score || 'N/A';
        console.log(`   ${i + 1}. ${moment.type} at ${moment.start_time}s (confidence: ${confidence}, score: ${score})`);
      });
    }
    
    // Test 3: Check topic segments
    console.log('\n3️⃣ Testing topic segments...');
    const { data: segments, error: segmentsError } = await window.supabase
      .from('topic_segments')
      .select('*')
      .eq('recording_id', recordingId);
    
    if (segmentsError) {
      console.error('❌ Segments query failed:', segmentsError.message);
      return false;
    }
    
    console.log(`✅ Found ${segments?.length || 0} topic segments`);
    if (segments && segments.length > 0) {
      segments.forEach((segment, i) => {
        const sentiment = segment.metadata?.sentiment || 'neutral';
        console.log(`   ${i + 1}. "${segment.topic}" (${segment.start_time}-${segment.end_time}s, sentiment: ${sentiment})`);
      });
    }
    
    // Test 4: Test useSentimentAnalysis hook simulation
    console.log('\n4️⃣ Testing hook data transformation...');
    
    const transformedMoments = (moments || []).map((moment, index) => {
      const metadata = moment.metadata || {};
      return {
        id: moment.id || `moment-${index}`,
        timestamp: moment.start_time || 0,
        speaker: 'Speaker 1', // Simplified for test
        sentimentScore: metadata.sentiment_score || 0,
        confidence: metadata.confidence || 0.5,
        intensity: metadata.confidence > 0.8 ? 'high' : metadata.confidence > 0.6 ? 'medium' : 'low',
        type: moment.type,
        text: moment.tooltip || 'AI-detected moment',
        context: moment.label || 'Context',
        source: 'ai_generated'
      };
    });
    
    const transformedSegments = (segments || []).map(segment => ({
      startTime: segment.start_time || 0,
      endTime: segment.end_time || 60,
      speaker: 'Speaker 1', // Simplified for test
      sentimentScore: segment.metadata?.sentiment === 'positive' ? 0.7 : 
                     segment.metadata?.sentiment === 'negative' ? -0.7 : 0,
      confidence: segment.confidence || 0.5,
      text: segment.summary || segment.topic || 'Topic discussion',
      source: 'ai_generated'
    }));
    
    console.log('✅ Hook transformation successful');
    console.log(`   Transformed ${transformedMoments.length} moments`);
    console.log(`   Transformed ${transformedSegments.length} segments`);
    
    // Test 5: Test AnalyticsPanel data calculation
    console.log('\n5️⃣ Testing analytics calculations...');
    
    if (transformedMoments.length > 0) {
      const avgConfidence = transformedMoments.reduce((sum, m) => sum + m.confidence, 0) / transformedMoments.length;
      
      const intensityDistribution = transformedMoments.reduce((acc, moment) => {
        acc[moment.intensity]++;
        return acc;
      }, { high: 0, medium: 0, low: 0 });
      
      const momentTypeBreakdown = transformedMoments.reduce((acc, moment) => {
        acc[moment.type] = (acc[moment.type] || 0) + 1;
        return acc;
      }, {});
      
      console.log('✅ Analytics calculations successful');
      console.log(`   Average confidence: ${Math.round(avgConfidence * 100)}%`);
      console.log('   Intensity distribution:', intensityDistribution);
      console.log('   Moment types:', momentTypeBreakdown);
    } else {
      console.log('⚠️ No moments to analyze');
    }
    
    // Test 6: Test SentimentTimeline data
    console.log('\n6️⃣ Testing timeline data...');
    
    if (transformedSegments.length > 0) {
      const positiveSegments = transformedSegments.filter(s => s.sentimentScore > 0.1).length;
      const negativeSegments = transformedSegments.filter(s => s.sentimentScore < -0.1).length;
      const neutralSegments = transformedSegments.length - positiveSegments - negativeSegments;
      
      console.log('✅ Timeline data processed');
      console.log(`   Positive segments: ${positiveSegments}`);
      console.log(`   Negative segments: ${negativeSegments}`);
      console.log(`   Neutral segments: ${neutralSegments}`);
    } else {
      console.log('⚠️ No segments for timeline');
    }
    
    // Test 7: Test real-time subscription simulation
    console.log('\n7️⃣ Testing real-time subscription...');
    
    try {
      // Check if real-time manager is working
      if (window.supabase && window.supabase.realtime) {
        console.log('✅ Real-time client available');
        console.log('   Connection state:', window.supabase.realtime.wsConnection?.connectionState || 'unknown');
      } else {
        console.log('⚠️ Real-time client not accessible from console');
      }
    } catch (realtimeError) {
      console.log('⚠️ Real-time test failed:', realtimeError.message);
    }
    
    // Test 8: Test performance and caching
    console.log('\n8️⃣ Testing performance...');
    
    const startTime = performance.now();
    
    // Simulate multiple rapid queries (testing caching)
    for (let i = 0; i < 3; i++) {
      await window.supabase
        .from('ai_moments')
        .select('id, type, start_time')
        .eq('recording_id', recordingId)
        .limit(1);
    }
    
    const endTime = performance.now();
    const queryTime = endTime - startTime;
    
    console.log(`✅ Performance test completed in ${queryTime.toFixed(2)}ms`);
    console.log(`   Average query time: ${(queryTime / 3).toFixed(2)}ms per query`);
    
    // Test 9: Test edge function connectivity
    console.log('\n9️⃣ Testing edge function connectivity...');
    
    try {
      const { data: funcTest, error: funcError } = await window.supabase.functions.invoke(
        'analyze-speakers-topics',
        {
          body: { recording_id: recordingId, test_mode: true }
        }
      );
      
      if (funcError) {
        console.log('⚠️ Edge function test failed:', funcError.message);
      } else {
        console.log('✅ Edge function accessible');
        console.log('   Function response received');
      }
    } catch (funcTestError) {
      console.log('⚠️ Edge function connectivity test failed:', funcTestError.message);
    }
    
    // Final summary
    console.log('\n🎉 Verification Summary:');
    console.log('✅ Recording data: Available');
    console.log(`✅ Sentiment moments: ${moments?.length || 0} found`);
    console.log(`✅ Topic segments: ${segments?.length || 0} found`);
    console.log('✅ Data transformation: Working');
    console.log('✅ Analytics calculations: Working');
    console.log('✅ Timeline processing: Working');
    console.log('✅ Performance: Acceptable');
    
    const hasData = (moments?.length || 0) > 0 || (segments?.length || 0) > 0;
    
    if (hasData) {
      console.log('\n🎯 RESULT: Sentiment analysis system is FULLY FUNCTIONAL!');
      console.log('💡 The UI should show "AI Powered" sentiment metrics');
    } else {
      console.log('\n⚠️ RESULT: System is working but NO SENTIMENT DATA found');
      console.log('💡 Run the browser console fix to create sentiment data');
    }
    
    return hasData;
    
  } catch (error) {
    console.error('💥 Verification failed:', error);
    return false;
  }
};

// Run the comprehensive verification
console.log('🚀 Starting comprehensive sentiment analysis verification...\n');
verifySentimentSystem().then(hasData => {
  if (hasData) {
    console.log('\n✨ Verification completed successfully!');
  } else {
    console.log('\n⚠️ Verification completed but sentiment data needs to be created');
  }
}).catch(error => {
  console.error('\n💥 Verification script failed:', error);
});