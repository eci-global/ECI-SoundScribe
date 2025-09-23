# Azure App Service Deployment Guide

## Environment Variables Required

Configure these environment variables in Azure App Service Configuration:

### Required Azure OpenAI Configuration
```
AZURE_OPENAI_ENDPOINT=https://your-openai-resource.openai.azure.com/
AZURE_OPENAI_API_KEY=your-api-key-here
AZURE_OPENAI_API_VERSION=2024-10-01-preview
AZURE_OPENAI_GPT4O_MINI_DEPLOYMENT=gpt-4o-mini
AZURE_OPENAI_WHISPER_DEPLOYMENT=whisper-1
```

### Required Supabase Configuration
```
SUPABASE_URL=https://your-project.supabase.co
SUPABASE_SERVICE_ROLE_KEY=your-service-role-key-here
```

### Optional Performance Configuration
```
NODE_ENV=production
WORKER_CONCURRENCY=3
ENABLE_PARALLEL_PROCESSING=true
WORKER_POOL_SIZE=4
```

## Deployment Steps

1. Create Azure App Service:
   ```bash
   az webapp create --resource-group your-rg --plan your-plan --name soundscribe-backend --runtime "node|18-lts"
   ```

2. Configure environment variables:
   ```bash
   az webapp config appsettings set --resource-group your-rg --name soundscribe-backend --settings @azure-env.json
   ```

3. Deploy code:
   ```bash
   git remote add azure https://soundscribe-backend.scm.azurewebsites.net:443/soundscribe-backend.git
   git push azure main
   ```

## Current Status
- ✅ Redis dependency removed 
- ✅ Immediate processing mode implemented
- ✅ All endpoints updated for Redis-free operation
- ⏳ Environment variables need configuration
- ⏳ Initial deployment and testing needed

## Testing the Deployment

Test the backend with:
```bash
curl https://soundscribe-backend.azurewebsites.net/health
```

Process a recording:
```bash
curl -X POST https://soundscribe-backend.azurewebsites.net/api/process-recording \
  -H "Content-Type: application/json" \
  -d '{"recording_id": "test-recording-id"}'
```