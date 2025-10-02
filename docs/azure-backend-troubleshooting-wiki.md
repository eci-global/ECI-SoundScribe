# Azure Backend Troubleshooting Wiki

## Overview
This wiki documents common Azure App Service backend issues for the SoundScribe project and their solutions. Keep this as the single source of truth for Azure backend troubleshooting.

---

## Issue #1: Database Update Failed - Invalid API Key

### Symptoms
- ✅ Whisper API transcription works correctly
- ✅ AI Processing (GPT-4o-mini) generates summaries successfully
- ❌ Database storage fails with error: `Database update failed: Invalid API key`
- Server logs show: `❌ Database update failed: Invalid API key`

### Root Cause
The Supabase service role key in Azure App Service environment variables has expired or become invalid.

### Solution Steps

#### 1. Get Fresh Supabase Service Role Key
1. Go to Supabase Dashboard: https://app.supabase.com/project/qinkldgvejheppheykfl
2. Navigate to **Settings → API**
3. Copy the **service_role** key (NOT the anon key)

#### 2. Update Azure App Service Configuration
```bash
az webapp config appsettings set \
  --resource-group soundscribe-rg \
  --name soundscribe-backend \
  --settings SUPABASE_SERVICE_ROLE_KEY="[NEW_SERVICE_ROLE_KEY]"
```

#### 3. Restart Azure App Service
```bash
az webapp restart --name soundscribe-backend --resource-group soundscribe-rg
```

#### 4. Verify Fix
- Wait 1-2 minutes for service restart
- Upload test audio file
- Verify complete workflow: transcription + AI analysis + database storage

### Prevention
- Supabase service role keys don't typically expire, but may become invalid if:
  - Project settings are modified
  - Security policies are updated
  - Key is manually regenerated in Supabase dashboard

---

## Issue #2: Rate Limiting Errors

### Symptoms
- 429 rate limit errors from Azure OpenAI
- Slow processing or timeouts

### Current Configuration
- **Azure OpenAI Resource**: East US region
- **gpt-4o-mini**: Global Standard deployment (551,000 TPM)
- **whisper-1**: Standard deployment for transcription

### Solution
Ensure using Global Standard deployments with high quotas:
```bash
az webapp config appsettings set \
  --resource-group soundscribe-rg \
  --name soundscribe-backend \
  --settings AZURE_OPENAI_GPT4O_MINI_DEPLOYMENT="gpt-4o-mini"
```

---

## Environment Variables Reference

### Required Azure OpenAI Settings
```bash
AZURE_OPENAI_ENDPOINT="https://eastus.api.cognitive.microsoft.com/"
AZURE_OPENAI_API_KEY="[your-api-key]"
AZURE_OPENAI_API_VERSION="2024-10-01-preview"
AZURE_OPENAI_GPT4O_MINI_DEPLOYMENT="gpt-4o-mini"
AZURE_OPENAI_WHISPER_ENDPOINT="https://soundscribe-whisper-norway.openai.azure.com/"
AZURE_OPENAI_WHISPER_API_KEY="[your-whisper-key]"
AZURE_OPENAI_WHISPER_DEPLOYMENT="whisper-1"
```

### Required Supabase Settings
```bash
SUPABASE_URL="https://qinkldgvejheppheykfl.supabase.co"
SUPABASE_SERVICE_ROLE_KEY="[current-service-role-key]"
NODE_ENV="production"
```

---

## Diagnostic Commands

### Check Current Environment Variables
```bash
# Check Supabase settings
az webapp config appsettings list \
  --name soundscribe-backend \
  --resource-group soundscribe-rg \
  --query "[?contains(name, 'SUPABASE')].{name:name,value:value}" \
  --output table

# Check Azure OpenAI settings
az webapp config appsettings list \
  --name soundscribe-backend \
  --resource-group soundscribe-rg \
  --query "[?contains(name, 'AZURE_OPENAI')].{name:name,value:value}" \
  --output table
```

### Test Backend Health
```bash
# Check if backend is responding
curl https://soundscribe-backend.azurewebsites.net/health

# Check backend logs (if Azure CLI is configured)
az webapp log tail --name soundscribe-backend --resource-group soundscribe-rg
```

---

## Common Workflow

When encountering backend issues:

1. **Identify the failure point**:
   - ✅ Transcription working?
   - ✅ AI processing working?
   - ✅ Database storage working?

2. **Check environment variables** using diagnostic commands above

3. **Apply specific solution** based on error type

4. **Restart service** after configuration changes

5. **Test end-to-end** with actual audio upload

---

## Architecture Notes

The backend has two Supabase client initializations:
- `server.js` - Main server initialization
- `supabase.js` - Helper functions initialization

Both must use the same `SUPABASE_SERVICE_ROLE_KEY` environment variable.

---

## Last Updated
Date: 2025-01-30
Version: 1.0
Status: ✅ Verified working solution

**Note**: Keep this as the single source of truth for Azure backend issues. Delete any other conflicting documentation files to avoid confusion.