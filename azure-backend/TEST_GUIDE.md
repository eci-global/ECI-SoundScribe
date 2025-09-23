# Background Worker Testing Guide

## Pre-Deployment Testing (Local)

### 1. Start Redis Locally
```bash
# macOS
brew install redis
brew services start redis

# Ubuntu/WSL
sudo apt update
sudo apt install redis-server
sudo service redis-server start

# Windows (WSL required)
# Use Ubuntu/WSL instructions above
```

### 2. Start Background Worker
```bash
cd background-worker
npm install
npm run dev
```

### 3. Test Health Endpoint
```bash
curl http://localhost:3001/health
```

Expected response:
```json
{
  "status": "healthy",
  "timestamp": "2025-06-25T...",
  "uptime": 10.5,
  "version": "1.0.0",
  "environment": "development"
}
```

## Post-Deployment Testing (Render)

### 1. Verify Health Endpoint
```bash
curl https://eci-soundscribe.onrender.com/health
```

### 2. Test File Upload Flow

#### Small File Test (<18MB)
1. Upload a file under 18MB in your app
2. Check console logs - should say "Edge Functions" route
3. Verify processing completes normally

#### Large File Test (>18MB)
1. Upload a file over 18MB in your app
2. Check console logs - should say "Background Worker" route
3. Monitor real-time progress updates
4. Check Render logs for processing details

### 3. Monitor Queue Status
```bash
curl https://eci-soundscribe.onrender.com/api/queue/stats
```

### 4. Check Recording Status
```bash
curl https://eci-soundscribe.onrender.com/api/recording/YOUR_RECORDING_ID/status
```

## Troubleshooting Commands

### View Render Logs
1. Go to Render dashboard
2. Click on your service
3. Navigate to "Logs" tab
4. Look for:
   - Startup messages
   - Redis connection status
   - Azure OpenAI connection
   - Processing job logs

### Test Direct Processing
```bash
curl -X POST https://eci-soundscribe.onrender.com/api/process-recording \
  -H "Content-Type: application/json" \
  -d '{"recording_id": "test-recording-id"}'
```

### Common Issues & Solutions

1. **"Redis connection failed"**
   - Check REDIS_URL in Render environment
   - Verify Redis service is running
   - Check connection string format

2. **"Azure OpenAI error"**
   - Verify API keys are correct
   - Check endpoint URLs include full path
   - Monitor rate limits

3. **"CORS error in browser"**
   - Ensure frontend URL is in ALLOWED_ORIGINS
   - Check for trailing slashes
   - Verify protocol (http vs https)

4. **"File not found"**
   - Check Supabase storage permissions
   - Verify service role key has access
   - Check file URL format

## Performance Testing

### Load Testing
1. Upload multiple large files simultaneously
2. Monitor:
   - Queue depth (via /api/queue/stats)
   - Processing times in logs
   - Memory usage in Render metrics

### Optimization Checklist
- [ ] Redis connection pooling configured
- [ ] Worker concurrency optimized (default: 3)
- [ ] Timeout settings appropriate
- [ ] Error retry logic working
- [ ] Memory limits sufficient

## Success Criteria

✅ Health endpoint returns 200 OK
✅ Small files process via Edge Functions
✅ Large files route to background worker
✅ Real-time progress updates work
✅ No errors in Render logs
✅ Queue processes jobs successfully
✅ Completed recordings have transcripts and summaries