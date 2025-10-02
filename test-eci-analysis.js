// Test ECI Analysis Implementation
// This script tests the ECI support analysis with a sample transcript

const testRecording = {
  recording_id: 'test-recording-001',
  transcript: `
Agent: Hello, this is Sarah from TechSupport Solutions. Thank you for calling. How can I help you today?

Customer: Hi Sarah. I'm having trouble with my account login. It keeps saying my password is wrong, but I know it's correct.

Agent: I understand how frustrating that must be. Let me help you get this resolved right away. Can I start by getting your account email address so I can look up your account?

Customer: Sure, it's john.smith@example.com

Agent: Perfect, thank you John. I can see your account here. Let me check the login history... I can see there have been several failed login attempts in the past hour. This sometimes happens when there's a browser cache issue or if caps lock is accidentally on. Let me walk you through a couple of quick steps to resolve this.

Customer: Okay, that sounds good.

Agent: First, let's try clearing your browser cache and cookies for our website. Are you using Chrome, Firefox, or another browser?

Customer: I'm using Chrome.

Agent: Great. In Chrome, you can press Ctrl+Shift+Delete to open the clear browsing data window. Can you do that for me?

Customer: Okay, I see the window.

Agent: Perfect. Make sure "Cookies and other site data" and "Cached images and files" are selected, then click "Clear data". This will remove any stored login information that might be causing conflicts.

Customer: Done. Should I try logging in now?

Agent: Yes, please try logging in now. Make sure caps lock is off and enter your password carefully.

Customer: Oh wow, it worked! I'm in now. Thank you so much!

Agent: That's wonderful! I'm so glad we got that resolved for you. Is there anything else I can help you with today?

Customer: No, that's all. You were very helpful.

Agent: Perfect! Just to summarize what we did today - we cleared your browser cache and cookies which resolved the login issue. If this happens again in the future, you can try the same steps, or feel free to call us back and we'll be happy to help. Have a great day, John!

Customer: Thank you, Sarah. You too!
  `,
  duration: 420, // 7 minutes in seconds
  whisper_segments: [
    { start: 0, end: 8, text: "Hello, this is Sarah from TechSupport Solutions. Thank you for calling. How can I help you today?" },
    { start: 8, end: 15, text: "Hi Sarah. I'm having trouble with my account login. It keeps saying my password is wrong, but I know it's correct." },
    { start: 15, end: 25, text: "I understand how frustrating that must be. Let me help you get this resolved right away. Can I start by getting your account email address so I can look up your account?" }
    // ... more segments would be here in real scenario
  ]
};

console.log('🧪 ECI Analysis Test Data:');
console.log('Recording ID:', testRecording.recording_id);
console.log('Transcript Length:', testRecording.transcript.length);
console.log('Duration:', testRecording.duration, 'seconds');
console.log('Whisper Segments:', testRecording.whisper_segments.length);

console.log('\n📊 Expected ECI Behavior Analysis:');
console.log('- Extreme Ownership: YES (proactively helped, took ownership)');
console.log('- Active Listening: YES (acknowledged frustration, paraphrased)');
console.log('- Empathy: YES (validated customer frustration)');
console.log('- Tone & Pace: YES (professional, reassuring tone)');
console.log('- Professionalism: YES (courteous, respectful)');
console.log('- Customer Connection: YES (used customer name, built rapport)');
console.log('- Proper Procedures: YES (followed account lookup process)');
console.log('- Accurate Information: YES (provided correct troubleshooting)');
console.log('- Opening: YES (proper greeting, company branding)');
console.log('- Hold/Transfer: UNCERTAIN (no hold/transfer occurred)');
console.log('- Closing: YES (summarized resolution, offered additional help)');
console.log('- Documentation: UNCERTAIN (not evident in transcript)');

console.log('\n🎯 Manager Review Required: YES (2 UNCERTAIN behaviors)');
console.log('📈 Expected ECI Score: ~85% (10 YES, 0 NO, 2 UNCERTAIN)');
console.log('⚠️ Escalation Risk: LOW (no negative behaviors, good resolution)');

// Test data that should trigger different ratings
const challengingTestRecording = {
  recording_id: 'test-recording-002',
  transcript: `
Agent: Hello?

Customer: Hi, I need help with my billing. I was charged twice this month.

Agent: Okay, what's your account number?

Customer: I don't have it with me right now.

Agent: Well, I can't help you without the account number. You'll need to call back when you have it.

Customer: Can't you look it up by my phone number or email?

Agent: No, we need the account number. That's our policy.

Customer: This is ridiculous. I'm a paying customer and you won't even try to help me.

Agent: Look, I'm just following the rules. If you don't have your account number, there's nothing I can do.

Customer: Fine, I'll take my business elsewhere.

Agent: Okay. Goodbye.
  `,
  duration: 180, // 3 minutes
  whisper_segments: []
};

console.log('\n🧪 Challenging Test Case:');
console.log('- Expected mostly NO ratings for customer care behaviors');
console.log('- Should trigger HIGH escalation risk');
console.log('- Manager review required for poor service quality');
console.log('- Low ECI score (~20-30%)');

module.exports = { testRecording, challengingTestRecording };