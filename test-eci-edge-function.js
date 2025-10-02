// Test ECI Edge Function
// This script tests the analyze-support-call Edge Function with sample data

const { testRecording, challengingTestRecording } = require('./test-eci-analysis.js');

async function testECIEdgeFunction(testData, testName) {
  console.log(`\n🧪 Testing ${testName}...`);

  // Use localhost Edge Function if running locally, otherwise use production
  const edgeFunctionUrl = 'http://localhost:54321/functions/v1/analyze-support-call';

  try {
    const response = await fetch(edgeFunctionUrl, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'Authorization': `Bearer ${process.env.SUPABASE_ANON_KEY || 'test-key'}`
      },
      body: JSON.stringify(testData)
    });

    if (!response.ok) {
      const errorText = await response.text();
      console.error(`❌ ${testName} failed with status ${response.status}: ${errorText}`);
      return null;
    }

    const result = await response.json();

    if (result.success) {
      console.log(`✅ ${testName} completed successfully`);

      const analysis = result.analysis;

      // Analyze results
      console.log('\n📊 ECI Analysis Results:');
      console.log('Framework:', analysis.framework);
      console.log('Recording ID:', analysis.recordingId);

      // Count behavior ratings
      const allBehaviors = [
        ...Object.values(analysis.careForCustomer),
        ...Object.values(analysis.callResolution),
        ...Object.values(analysis.callFlow)
      ];

      const yesCount = allBehaviors.filter(b => b.rating === 'YES').length;
      const noCount = allBehaviors.filter(b => b.rating === 'NO').length;
      const uncertainCount = allBehaviors.filter(b => b.rating === 'UNCERTAIN').length;

      console.log(`Behavior Counts: ${yesCount} YES, ${noCount} NO, ${uncertainCount} UNCERTAIN`);
      console.log('Manager Review Required:', analysis.summary.managerReviewRequired);

      // Calculate weighted score (Care 60%, Resolution 30%, Flow 10%)
      const careScores = Object.values(analysis.careForCustomer).map(b =>
        b.rating === 'YES' ? 100 : b.rating === 'NO' ? 0 : 50
      );
      const careAvg = careScores.reduce((sum, score) => sum + score, 0) / careScores.length;

      const resolutionScores = Object.values(analysis.callResolution).map(b =>
        b.rating === 'YES' ? 100 : b.rating === 'NO' ? 0 : 50
      );
      const resolutionAvg = resolutionScores.reduce((sum, score) => sum + score, 0) / resolutionScores.length;

      const flowScores = Object.values(analysis.callFlow).map(b =>
        b.rating === 'YES' ? 100 : b.rating === 'NO' ? 0 : 50
      );
      const flowAvg = flowScores.reduce((sum, score) => sum + score, 0) / flowScores.length;

      const overallScore = (careAvg * 0.6) + (resolutionAvg * 0.3) + (flowAvg * 0.1);
      console.log(`ECI Score: ${Math.round(overallScore)}%`);

      // Check section performance
      console.log('\n📈 Section Performance:');
      console.log(`Care for Customer (60%): ${Math.round(careAvg)}%`);
      console.log(`Call Resolution (30%): ${Math.round(resolutionAvg)}%`);
      console.log(`Call Flow (10%): ${Math.round(flowAvg)}%`);

      // Show strengths and improvements
      if (analysis.summary.strengths?.length > 0) {
        console.log('\n💪 Strengths:');
        analysis.summary.strengths.forEach(strength => console.log(`- ${strength}`));
      }

      if (analysis.summary.improvementAreas?.length > 0) {
        console.log('\n📋 Improvement Areas:');
        analysis.summary.improvementAreas.forEach(area => console.log(`- ${area}`));
      }

      // Show behaviors that need manager review
      const uncertainBehaviors = [];
      Object.entries(analysis.careForCustomer).forEach(([key, behavior]) => {
        if (behavior.rating === 'UNCERTAIN') {
          uncertainBehaviors.push(`Care: ${key.replace(/([A-Z])/g, ' $1').trim()}`);
        }
      });
      Object.entries(analysis.callResolution).forEach(([key, behavior]) => {
        if (behavior.rating === 'UNCERTAIN') {
          uncertainBehaviors.push(`Resolution: ${key.replace(/([A-Z])/g, ' $1').trim()}`);
        }
      });
      Object.entries(analysis.callFlow).forEach(([key, behavior]) => {
        if (behavior.rating === 'UNCERTAIN') {
          uncertainBehaviors.push(`Flow: ${key.replace(/([A-Z])/g, ' $1').trim()}`);
        }
      });

      if (uncertainBehaviors.length > 0) {
        console.log('\n🔍 Behaviors Needing Manager Review:');
        uncertainBehaviors.forEach(behavior => console.log(`- ${behavior}`));
      }

      // Show evidence examples
      console.log('\n🗣️ Evidence Examples:');
      Object.entries(analysis.careForCustomer).forEach(([key, behavior]) => {
        if (behavior.evidence?.length > 0) {
          console.log(`${key}: "${behavior.evidence[0].quote}" (${behavior.evidence[0].type})`);
        }
      });

      console.log('\n💡 Brief Overall Coaching:', analysis.summary.briefOverallCoaching);

      return analysis;
    } else {
      console.error(`❌ ${testName} analysis failed:`, result.error);
      return null;
    }
  } catch (error) {
    console.error(`❌ ${testName} error:`, error.message);
    return null;
  }
}

// Check if we're running in Node.js environment
if (typeof require !== 'undefined' && require.main === module) {
  console.log('🚀 Starting ECI Edge Function Tests...');
  console.log('Note: Make sure Supabase is running locally with: npx supabase start');

  // Test with good service example
  testECIEdgeFunction(testRecording, 'Good Service Example')
    .then(result => {
      if (result) {
        console.log('\n✅ Good service test completed - analyze results above');

        // Test with poor service example
        return testECIEdgeFunction(challengingTestRecording, 'Poor Service Example');
      }
    })
    .then(result => {
      if (result) {
        console.log('\n✅ Poor service test completed - analyze results above');
      }

      console.log('\n🔧 UNCERTAIN Threshold Analysis:');
      console.log('- Behaviors should be marked UNCERTAIN when evidence is ambiguous');
      console.log('- Manager review should trigger with 1+ UNCERTAIN behaviors');
      console.log('- Current threshold appears appropriate for testing');

      console.log('\n📋 Next Steps:');
      console.log('1. Review confidence scores for UNCERTAIN behaviors');
      console.log('2. Ensure timestamped evidence is accurate');
      console.log('3. Validate manager review trigger conditions');
      console.log('4. Test with real recordings for production readiness');
    })
    .catch(error => {
      console.error('❌ Test execution failed:', error);
    });
}

module.exports = { testECIEdgeFunction };