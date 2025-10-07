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
    
    // Display enhanced sample data
    if (analysis.question_analysis.questions.length > 0) {
      console.log('\n🔍 Sample Questions:');
      analysis.question_analysis.questions.slice(0, 3).forEach((question, i) => {
        console.log(`  ${i + 1}. "${question.question_text}"`);
        console.log(`     Type: ${question.question_type} | Effectiveness: ${(question.effectiveness_score * 100).toFixed(0)}%`);
      });
    }
    
    if (analysis.solution_recommendations.length > 0) {
      console.log('\n💡 Sample Solutions:');
      analysis.solution_recommendations.slice(0, 3).forEach((solution, i) => {
        console.log(`  ${i + 1}. ${solution.recommended_solution}`);
        console.log(`     Priority: ${solution.priority} | Type: ${solution.solution_type}`);
        console.log(`     Steps: ${solution.implementation_steps.length} implementation steps`);
      });
    }
    
    if (analysis.call_breakdown.sections.length > 0) {
      console.log('\n📋 Call Breakdown:');
      analysis.call_breakdown.sections.forEach((section, i) => {
        console.log(`  ${i + 1}. ${section.title} (${Math.round(section.start_time / 60)}m - ${Math.round(section.end_time / 60)}m)`);
        console.log(`     Key Points: ${section.key_points.length} | Questions: ${section.questions_asked.length}`);
      });
    }
    
    if (analysis.next_steps.length > 0) {
      console.log('\n🎯 Next Steps:');
      analysis.next_steps.slice(0, 3).forEach((step, i) => {
        console.log(`  ${i + 1}. ${step.action}`);
        console.log(`     Owner: ${step.owner} | Priority: ${step.priority}`);
      });
    }
    
    console.log('\n🎉 UX Analysis test completed successfully!');
    
  } catch (error) {
    console.error('❌ Test failed:', error);
  }
}

// Run the test
testUXAnalysis();
