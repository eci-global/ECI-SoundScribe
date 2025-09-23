#!/usr/bin/env node

/**
 * Environment Check Script for Echo AI Scribe
 * 
 * This script helps diagnose common configuration issues that can cause
 * the Analytics Panel to fail with "Edge Function returned a non-2xx status code"
 */

console.log('🔍 Echo AI Scribe - Environment Configuration Check\n');

// Check if we have access to environment variables
const envVars = {
  // Frontend variables (VITE_*)
  'VITE_SUPABASE_URL': process.env.VITE_SUPABASE_URL,
  'VITE_SUPABASE_ANON_KEY': process.env.VITE_SUPABASE_ANON_KEY,
  
  // Backend variables (for edge functions) - these won't be accessible from frontend
  'SUPABASE_SERVICE_ROLE_KEY': process.env.SUPABASE_SERVICE_ROLE_KEY,
  'AZURE_OPENAI_ENDPOINT': process.env.AZURE_OPENAI_ENDPOINT,
  'AZURE_OPENAI_API_KEY': process.env.AZURE_OPENAI_API_KEY,
  'AZURE_OPENAI_API_VERSION': process.env.AZURE_OPENAI_API_VERSION,
  'AZURE_OPENAI_GPT4O_MINI_DEPLOYMENT': process.env.AZURE_OPENAI_GPT4O_MINI_DEPLOYMENT,
  'AZURE_OPENAI_WHISPER_DEPLOYMENT': process.env.AZURE_OPENAI_WHISPER_DEPLOYMENT,
};

// Environment configuration requirements
const requirements = {
  frontend: [
    'VITE_SUPABASE_URL',
    'VITE_SUPABASE_ANON_KEY'
  ],
  edgeFunctions: [
    'SUPABASE_SERVICE_ROLE_KEY',
    'AZURE_OPENAI_ENDPOINT', 
    'AZURE_OPENAI_API_KEY',
    'AZURE_OPENAI_API_VERSION',
    'AZURE_OPENAI_GPT4O_MINI_DEPLOYMENT'
  ],
  optional: [
    'AZURE_OPENAI_WHISPER_DEPLOYMENT'
  ]
};

console.log('📋 Environment Variable Check:');
console.log('=' .repeat(50));

let allGood = true;
let frontendGood = true;
let edgeFunctionGood = true;

// Check frontend variables
console.log('\n🌐 Frontend Configuration:');
requirements.frontend.forEach(varName => {
  const value = envVars[varName];
  const status = value ? '✅ SET' : '❌ MISSING';
  console.log(`  ${varName.padEnd(30)} ${status}`);
  if (!value) {
    frontendGood = false;
    allGood = false;
  }
});

// Check edge function variables (these might not be accessible from this script)
console.log('\n🔧 Edge Function Configuration:');
console.log('(Note: These variables are set in Supabase Dashboard, not locally)');
requirements.edgeFunctions.forEach(varName => {
  const value = envVars[varName];
  const status = value ? '✅ SET' : '⚠️  NOT ACCESSIBLE';
  console.log(`  ${varName.padEnd(35)} ${status}`);
  if (!value) {
    edgeFunctionGood = false;
  }
});

// Check optional variables
console.log('\n📦 Optional Configuration:');
requirements.optional.forEach(varName => {
  const value = envVars[varName];
  const status = value ? '✅ SET' : '⚪ NOT SET';
  console.log(`  ${varName.padEnd(35)} ${status}`);
});

// Summary and recommendations
console.log('\n📊 Summary:');
console.log('=' .repeat(50));

if (frontendGood) {
  console.log('✅ Frontend configuration looks good');
} else {
  console.log('❌ Frontend configuration has issues');
  console.log('   → Check your .env or .env.local file');
  console.log('   → Copy .env.example to .env and fill in values');
}

if (!edgeFunctionGood) {
  console.log('⚠️  Edge function configuration cannot be verified from local environment');
  console.log('   → This is expected - edge function variables are set in Supabase Dashboard');
}

console.log('\n🔧 How to Fix Analytics Panel Issues:');
console.log('=' .repeat(50));

console.log('\n1. Local Development (.env file):');
console.log('   • Copy .env.example to .env');
console.log('   • Set VITE_SUPABASE_URL and VITE_SUPABASE_ANON_KEY');
console.log('   • These come from your Supabase project dashboard');

console.log('\n2. Edge Function Configuration (Supabase Dashboard):');
console.log('   • Go to Supabase Dashboard → Your Project → Settings → Edge Functions');
console.log('   • Set these environment variables:');
console.log('     - AZURE_OPENAI_ENDPOINT');
console.log('     - AZURE_OPENAI_API_KEY');
console.log('     - AZURE_OPENAI_API_VERSION (usually "2024-10-01-preview")');
console.log('     - AZURE_OPENAI_GPT4O_MINI_DEPLOYMENT (usually "gpt-4o-mini")');
console.log('     - SUPABASE_SERVICE_ROLE_KEY (from your Supabase settings)');

console.log('\n3. Azure OpenAI Setup:');
console.log('   • Create Azure OpenAI resource in Azure Portal');
console.log('   • Deploy gpt-4o-mini model'); 
console.log('   • Copy endpoint URL and API key to Supabase');
console.log('   • Ensure quota is sufficient (recommend Global Standard deployment)');

console.log('\n4. Testing:');
console.log('   • Use the Debug Panel in Analytics when errors occur');
console.log('   • Check browser console for detailed error messages');
console.log('   • Run diagnostics in the Analytics Panel when issues arise');

if (!frontendGood || !edgeFunctionGood) {
  console.log('\n❗ Next Steps:');
  if (!frontendGood) {
    console.log('   1. Fix frontend environment variables first');
  }
  console.log('   2. Configure Azure OpenAI in Supabase Dashboard → Settings → Edge Functions');
  console.log('   3. Test using the Analytics Debug Panel');
  console.log('   4. Contact support if issues persist after proper configuration');
  
  process.exit(1);
} else {
  console.log('\n🎉 Configuration looks good!');
  console.log('   If you\'re still having issues, use the Analytics Debug Panel for further diagnosis.');
  process.exit(0);
}