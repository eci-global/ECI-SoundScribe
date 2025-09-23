# 🚨 Supabase 413 Upload Error - Complete Fix Guide

## Problem
You're getting "413 Payload too large" errors when uploading files >50MB to Supabase Storage, even after updating the bucket configuration.

## Root Causes
1. **Supabase Free Tier Limitation**: The free tier has a hard limit on file uploads
2. **Global Project Settings**: There may be project-level limits that override bucket settings
3. **API Gateway/CDN Limits**: Supabase's infrastructure may have additional limits

## Solutions

### Option 1: Check Supabase Project Tier (Most Likely Issue)
1. Go to: https://supabase.com/dashboard/project/qinkldgvejheppheykfl/settings/billing
2. Check your current plan - Free tier has stricter limits
3. Consider upgrading to Pro ($25/month) which supports:
   - 5GB file upload limit
   - 100GB storage
   - No request size restrictions

### Option 2: Use Resumable Uploads (Workaround for Large Files)
Instead of direct upload, use Supabase's resumable upload feature:

```javascript
// In useStorageOperations.ts, replace the upload method:
const { data, error } = await supabase.storage
  .from('recordings')
  .upload(fullPath, file, {
    cacheControl: '3600',
    upsert: false,
    // Add this for large files:
    duplex: 'half',
  });
```

### Option 3: Chunk Upload Implementation
For files >50MB, implement chunked uploads:

1. Split the file into 25MB chunks
2. Upload each chunk separately
3. Reassemble on the server

### Option 4: Use Direct S3 Upload (If Available)
If you have access to the underlying S3 bucket:
1. Generate presigned URLs
2. Upload directly to S3, bypassing Supabase limits

## Immediate Actions

### 1. Verify Global Settings in Supabase Dashboard
- Go to Storage settings: https://supabase.com/dashboard/project/qinkldgvejheppheykfl/storage/configuration
- Check for any global file size limits
- Look for "Max file upload size" setting

### 2. Check Supabase Logs
- Go to: https://supabase.com/dashboard/project/qinkldgvejheppheykfl/logs/edge-logs
- Look for 413 errors to see the exact limit being hit

### 3. Test with Smaller File
- Try uploading a 40MB file to confirm the exact threshold
- This will help identify if it's exactly 50MB or another limit

## Recommended Solution
**Upgrade to Supabase Pro** - This is the simplest solution that will:
- Increase file upload limit to 5GB
- Remove API request size restrictions
- Provide better performance for large files

## Alternative: Background Worker Upload
Your project already has a background worker. Route large files through it:

```javascript
// In useFileOperations.ts
if (file.size > 50 * 1024 * 1024) {
  // Use background worker endpoint instead
  return await uploadViaBackgroundWorker(file);
}
```

## Contact Supabase Support
If you're on a paid plan and still hitting limits:
- Email: support@supabase.io
- Include your project ref: qinkldgvejheppheykfl
- Request file upload limit increase