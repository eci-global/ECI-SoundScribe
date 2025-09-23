# SoundScribe Admin Guide

## Overview

This guide provides comprehensive information for administrators managing the SoundScribe application. The system has been migrated from Render.com to Azure App Service for improved reliability and performance.

## System Architecture

### Current Infrastructure
- **Frontend**: React application (hosted on Vercel/Netlify)
- **Backend**: Azure App Service (`soundscribe-backend.azurewebsites.net`)
- **Database**: Supabase (PostgreSQL)
- **File Storage**: Azure Blob Storage
- **AI Services**: Azure OpenAI (Whisper + GPT-4)

### Azure Resources
- **Resource Group**: `soundscribe-rg`
- **App Service**: `soundscribe-backend`
- **Storage Account**: `soundscribestorage`
- **Location**: East US

## Deployment & Management

### Azure App Service Management

#### Check Service Status
```bash
# View service details
az webapp show --name soundscribe-backend --resource-group soundscribe-rg

# Check service state
az webapp show --name soundscribe-backend --resource-group soundscribe-rg --query "state" -o tsv
```

#### View Logs
```bash
# Real-time log streaming
az webapp log tail --name soundscribe-backend --resource-group soundscribe-rg

# Download logs
az webapp log download --name soundscribe-backend --resource-group soundscribe-rg
```

#### Environment Variables
```bash
# List all settings
az webapp config appsettings list --name soundscribe-backend --resource-group soundscribe-rg

# Update specific setting
az webapp config appsettings set --name soundscribe-backend --resource-group soundscribe-rg --settings KEY=VALUE

# Delete setting
az webapp config appsettings delete --name soundscribe-backend --resource-group soundscribe-rg --setting-names KEY
```

#### Deploy Updates
```bash
# Navigate to backend directory
cd azure-app-service

# Commit changes
git add .
git commit -m "Update description"

# Deploy to Azure
git push azure master

# Alternative: ZIP deployment
Compress-Archive -Path * -DestinationPath deploy.zip -Force
az webapp deploy --resource-group soundscribe-rg --name soundscribe-backend --src-path deploy.zip --type zip
```

### Health Monitoring

#### Health Check Endpoint
```bash
# Test service health
curl https://soundscribe-backend.azurewebsites.net/health

# Expected response:
{
  "status": "healthy",
  "timestamp": "2025-06-25T19:15:52.505Z",
  "environment": "production",
  "version": "1.0.0",
  "uptime": 12345.67,
  "memory": {...},
  "services": {
    "azureStorage": "healthy",
    "azureOpenAI": "healthy",
    "supabase": "healthy"
  }
}
```

#### Metrics Endpoint
```bash
# Get performance metrics
curl https://soundscribe-backend.azurewebsites.net/metrics

# Response includes:
{
  "uptime": 12345.67,
  "memory": {...},
  "cpu": {...},
  "version": "v18.x.x",
  "platform": "linux",
  "pid": 1234,
  "timestamp": "2025-06-25T19:15:52.505Z"
}
```

## Configuration Management

### Environment Variables

#### Required Variables
```bash
# Azure Storage
AZURE_STORAGE_CONNECTION_STRING=DefaultEndpointsProtocol=https;...

# Azure OpenAI
AZURE_OPENAI_ENDPOINT=https://your-resource.openai.azure.com/
AZURE_OPENAI_API_KEY=your-api-key
AZURE_OPENAI_DEPLOYMENT_NAME=whisper
AZURE_OPENAI_CHAT_DEPLOYMENT=gpt-4o-mini

# Supabase
SUPABASE_URL=https://your-project.supabase.co
SUPABASE_SERVICE_ROLE_KEY=your-service-role-key

# Application
NODE_ENV=production
PORT=3000
FRONTEND_URL=https://your-frontend-domain.com
```

#### Optional Variables
```bash
# Rate Limiting
RATE_LIMIT_MAX_REQUESTS=100
RATE_LIMIT_WINDOW_MS=900000

# Logging
LOG_LEVEL=info

# File Processing
MAX_FILE_SIZE_MB=500
CHUNK_SIZE_MB=25
PROCESSING_TIMEOUT_MS=300000
```

### Frontend Configuration

Update the frontend environment file (`echo-ai-scribe-app/.env`):
```bash
# Background Worker Configuration - Updated to Azure App Service
VITE_BACKGROUND_WORKER_URL=https://soundscribe-backend.azurewebsites.net
```

## Monitoring & Troubleshooting

### Log Analysis

#### Application Logs
- **Location**: Azure App Service logs
- **Format**: JSON structured logging
- **Levels**: error, warn, info, debug
- **Retention**: 30 days

#### Key Log Events
- `HTTP Request`: All API requests with timing
- `Audio Processing`: Processing pipeline events
- `Azure OpenAI Operation`: AI service interactions
- `Application Error`: Error tracking with context

### Common Issues & Solutions

#### Service Unavailable (503)
```bash
# Check service status
az webapp show --name soundscribe-backend --resource-group soundscribe-rg

# Restart service if needed
az webapp restart --name soundscribe-backend --resource-group soundscribe-rg
```

#### Environment Variable Issues
```bash
# Verify all required variables are set
az webapp config appsettings list --name soundscribe-backend --resource-group soundscribe-rg

# Check for missing variables
curl https://soundscribe-backend.azurewebsites.net/health
```

#### Performance Issues
```bash
# Check metrics
curl https://soundscribe-backend.azurewebsites.net/metrics

# Monitor memory usage
az webapp log tail --name soundscribe-backend --resource-group soundscribe-rg
```

#### File Upload Failures
1. Check Azure Blob Storage connection
2. Verify file size limits
3. Check CORS configuration
4. Review rate limiting settings

### Performance Optimization

#### Scaling Options
```bash
# Scale up (change plan)
az appservice plan update --name soundscribe-backend-plan --resource-group soundscribe-rg --sku S1

# Scale out (add instances)
az webapp scale --name soundscribe-backend --resource-group soundscribe-rg --instances 2
```

#### Monitoring Metrics
- **CPU Usage**: Target < 70%
- **Memory Usage**: Target < 80%
- **Response Time**: Target < 2 seconds
- **Error Rate**: Target < 1%

## Security Management

### Access Control

#### Azure Resource Access
```bash
# List role assignments
az role assignment list --resource-group soundscribe-rg

# Add contributor access
az role assignment create --assignee user@example.com --role Contributor --resource-group soundscribe-rg
```

#### API Security
- **Rate Limiting**: Configured per IP
- **CORS**: Restricted to frontend domain
- **Input Validation**: All requests sanitized
- **Error Handling**: No sensitive data in error responses

### Data Protection

#### Encryption
- **At Rest**: Azure Storage encryption
- **In Transit**: TLS 1.2+ for all communications
- **Database**: Supabase encryption

#### Backup Strategy
- **Database**: Supabase automated backups
- **Files**: Azure Blob Storage redundancy
- **Configuration**: Version controlled in Git

## Maintenance Procedures

### Regular Maintenance

#### Weekly Tasks
- [ ] Review application logs for errors
- [ ] Check performance metrics
- [ ] Verify backup completion
- [ ] Update security patches

#### Monthly Tasks
- [ ] Performance review and optimization
- [ ] Security audit
- [ ] Cost analysis and optimization
- [ ] Update documentation

#### Quarterly Tasks
- [ ] Full system health check
- [ ] Disaster recovery testing
- [ ] Capacity planning
- [ ] Technology stack updates

### Emergency Procedures

#### Service Outage
1. Check Azure status page
2. Verify service health endpoint
3. Review recent deployments
4. Check environment variables
5. Restart service if necessary

#### Data Recovery
1. Identify affected data
2. Restore from Supabase backup
3. Verify data integrity
4. Update affected users

## Cost Management

### Azure Cost Optimization

#### Current Resources
- **App Service Plan**: B1 (~$13/month)
- **Blob Storage**: Pay per use (~$0.02/GB/month)
- **Bandwidth**: Pay per use (~$0.087/GB)

#### Cost Monitoring
```bash
# View current costs
az consumption usage list --billing-period-name 202506

# Set budget alerts
az monitor action-group create --name cost-alerts --resource-group soundscribe-rg
```

#### Optimization Strategies
- **Right-sizing**: Monitor usage and adjust plan
- **Storage lifecycle**: Implement automatic cleanup
- **CDN usage**: Optimize file delivery
- **Reserved instances**: Consider for predictable workloads

## Integration Management

### Supabase Integration

#### Database Management
```sql
-- Check table sizes
SELECT schemaname, tablename, pg_size_pretty(pg_total_relation_size(schemaname||'.'||tablename)) as size
FROM pg_tables
WHERE schemaname = 'public'
ORDER BY pg_total_relation_size(schemaname||'.'||tablename) DESC;

-- Monitor active connections
SELECT count(*) as active_connections FROM pg_stat_activity WHERE state = 'active';
```

#### Edge Functions
- **process-recording**: Audio processing pipeline
- **chat-with-recording**: AI chat functionality
- **generate-coaching**: Coaching insights generation

### Azure OpenAI Integration

#### Service Health
```bash
# Test OpenAI connection
curl -X POST https://soundscribe-backend.azurewebsites.net/api/process-audio \
  -H "Content-Type: application/json" \
  -d '{"test": "connection"}'
```

#### Usage Monitoring
- Monitor token usage in Azure Portal
- Set up cost alerts for OpenAI services
- Review processing times and quality

## Development & Testing

### Local Development

#### Backend Setup
```bash
# Clone repository
git clone <repository-url>
cd azure-app-service

# Install dependencies
npm install

# Set up environment
cp env.example .env
# Edit .env with local values

# Start development server
npm run dev
```

#### Testing
```bash
# Run tests
npm test

# Health check
curl http://localhost:3000/health

# Test audio processing
# Use test audio file with POST /api/process-audio
```

### Staging Environment

#### Setup Staging Slot
```bash
# Create staging slot
az webapp deployment slot create --name soundscribe-backend --resource-group soundscribe-rg --slot staging

# Deploy to staging
az webapp deployment source config-zip --resource-group soundscribe-rg --name soundscribe-backend --slot staging --src-path deploy.zip
```

#### Testing in Staging
1. Deploy changes to staging slot
2. Test all functionality
3. Verify performance
4. Swap to production if successful

## Support & Resources

### Documentation
- **Architecture**: `/docs/architecture/`
- **API Reference**: Backend code comments
- **Deployment**: This guide

### Monitoring Tools
- **Azure Portal**: Resource monitoring
- **Application Insights**: Deep monitoring (optional)
- **Supabase Dashboard**: Database monitoring
- **Custom Metrics**: `/metrics` endpoint

### Contact Information
- **Azure Support**: Available through Azure Portal
- **Supabase Support**: Available through Supabase Dashboard
- **Development Team**: Internal team contacts

---

*This guide covers the current Azure App Service deployment. For specific implementation details, refer to the source code and Azure documentation.*