# Azure Backend Developer Quick Reference

## 🚀 Quick Start

### Local Development
```bash
# Install dependencies
npm install

# Start development server
npm start

# Test the backend
curl http://localhost:3001/
```

### Azure Deployment
```bash
# Deploy to Azure
az webapp deployment source config-zip --resource-group soundscribe-rg --name soundscribe-backend --src deployment.zip

# Check deployment status
az webapp log tail --name soundscribe-backend --resource-group soundscribe-rg
```

## 📁 Key Files

| File | Purpose | Key Changes |
|------|---------|-------------|
| `server-with-video-support.js` | Main entry point | Video support, worker pool |
| `processor.js` | Core processing logic | Duration extraction, chunking |
| `utils/audioProcessor.js` | FFmpeg integration | Audio compression, splitting |
| `utils/fileHandler.js` | File operations | Temp file management |
| `utils/azureOpenAI.js` | AI API calls | gpt-4o-transcribe, error handling |

## 🔧 Common Commands

### Check Backend Status
```bash
curl -s https://soundscribe-backend.azurewebsites.net/
```

### Monitor Logs
```bash
# Azure App Service logs
az webapp log tail --name soundscribe-backend --resource-group soundscribe-rg

# Real-time logs
az webapp log stream --name soundscribe-backend --resource-group soundscribe-rg
```

### Update Environment Variables
```bash
az webapp config appsettings set --resource-group soundscribe-rg --name soundscribe-backend --settings AZURE_OPENAI_ENDPOINT="https://your-endpoint.com"
```

### Restart App Service
```bash
az webapp restart --name soundscribe-backend --resource-group soundscribe-rg
```

## 🐛 Troubleshooting

### Common Issues

#### 1. FFmpeg Path Errors
```bash
❌ FFprobe error: spawn [object Object] ENOENT
```
**Fix:** Check `utils/audioProcessor.js` path configuration

#### 2. Large File Processing Fails
```bash
❌ Audio chunk too large: 37713068 bytes (max 25MB for Whisper)
```
**Fix:** Ensure chunking is enabled in `processor.js`

#### 3. Duration Disappears
```bash
⚠️ Duration not showing after processing
```
**Fix:** Check duration extraction logic in `processor.js`

#### 4. Deployment Fails
```bash
❌ Site failed to start within 10 mins
```
**Fix:** Check startup command and dependencies

### Debug Steps

1. **Check Backend Health**
   ```bash
   curl -s https://soundscribe-backend.azurewebsites.net/
   ```

2. **Verify Dependencies**
   ```bash
   # Check if FFmpeg packages are installed
   npm list fluent-ffmpeg ffmpeg-static ffprobe-static
   ```

3. **Test File Processing**
   ```bash
   # Upload a test file and monitor logs
   az webapp log tail --name soundscribe-backend --resource-group soundscribe-rg
   ```

4. **Check Environment Variables**
   ```bash
   az webapp config appsettings list --name soundscribe-backend --resource-group soundscribe-rg
   ```

## 🔄 Development Workflow

### 1. Local Testing
```bash
# Start local server
npm start

# Test with sample file
curl -X POST http://localhost:3001/api/process-audio \
  -H "Content-Type: application/json" \
  -d '{"recording_id":"test","file_url":"test.wav","file_size":1000000}'
```

### 2. Create Deployment Package
```bash
# Exclude unnecessary files
Get-ChildItem -Path . -Exclude node_modules,*.zip,LogFiles,deploy,azure-deploy | Compress-Archive -DestinationPath deployment.zip -Force
```

### 3. Deploy to Azure
```bash
az webapp deployment source config-zip --resource-group soundscribe-rg --name soundscribe-backend --src deployment.zip
```

### 4. Verify Deployment
```bash
# Check health endpoint
curl -s https://soundscribe-backend.azurewebsites.net/

# Monitor startup logs
az webapp log tail --name soundscribe-backend --resource-group soundscribe-rg
```

## 📊 Performance Monitoring

### Key Metrics to Watch

1. **File Processing Time**
   - Small files (<25MB): ~30-60 seconds
   - Large files (>25MB): ~2-5 minutes
   - Video files: +30 seconds for audio extraction

2. **Memory Usage**
   - Normal: 100-200MB
   - Large file processing: 500MB-1GB
   - Peak during compression: 1-2GB

3. **Error Rates**
   - Target: <1% failure rate
   - Monitor: FFmpeg errors, API timeouts, memory issues

### Log Analysis

#### Successful Processing
```
✅ Audio compression completed
✅ Audio splitting completed: 3 chunks created
✅ Transcription completed successfully
✅ Updated recording with AI analysis results
```

#### Common Errors
```
❌ FFprobe error: spawn [object Object] ENOENT
❌ Audio chunk too large: 37713068 bytes
❌ Transcription failed: Audio chunk too large
⚠️ Could not determine audio duration
```

## 🔧 Configuration

### Environment Variables

| Variable | Purpose | Example |
|----------|---------|---------|
| `AZURE_OPENAI_ENDPOINT` | OpenAI API endpoint | `https://your-resource.openai.azure.com` |
| `AZURE_OPENAI_WHISPER_ENDPOINT` | Transcription endpoint | `https://your-resource.openai.azure.com` |
| `AZURE_OPENAI_WHISPER_DEPLOYMENT` | Model deployment | `gpt-4o-transcribe` |
| `AZURE_OPENAI_API_VERSION` | API version | `2025-03-01-preview` |
| `AZURE_OPENAI_API_KEY` | API key | `your-api-key` |

### Azure App Service Settings

#### Startup Command
```bash
node server-with-video-support.js
```

#### Node Version
```json
{
  "WEBSITE_NODE_DEFAULT_VERSION": "18.20.8"
}
```

## 🚀 Optimization Tips

### 1. File Processing
- **Compress before chunking** to reduce memory usage
- **Use appropriate chunk sizes** (5 minutes for audio)
- **Clean up temp files** immediately after use

### 2. Error Handling
- **Implement graceful fallbacks** for all operations
- **Add comprehensive logging** for debugging
- **Retry failed operations** with exponential backoff

### 3. Performance
- **Monitor memory usage** during large file processing
- **Use worker pools** for concurrent processing
- **Optimize FFmpeg parameters** for your use case

## 📚 Additional Resources

- [FFmpeg Documentation](https://ffmpeg.org/documentation.html)
- [Azure App Service Documentation](https://docs.microsoft.com/en-us/azure/app-service/)
- [OpenAI API Documentation](https://platform.openai.com/docs/api-reference)
- [Supabase Documentation](https://supabase.com/docs)

---

**Last Updated:** July 29, 2025  
**Version:** 2.0.0