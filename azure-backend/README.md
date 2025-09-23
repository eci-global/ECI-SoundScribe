# Echo AI Background Worker

Background processing service for handling large audio/video file AI analysis with real-time progress updates.

## Features

- **Large File Processing**: Handle files up to 500MB
- **Queue Management**: Redis-based job queue with retry logic
- **Real-time Progress**: Live status updates via Supabase
- **Azure OpenAI Integration**: Whisper transcription + GPT analysis
- **Scalable Architecture**: Independent scaling from main app
- **Error Recovery**: Automatic retries and graceful error handling

## Setup

### 1. Install Dependencies

```bash
cd background-worker
npm install
```

### 2. Configure Environment

Copy `.env.example` to `.env` and fill in your credentials:

```bash
cp .env.example .env
```

Required environment variables:
- `SUPABASE_URL` - Your Supabase project URL
- `SUPABASE_SERVICE_ROLE_KEY` - Service role key with full access
- `AZURE_OPENAI_ENDPOINT` - Azure OpenAI endpoint URL
- `AZURE_OPENAI_API_KEY` - Azure OpenAI API key
- `REDIS_URL` - Redis connection string

### 3. Setup Redis

**Option A: Local Redis**
```bash
# Install Redis locally
brew install redis  # macOS
sudo apt install redis-server  # Ubuntu

# Start Redis
redis-server
```

**Option B: Redis Cloud (Recommended for production)**
1. Sign up at [Redis Cloud](https://redis.com/cloud/)
2. Create a free database
3. Use the provided connection string in `REDIS_URL`

### 4. Start the Worker

```bash
# Development
npm run dev

# Production
npm start
```

## API Endpoints

### Core Processing

- `POST /api/process-recording` - Queue file for background processing
- `POST /api/process-direct` - Process file immediately (smaller files)
- `GET /api/recording/:id/status` - Get processing status

### Job Management

- `GET /api/job/:id/status` - Get job status
- `POST /api/job/:id/cancel` - Cancel job
- `POST /api/job/:id/retry` - Retry failed job

### Queue Management

- `GET /api/queue/stats` - Get queue statistics
- `POST /api/queue/clean` - Clean old jobs
- `POST /api/batch-process` - Process multiple files

### Health & Monitoring

- `GET /health` - Health check endpoint

## Usage

### Process a Recording

```javascript
const response = await fetch('http://localhost:3001/api/process-recording', {
  method: 'POST',
  headers: { 'Content-Type': 'application/json' },
  body: JSON.stringify({ recording_id: 'your-recording-id' })
});

const result = await response.json();
console.log('Job ID:', result.jobId);
```

### Check Status

```javascript
const response = await fetch(`http://localhost:3001/api/recording/${recordingId}/status`);
const status = await response.json();
console.log('Progress:', status.status.progress);
```

## Deployment

### Heroku (Recommended)

1. **Create Heroku app**:
   ```bash
   heroku create your-app-name-worker
   ```

2. **Add Redis addon**:
   ```bash
   heroku addons:create heroku-redis:mini
   ```

3. **Set environment variables**:
   ```bash
   heroku config:set SUPABASE_URL=your_url
   heroku config:set SUPABASE_SERVICE_ROLE_KEY=your_key
   # ... add all other environment variables
   ```

4. **Deploy**:
   ```bash
   git subtree push --prefix=background-worker heroku main
   ```

### Render

1. Create new Web Service
2. Connect GitHub repository
3. Set build command: `cd background-worker && npm install`
4. Set start command: `cd background-worker && npm start`
5. Add environment variables in dashboard

### Railway

1. Connect GitHub repository
2. Select `background-worker` as root directory
3. Add environment variables
4. Deploy automatically

## Monitoring

The worker logs detailed information about:
- Job processing progress
- Error conditions and retries
- Queue statistics
- System health

### Log Levels

- `info` - Normal operations
- `warn` - Non-critical issues
- `error` - Processing failures

### Health Checks

The `/health` endpoint provides:
- Service status
- Uptime
- Environment info
- Version

## Scaling

### Horizontal Scaling

Deploy multiple worker instances:
- Each instance processes jobs from the same Redis queue
- Load is automatically distributed
- No coordination needed between instances

### Vertical Scaling

Adjust concurrency:
```env
WORKER_CONCURRENCY=5  # Process 5 files simultaneously
```

## Troubleshooting

### Common Issues

1. **Redis Connection Failed**
   - Check Redis is running
   - Verify `REDIS_URL` format
   - Ensure network connectivity

2. **Azure OpenAI Errors**
   - Verify API keys and endpoints
   - Check deployment names
   - Monitor rate limits

3. **File Download Failures**
   - Check Supabase storage permissions
   - Verify file URLs are accessible
   - Ensure service role has storage access

4. **Processing Timeouts**
   - Increase `PROCESSING_TIMEOUT_MS`
   - Check file size limits
   - Monitor Azure OpenAI response times

### Debug Mode

Set `NODE_ENV=development` for verbose logging.

## Architecture

```
Frontend Upload (>18MB) → Background Worker → Redis Queue → File Processor
                                                        ↓
Supabase Database ← Progress Updates ← Azure OpenAI ← File Analysis
```

### Components

- **Server** (`server.js`) - Express API server
- **Queue** (`queue.js`) - Bull/Redis job queue
- **Processor** (`processor.js`) - Core file processing logic
- **Progress Tracker** - Real-time status updates
- **File Handler** - File download/validation
- **Azure OpenAI Client** - AI service integration

## Security

- Service role key provides full database access
- CORS configured for allowed origins only
- File validation prevents malicious uploads
- Temporary files cleaned up after processing
- Rate limiting recommended for production

## Performance

### Optimization Tips

1. **Redis Performance**
   - Use Redis Cluster for high throughput
   - Configure appropriate memory settings
   - Monitor queue depth

2. **File Processing**
   - Adjust chunk sizes for large files
   - Optimize Azure OpenAI timeouts
   - Use file compression when possible

3. **Concurrency**
   - Balance worker concurrency with system resources
   - Monitor memory usage during processing
   - Consider file size in concurrency decisions

## Support

For issues and questions:
1. Check logs for error details
2. Verify environment configuration
3. Test with smaller files first
4. Monitor queue and job status