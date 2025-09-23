/**
 * AI Control Center Diagnostics
 *
 * Run these functions in the browser console to diagnose authentication issues
 */

import { supabase } from '@/integrations/supabase/client';

export async function diagnoseAIControlCenter() {
  console.log('🔍 AI Control Center Diagnostics Starting...');
  console.log('=========================================');

  // Test 1: Check current session
  console.log('1️⃣ Checking current session...');
  try {
    const { data: { session }, error } = await supabase.auth.getSession();
    if (error) {
      console.error('❌ Session error:', error);
      return;
    }

    if (session) {
      console.log('✅ Logged in as:', session.user.email);
      console.log('User ID:', session.user.id);
      console.log('Token expires at:', new Date(session.expires_at * 1000));
    } else {
      console.log('❌ No active session - please log in');
      return;
    }
  } catch (error) {
    console.error('❌ Session check failed:', error);
    return;
  }

  // Test 2: Test Edge Function authentication
  console.log('\n2️⃣ Testing AI Scoring Rubrics function...');
  try {
    const { data, error } = await supabase.functions.invoke('ai-scoring-rubrics/stats');

    if (error) {
      console.error('❌ Edge Function error:', error);
      console.log('Error type:', typeof error);
      console.log('Error message:', error.message);
      console.log('Full error object:', error);
    } else {
      console.log('✅ Edge Function success:', data);
    }
  } catch (error) {
    console.error('❌ Edge Function exception:', error);
  }

  // Test 3: Test admin validation via RPC
  console.log('\n3️⃣ Testing admin validation...');
  try {
    const { data, error } = await supabase.rpc('is_admin_user', {
      _user_id: (await supabase.auth.getSession()).data.session?.user.id
    });

    if (error) {
      console.error('❌ Admin check error:', error);
    } else {
      console.log(data ? '✅ User is admin' : '❌ User is not admin');
    }
  } catch (error) {
    console.error('❌ Admin check exception:', error);
  }

  // Test 4: Check user roles directly
  console.log('\n4️⃣ Checking user roles in database...');
  try {
    const { data: { session } } = await supabase.auth.getSession();
    if (session) {
      const { data, error } = await supabase
        .from('user_roles')
        .select('role')
        .eq('user_id', session.user.id);

      if (error) {
        console.error('❌ User roles query error:', error);
      } else {
        console.log('👤 User roles:', data);
      }
    }
  } catch (error) {
    console.error('❌ User roles check failed:', error);
  }

  console.log('\n=========================================');
  console.log('🔍 Diagnostics Complete');
}

// Make it available globally for console use
if (typeof window !== 'undefined') {
  (window as any).diagnoseAIControlCenter = diagnoseAIControlCenter;
}

export default diagnoseAIControlCenter;