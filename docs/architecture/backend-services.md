# Backend Services Architecture

## Overview

SoundScribe's backend infrastructure has been migrated from Render.com to Azure App Service for improved reliability, performance, and scalability. The new architecture provides enterprise-grade infrastructure with no cold starts, better monitoring, and enhanced security.

## Architecture Diagram

```
┌─────────────────┐    ┌──────────────────┐    ┌─────────────────┐
│   Frontend      │    │  Azure App       │    │   Azure OpenAI  │
│   (React)       │◄──►│  Service         │◄──►│   (Whisper/GPT) │
│                 │    │  Backend         │    │                 │
└─────────────────┘    └──────────────────┘    └─────────────────┘
                              │
                              ▼
                       ┌──────────────────┐
                       │  Azure Blob      │
                       │  Storage         │
                       │  (Audio Files)   │
                       └──────────────────┘
                              │
                              ▼
                       ┌──────────────────┐
                       │   Supabase       │
                       │   (Database)     │
                       └──────────────────┘
```

## Azure App Service Backend

### Service Details
- **Service Name**: `soundscribe-backend`
- **URL**: `https://soundscribe-backend.azurewebsites.net`
- **Resource Group**: `soundscribe-rg`
- **Location**: East US
- **Runtime**: Node.js 18 LTS
- **Plan**: B1 (Basic) Linux

### Key Features

#### 1. Enhanced Monitoring & Logging
- **Winston Logger**: Structured logging with multiple transports
- **Morgan**: HTTP request logging
- **Health Checks**: Comprehensive service health monitoring
- **Metrics Endpoint**: Real-time performance metrics
- **Error Tracking**: Detailed error logging with context

#### 2. Security Enhancements
- **Helmet.js**: Security headers and CSP
- **Rate Limiting**: API protection against abuse
- **CORS Configuration**: Secure cross-origin requests
- **Input Validation**: Request sanitization

#### 3. Real-time Updates
- **WebSocket Support**: Live processing status updates
- **Progress Tracking**: Real-time audio processing progress
- **Client Management**: Connection management and cleanup

#### 4. Audio Processing Pipeline
- **File Upload**: Secure multipart file handling
- **Audio Compression**: Automatic file optimization
- **Transcription**: Azure OpenAI Whisper integration
- **AI Insights**: GPT-4 analysis and coaching recommendations

### API Endpoints

#### Health & Monitoring
```
GET /health          - Service health check with dependency status
GET /metrics         - Performance metrics and system stats
```

#### Audio Processing
```
POST /api/process-audio  - Upload and process audio files
```

#### WebSocket (Real-time)
```
WS /ws               - WebSocket connection for live updates
```

### Environment Variables

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

# Rate Limiting
RATE_LIMIT_MAX_REQUESTS=100
RATE_LIMIT_WINDOW_MS=900000
```

## Azure Blob Storage

### Storage Account
- **Account Name**: `soundscribestorage`
- **Container**: `audio-files`
- **Access Level**: Private with SAS tokens

### File Organization
```
audio-files/
├── {recording-id}/
│   ├── original.mp3
│   ├── compressed.mp3
│   └── metadata.json
```

### Lifecycle Management
- Automatic cleanup of old files (configurable)
- Cost optimization through tiered storage
- Backup and disaster recovery

## Migration Benefits

### Performance Improvements
- **No Cold Starts**: Azure App Service stays warm
- **Faster Response Times**: Enterprise-grade infrastructure
- **Auto-scaling**: Handles traffic spikes automatically
- **Global CDN**: Azure CDN for faster file delivery

### Reliability Enhancements
- **99.9% SLA**: Enterprise-grade uptime guarantee
- **Automatic Failover**: Built-in redundancy
- **Health Monitoring**: Proactive issue detection
- **Backup & Recovery**: Automated data protection

### Cost Optimization
- **Predictable Pricing**: No surprise charges
- **Resource Optimization**: Right-sized instances
- **Storage Tiering**: Cost-effective file storage
- **Monitoring**: Usage tracking and optimization

## Deployment Process

### Initial Setup
1. **Resource Creation**: Azure CLI commands for infrastructure
2. **Environment Configuration**: Secure environment variables
3. **Code Deployment**: Git-based or ZIP deployment
4. **Health Verification**: Endpoint testing and validation

### Continuous Deployment
```bash
# Deploy updates
cd azure-app-service
git add .
git commit -m "Update description"
git push azure master
```

### Monitoring & Maintenance
- **Log Analysis**: Azure Application Insights (optional)
- **Performance Monitoring**: Built-in Azure metrics
- **Error Tracking**: Centralized error logging
- **Health Checks**: Automated service monitoring

## Security Considerations

### Data Protection
- **Encryption at Rest**: All data encrypted in Azure
- **Encryption in Transit**: TLS 1.2+ for all communications
- **Access Control**: Role-based access management
- **Audit Logging**: Comprehensive security logging

### API Security
- **Rate Limiting**: Protection against abuse
- **Input Validation**: Request sanitization
- **CORS Policies**: Secure cross-origin requests
- **Authentication**: JWT-based auth (when implemented)

## Troubleshooting

### Common Issues

#### Service Unavailable
```bash
# Check service status
az webapp show --name soundscribe-backend --resource-group soundscribe-rg

# View logs
az webapp log tail --name soundscribe-backend --resource-group soundscribe-rg
```

#### Environment Variables
```bash
# List current settings
az webapp config appsettings list --name soundscribe-backend --resource-group soundscribe-rg

# Update settings
az webapp config appsettings set --name soundscribe-backend --resource-group soundscribe-rg --settings KEY=VALUE
```

#### Performance Issues
- Check `/metrics` endpoint for system stats
- Monitor memory and CPU usage
- Review application logs for bottlenecks
- Consider scaling up App Service plan if needed

## Future Enhancements

### Planned Improvements
1. **Application Insights**: Deep monitoring and analytics
2. **Custom Domain**: Professional branding
3. **Staging Environment**: Blue/green deployments
4. **Auto-scaling Rules**: Dynamic resource management
5. **CDN Integration**: Global content delivery
6. **Advanced Security**: WAF and DDoS protection

### Scalability Considerations
- **Horizontal Scaling**: Multiple instances
- **Load Balancing**: Azure Application Gateway
- **Database Scaling**: Supabase auto-scaling
- **Storage Optimization**: Tiered storage strategies

## Support & Maintenance

### Monitoring Tools
- Azure Portal monitoring
- Application logs analysis
- Performance metrics tracking
- Error alerting and notifications

### Maintenance Schedule
- **Weekly**: Log analysis and cleanup
- **Monthly**: Performance review and optimization
- **Quarterly**: Security audit and updates
- **As Needed**: Emergency patches and fixes

---

*This documentation reflects the current Azure App Service architecture. For specific implementation details, refer to the source code in the `azure-app-service/` directory.*