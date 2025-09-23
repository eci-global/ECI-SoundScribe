# Render Deployment Guide for Echo AI Background Worker

## Prerequisites
- Render account (already created)
- Service created at: https://eci-soundscribe.onrender.com
- GitHub repository connected

## Environment Variables to Add in Render

Copy and paste these environment variables into your Render service settings:

### Supabase Configuration
```
SUPABASE_URL=https://qinkldgvejheppheykfl.supabase.co
SUPABASE_SERVICE_ROLE_KEY=eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6InFpbmtsZGd2ZWpoZXBwaGV5a2ZsIiwicm9sZSI6InNlcnZpY2Vfcm9sZSIsImlhdCI6MTc0OTU5MDQ0NywiZXhwIjoyMDY1MTY2NDQ3fQ.zBsQXXF3LOVIm9kDnxD-dcBk1b-qPP9m8nHJOl8Ldhg
SUPABASE_ANON_KEY=eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6InFpbmtsZGd2ZWpoZXBwaGV5a2ZsIiwicm9sZSI6ImFub24iLCJpYXQiOjE3NDk1OTA0NDcsImV4cCI6MjA2NTE2NjQ0N30.xn9c-6Sr_kEbETzafRrlaWMHgbUIoqifsCQBrqYT7u4
```

### Azure OpenAI Configuration
```
AZURE_OPENAI_ENDPOINT=https://c2466b63ccd49f0b7f59153e160063b2c423cf0f0ce592ce65969ec.azurewebsites.net/openai/deployments/gpt-4o-mini/chat/completions?api-version=2024-08-01-preview
AZURE_OPENAI_API_KEY=740e35939eb2727bf2315444eddb37ec61de401a082f8
AZURE_OPENAI_API_VERSION=2024-10-01-preview
AZURE_OPENAI_GPT4O_MINI_DEPLOYMENT=gpt-4o-mini
AZURE_OPENAI_WHISPER_DEPLOYMENT=whisper
AZURE_OPENAI_WHISPER_ENDPOINT=https://9c2f59a8828bd531c7a471dfdbe3c9ba69aeaf11b25b.azurewebsites.net/openai/deployments/whisper/audio/transcriptions?api-version=2024-06-01
AZURE_OPENAI_WHISPER_API_KEY=2728c5ceef3fbaf9519ff3afe9ac3820de2eb860aebc
```

### Server Configuration
```
PORT=10000
NODE_ENV=production
WORKER_CONCURRENCY=3
```

### Redis Configuration
```
REDIS_URL=redis://red-XXXXX:6379
```
**Note**: You'll need to either:
1. Add Redis from Render addons (if available)
2. Use Redis Cloud free tier and paste the connection string here

### File Processing Configuration
```
MAX_FILE_SIZE_MB=500
CHUNK_SIZE_MB=25
PROCESSING_TIMEOUT_MS=300000
```

### Monitoring & Logging
```
LOG_LEVEL=info
HEALTH_CHECK_INTERVAL=30000
```

### CORS Configuration
```
ALLOWED_ORIGINS=http://localhost:3000,https://preview--echo-ai-scribe-app.lovable.app,https://echo-ai-scribe-app.lovable.app
```

## Steps to Add Environment Variables in Render

1. Go to your Render dashboard
2. Click on your service (eci-soundscribe)
3. Navigate to "Environment" in the left sidebar
4. Click "Add Environment Variable"
5. Add each variable one by one (name and value)
6. Click "Save Changes"
7. Render will automatically redeploy with new variables

## Redis Setup Options

### Option 1: Redis Cloud (Recommended)
1. Sign up at https://redis.com/try-free/
2. Create a free database (30MB)
3. Copy the connection string
4. Update REDIS_URL in Render

### Option 2: Local Development
For local testing, keep:
```
REDIS_URL=redis://localhost:6379
```

## Verify Deployment

1. **Check Health Endpoint**:
   ```
   https://eci-soundscribe.onrender.com/health
   ```

2. **Check Logs**:
   - In Render dashboard → Logs
   - Look for startup messages
   - Verify all services connected

3. **Test Upload**:
   - Upload a file >18MB in your app
   - Monitor logs for processing
   - Check real-time updates

## Troubleshooting

### Common Issues

1. **Service Won't Start**:
   - Check all environment variables are set
   - Verify Redis connection
   - Check logs for specific errors

2. **CORS Errors**:
   - Ensure ALLOWED_ORIGINS includes your frontend URL
   - Check browser console for specific origin

3. **Processing Failures**:
   - Verify Azure OpenAI credentials
   - Check file size limits
   - Monitor Redis queue status

### Debug Commands

From your local machine:
```bash
# Test health endpoint
curl https://eci-soundscribe.onrender.com/health

# Test with recording ID (replace with actual ID)
curl -X POST https://eci-soundscribe.onrender.com/api/process-recording \
  -H "Content-Type: application/json" \
  -d '{"recording_id": "your-recording-id"}'
```

## Next Steps

1. Set up Redis (choose option above)
2. Add all environment variables to Render
3. Monitor deployment logs
4. Test with large file upload
5. Set up monitoring/alerts in Render

## Support

- Check Render logs for detailed error messages
- Ensure all credentials are correctly copied
- Verify your frontend is using the correct URL
- Test incrementally (health → small file → large file)