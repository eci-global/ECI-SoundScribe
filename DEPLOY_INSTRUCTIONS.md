# Deploy Updated Edge Function

## Files Modified
- `supabase/functions/analyze-speakers-topics/index.ts` - Enhanced JSON parsing and error handling

## Deployment Instructions

### Option 1: Supabase CLI (Recommended)
```bash
# Login to Supabase
supabase login

# Deploy the updated function
supabase functions deploy analyze-speakers-topics

# Verify deployment
supabase functions list
```

### Option 2: Manual Deployment via Supabase Dashboard
1. Go to your Supabase project dashboard
2. Navigate to Edge Functions
3. Find `analyze-speakers-topics` function
4. Update the function code with the enhanced version
5. Deploy the changes

## Testing the Deployment
```javascript
// Test the updated function in browser console
const testFunction = async () => {
  const { data, error } = await window.supabase.functions.invoke('analyze-speakers-topics', {
    body: { 
      recording_id: '8c51c733-d824-46de-8647-b035bb021779',
      force_reprocess: true 
    }
  });
  
  console.log('Function result:', data);
  if (data && data.topics_count > 0) {
    console.log('✅ JSON parsing fix successful!');
  }
};

testFunction();
```