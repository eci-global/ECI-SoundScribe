# 📈 Increasing Edge Function Timeout

## 🔍 Current Limits

### Free/Pro Plan Default:
- **Timeout**: 50 seconds
- **Memory**: 256MB
- **Payload**: 6MB request/response

### With Increased Timeout (Pro+ Required):
- **Timeout**: Up to 150 seconds (2.5 minutes)
- **Memory**: Still 256MB
- **Payload**: Still 6MB

## 🚀 How to Increase Timeout

### Step 1: Check Your Plan
1. Go to: https://supabase.com/dashboard/project/qinkldgvejheppheykfl/settings/billing
2. Verify you're on **Pro plan** or higher
3. Free plan does NOT support timeout increases

### Step 2: Request Timeout Increase
1. Go to: https://supabase.com/dashboard/project/qinkldgvejheppheykfl/settings/functions
2. Look for "Edge Function Configuration" section
3. Click "Request Timeout Increase"
4. Or contact Supabase support

### Step 3: Update Function Configuration
Once approved, create a config file:

**File: `supabase/functions/process-recording/config.toml`**
```toml
[function]
timeout = 150  # Maximum 150 seconds on Pro plan
```

### Step 4: Deploy with New Timeout
```bash
npx supabase functions deploy process-recording
```

## ⚠️ Important Considerations

### Even with 150s Timeout:
1. **86.6MB files may still timeout** - Processing large files takes time
2. **Memory limit unchanged** - Still 256MB max
3. **Download time counts** - Fetching file uses timeout budget

### Timeout Breakdown for 86.6MB File:
- File download: ~10-30s (depends on connection)
- Transcription: ~60-120s (Whisper API)
- AI Analysis: ~10-20s
- **Total**: 80-170s (may exceed even 150s limit)

## 🎯 Better Solutions

### 1. Optimize Edge Function (Immediate)
- Stream processing instead of full download
- Skip content hash for large files
- Process in chunks

### 2. Use Azure Backend (Recommended)
- No timeout limits
- Unlimited memory
- Designed for large files

### 3. Hybrid Approach
- Small files (< 20MB): Edge Functions
- Large files (> 20MB): Azure Backend

## 🔧 Quick Optimization

While waiting for timeout increase, optimize the Edge Function:

**Update: `supabase/functions/process-recording/index.ts`**

```typescript
// Skip content hash for large files
if (recording.file_size > 20 * 1024 * 1024) {
  console.log('⚡ Skipping content hash for large file');
  contentHash = null;
}

// Add timeout monitoring
const startTime = Date.now();
const checkTimeout = () => {
  const elapsed = Date.now() - startTime;
  if (elapsed > 45000) { // 45s warning
    console.warn(`⚠️ Approaching timeout: ${elapsed}ms elapsed`);
  }
};
```

## 💰 Cost Implications

### Pro Plan ($25/month):
- Timeout increase available
- Still has limits
- May need additional Edge Function invocations

### Better Value:
- Configure Azure Backend properly
- Use Edge Functions for small files only
- More reliable for large files

## 📝 Next Steps

1. **Immediate**: Check your Supabase plan
2. **If on Pro**: Request timeout increase
3. **If on Free**: Consider upgrading or use Azure Backend
4. **Long-term**: Implement hybrid approach

---

**Note**: Even with 150s timeout, your 86.6MB files might still fail. The Azure Backend remains the most reliable solution for large files.