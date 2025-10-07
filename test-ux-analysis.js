// Test script for UX Analysis functionality
const { UXAnalysisService } = require('./src/services/uxAnalysisService.ts');

async function testUXAnalysis() {
  console.log('🧪 Testing UX Analysis Service...');
  
  // Sample transcript for testing
  const sampleTranscript = `
Interviewer: Hello, thank you for joining us today. Can you tell us about your experience with our product?
Customer: Hi! I've been using your product for about 6 months now. Overall, it's been pretty good, but I've run into some issues.
Interviewer: What kind of issues have you encountered?
Customer: Well, the main problem is that it's quite slow sometimes, especially when I'm trying to upload large files. It can take forever.
Interviewer: I see. How does this impact your daily workflow?
Customer: It really slows me down. I often have to wait during my busiest times, which is frustrating. I've had to find workarounds.
Interviewer: What workarounds have you tried?
Customer: I usually try to upload files during off-peak hours, but that's not always possible. Sometimes I use a different tool entirely.
Interviewer: That's helpful feedback. Is there anything else about the product that you'd like to see improved?
Customer: Yes, the user interface could be more intuitive. It took me a while to figure out where everything was located.
Interviewer: Thank you for that feedback. Any final thoughts?
Customer: Overall, I think it's a solid product, but these performance and usability issues are holding it back from being great.
  `;

  try {
    // Test instant analysis generation
    console.log('📊 Generating instant UX analysis...');
    const analysis = await UXAnalysisService.generateInstantUXAnalysis(sampleTranscript, 'test-recording-123');
    
    console.log('✅ Analysis generated successfully!');
    console.log('📋 Summary:', analysis.comprehensive_summary);
    console.log('👥 Employees identified:', analysis.employee_identification.identified_employees.length);
    console.log('❓ Questions extracted:', analysis.question_analysis.questions.length);
    console.log('💡 Solutions recommended:', analysis.solution_recommendations.length);
    console.log('📈 Overall sentiment:', analysis.call_breakdown.overall_sentiment);
    
    // Display some sample data
    if (analysis.question_analysis.questions.length > 0) {
      console.log('\n🔍 Sample Question:');
      const sampleQuestion = analysis.question_analysis.questions[0];
      console.log(`  "${sampleQuestion.question_text}"`);
      console.log(`  Type: ${sampleQuestion.question_type}`);
      console.log(`  Effectiveness: ${(sampleQuestion.effectiveness_score * 100).toFixed(0)}%`);
    }
    
    if (analysis.solution_recommendations.length > 0) {
      console.log('\n💡 Sample Solution:');
      const sampleSolution = analysis.solution_recommendations[0];
      console.log(`  ${sampleSolution.recommended_solution}`);
      console.log(`  Priority: ${sampleSolution.priority}`);
      console.log(`  Type: ${sampleSolution.solution_type}`);
    }
    
    console.log('\n🎉 UX Analysis test completed successfully!');
    
  } catch (error) {
    console.error('❌ Test failed:', error);
  }
}

// Run the test
testUXAnalysis();
