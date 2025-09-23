# 🔧 Azure Backend Configuration Guide

This guide will help you properly configure the Azure backend to update recording status in Supabase.

## 📋 Prerequisites

You'll need:
1. Access to Azure Portal (https://portal.azure.com)
2. Your Supabase service role key
3. Azure OpenAI credentials

## 🔑 Step 1: Get Your Supabase Service Role Key

1. Go to your Supabase project: https://supabase.com/dashboard/project/qinkldgvejheppheykfl
2. Navigate to **Settings** → **API**
3. Copy the **service_role** secret key (starts with `eyJ...`)
   - ⚠️ **IMPORTANT**: This key has full access to your database. Keep it secure!

## 🌐 Step 2: Configure Azure App Service Environment Variables

1. Go to Azure Portal: https://portal.azure.com
2. Navigate to your App Service: **soundscribe-backend**
3. Go to **Configuration** → **Application settings**
4. Add/Update these environment variables:

```bash
# Supabase Configuration (REQUIRED)
SUPABASE_URL=https://qinkldgvejheppheykfl.supabase.co
SUPABASE_SERVICE_ROLE_KEY=<your-service-role-key-from-step-1>

# Azure OpenAI Configuration (Should already exist)
AZURE_OPENAI_ENDPOINT=https://eastus.api.cognitive.microsoft.com/
AZURE_OPENAI_API_KEY=<your-azure-openai-key>
AZURE_OPENAI_API_VERSION=2024-10-01-preview
AZURE_OPENAI_GPT4O_MINI_DEPLOYMENT=gpt-4o-mini
AZURE_OPENAI_WHISPER_DEPLOYMENT=whisper-1

# Worker Configuration (Optional but recommended)
WORKER_CONCURRENCY=2
PROCESSING_TIMEOUT=3600000
NODE_ENV=production
```

5. Click **Save** at the top
6. Click **Continue** when prompted to restart the app

## 🔄 Step 3: Verify Configuration

After the app restarts (takes ~1-2 minutes), check the logs:

1. In Azure Portal, go to **Log stream** under Monitoring
2. You should see:
   ```
   ✅ Azure OpenAI credentials configured
   ✅ Supabase credentials configured
   ```

## 🧪 Step 4: Test the Configuration

Run this test to verify everything is working:

```bash
node test-azure-backend-status.js
```

This will:
- Check if Azure backend can connect to Supabase
- Verify it can update recording status
- Test the full processing pipeline

## 🚀 Step 5: Update Frontend Threshold (Optional)

If you want to use Azure backend for large files again:

```typescript
// In src/hooks/useFileOperations.ts
const PRACTICAL_EDGE_FUNCTION_LIMIT = 50 * 1024 * 1024; // 50MB
```

This will route:
- Files < 50MB → Edge Functions (with Supabase logs)
- Files > 50MB → Azure Backend (with status updates)

## 📊 Step 6: Monitor Processing

### In Supabase:
- Check the `recordings` table for status updates
- Look for `processing` → `completed` transitions

### In Azure Portal:
- Go to **Log stream** to see real-time processing logs
- Check **Metrics** for performance data

## 🔍 Troubleshooting

### Files Still Stuck?
1. Check Azure Log Stream for errors
2. Verify service role key is correct
3. Make sure Azure backend was restarted after config changes

### Common Errors:
- `Invalid API key` → Service role key is wrong
- `Network error` → Firewall blocking Supabase access
- `Permission denied` → Using anon key instead of service role

## 🎯 Success Indicators

When properly configured, you'll see:
1. Files transition from `processing` → `completed`
2. Transcripts and AI analysis appear in the database
3. No more stuck recordings
4. Processing logs in Azure Portal

## 🆘 Need Help?

If you're still having issues:
1. Check the Azure App Service logs
2. Verify all environment variables are set correctly
3. Test with a small file first
4. Contact support with the error messages

---

**Last Updated**: 2025-01-07
**Status**: Ready for configuration