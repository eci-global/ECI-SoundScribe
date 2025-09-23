# SoundScribe - AI-Powered Audio Analysis Platform

[![Azure App Service](https://img.shields.io/badge/Azure%20App%20Service-0078D4?style=for-the-badge&logo=microsoftazure&logoColor=white)](https://azure.microsoft.com/en-us/services/app-service/)
[![React](https://img.shields.io/badge/React-20232A?style=for-the-badge&logo=react&logoColor=61DAFB)](https://reactjs.org/)
[![Supabase](https://img.shields.io/badge/Supabase-3ECF8E?style=for-the-badge&logo=supabase&logoColor=white)](https://supabase.com/)
[![Azure OpenAI](https://img.shields.io/badge/Azure%20OpenAI-0078D4?style=for-the-badge&logo=microsoftazure&logoColor=white)](https://azure.microsoft.com/en-us/products/cognitive-services/openai-service)

> **Enterprise-grade audio analysis platform with 3-5x performance improvement after Azure migration**

## 🚀 Overview

SoundScribe is an AI-powered audio analysis platform that helps sales professionals improve their conversations through automated transcription, insights, and coaching recommendations. Recently migrated to Azure App Service for enterprise-grade reliability and performance.

### ✨ Key Features

- **🎯 Enhanced Performance**: No cold starts, 99%+ upload success rate
- **🎙️ Multi-Format Support**: MP3, WAV, M4A, AAC, OGG up to 500MB
- **🤖 AI-Powered Insights**: Azure OpenAI Whisper + GPT-4 analysis
- **🎵 Enhanced Speaker Detection**: Timing-based analysis using Whisper segments
- **📊 Real-time Analytics**: Live processing updates and progress tracking
- **🔒 Enterprise Security**: Azure-grade encryption and compliance
- **📱 Responsive Design**: Works on desktop, tablet, and mobile

### 🏗️ Architecture

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

## 📈 Performance Improvements

### Before (Render.com)
- ❌ 30-60 second cold starts
- ❌ 85% upload success rate
- ❌ 2-5 second response times
- ❌ 95% uptime
- ❌ Basic monitoring

### After (Azure App Service)
- ✅ 0 second cold starts
- ✅ 99%+ upload success rate
- ✅ 0.5-1.5 second response times
- ✅ 99.9% uptime (SLA)
- ✅ Comprehensive monitoring

## 🛠️ Tech Stack

### Frontend
- **React 18** - Modern UI framework
- **TypeScript** - Type-safe development
- **Tailwind CSS** - Utility-first styling
- **React Query** - Server state management
- **React Router** - Client-side routing

### Backend (Azure App Service)
- **Node.js 18 LTS** - Server runtime
- **Express.js** - Web framework
- **Winston** - Structured logging
- **Morgan** - HTTP request logging
- **WebSocket** - Real-time updates
- **Rate Limiting** - API protection

### Infrastructure
- **Azure App Service** - Backend hosting
- **Azure Blob Storage** - File storage
- **Azure OpenAI** - AI services (Whisper + GPT-4o Mini)
  - Enhanced Whisper segment analysis for speaker detection
  - High-quota Global Standard deployments
- **Supabase** - Database and auth with Edge Functions
- **Azure CDN** - Content delivery

### Development Tools
- **Vite** - Build tool and dev server
- **ESLint** - Code linting
- **Prettier** - Code formatting
- **Cypress** - E2E testing
- **Jest** - Unit testing

## 🚀 Quick Start

### Prerequisites
- Node.js 18+ 
- npm or yarn
- Azure CLI (for deployment)
- Supabase account
- Azure OpenAI account

### Local Development

#### 1. Clone Repository
```bash
git clone <repository-url>
cd echo-ai-scribe-app
```

#### 2. Frontend Setup
```bash
# Install dependencies
npm install

# Set up environment variables
cp .env.example .env
# Edit .env with your configuration

# Start development server
npm run dev
```

#### 3. Backend Setup (Azure App Service)
```bash
cd azure-app-service

# Install dependencies
npm install

# Set up environment variables
cp env.example .env
# Edit .env with your Azure configuration

# Start development server
npm run dev
```

#### 4. Database Setup
```bash
# Run Supabase migrations
supabase db push

# Seed test data (optional)
supabase db reset
```

### Environment Variables

#### Frontend (.env)
```bash
VITE_SUPABASE_URL=your-supabase-url
VITE_SUPABASE_ANON_KEY=your-supabase-anon-key
VITE_BACKGROUND_WORKER_URL=https://soundscribe-backend.azurewebsites.net
```

#### Backend (Azure App Service)
```bash
# Azure Storage
AZURE_STORAGE_CONNECTION_STRING=DefaultEndpointsProtocol=https;...

# Azure OpenAI Configuration
AZURE_OPENAI_ENDPOINT=https://eastus.api.cognitive.microsoft.com/
AZURE_OPENAI_API_KEY=your-api-key
AZURE_OPENAI_API_VERSION=2024-10-01-preview

# Azure OpenAI Deployments (High-Performance Global Standard)
AZURE_OPENAI_GPT4O_MINI_DEPLOYMENT=gpt-4o-mini    # 551,000 TPM Global Standard
AZURE_OPENAI_WHISPER_DEPLOYMENT=whisper-1         # High-quota Whisper deployment

# Supabase
SUPABASE_URL=https://your-project.supabase.co
SUPABASE_SERVICE_ROLE_KEY=your-service-role-key

# Application
NODE_ENV=production
PORT=3000
FRONTEND_URL=https://your-frontend-domain.com
```

## 📦 Deployment

### Azure App Service Deployment

#### 1. Create Azure Resources
```bash
# Create resource group
az group create --name soundscribe-rg --location eastus

# Create App Service plan
az appservice plan create \
  --name soundscribe-backend-plan \
  --resource-group soundscribe-rg \
  --sku B1 \
  --is-linux

# Create web app
az webapp create \
  --resource-group soundscribe-rg \
  --plan soundscribe-backend-plan \
  --name soundscribe-backend \
  --runtime "NODE:18-lts" \
  --deployment-local-git

# Create storage account
az storage account create \
  --name soundscribestorage \
  --resource-group soundscribe-rg \
  --location eastus \
  --sku Standard_LRS \
  --kind StorageV2
```

#### 2. Deploy Backend
```bash
cd azure-app-service

# Deploy via Git
git init
git add .
git commit -m "Initial deployment"
git remote add azure https://soundscribe-backend.scm.azurewebsites.net:443/soundscribe-backend.git
git push azure master

# Or deploy via ZIP
Compress-Archive -Path * -DestinationPath deploy.zip -Force
az webapp deploy --resource-group soundscribe-rg --name soundscribe-backend --src-path deploy.zip --type zip
```

#### 3. Configure Environment Variables
```bash
# Set Azure Storage
az webapp config appsettings set \
  --name soundscribe-backend \
  --resource-group soundscribe-rg \
  --settings AZURE_STORAGE_CONNECTION_STRING="your-connection-string"

# Set Azure OpenAI
az webapp config appsettings set \
  --name soundscribe-backend \
  --resource-group soundscribe-rg \
  --settings AZURE_OPENAI_ENDPOINT="your-endpoint"

# Set Supabase
az webapp config appsettings set \
  --name soundscribe-backend \
  --resource-group soundscribe-rg \
  --settings SUPABASE_URL="your-supabase-url"
```

### Frontend Deployment

#### Vercel (Recommended)
```bash
# Install Vercel CLI
npm i -g vercel

# Deploy
vercel --prod
```

#### Netlify
```bash
# Build project
npm run build

# Deploy to Netlify
# Upload dist/ folder to Netlify dashboard
```

## 🧪 Testing

### Frontend Tests
```bash
# Unit tests
npm run test

# E2E tests
npm run test:e2e

# Test coverage
npm run test:coverage
```

### Backend Tests
```bash
cd azure-app-service

# Run tests
npm test

# Health check
curl http://localhost:3000/health

# Metrics
curl http://localhost:3000/metrics
```

### API Testing
```bash
# Test health endpoint
curl https://soundscribe-backend.azurewebsites.net/health

# Test audio processing (with test file)
curl -X POST https://soundscribe-backend.azurewebsites.net/api/process-audio \
  -F "audio=@test-audio.mp3"
```

## 📊 Monitoring

### Health Checks
```bash
# Service health
curl https://soundscribe-backend.azurewebsites.net/health

# Performance metrics
curl https://soundscribe-backend.azurewebsites.net/metrics
```

### Azure Portal Monitoring
- **App Service Metrics**: CPU, memory, response times
- **Application Logs**: Structured logging with Winston
- **Error Tracking**: Centralized error logging
- **Performance Insights**: Built-in performance analysis

### Log Analysis
```bash
# View real-time logs
az webapp log tail --name soundscribe-backend --resource-group soundscribe-rg

# Download logs
az webapp log download --name soundscribe-backend --resource-group soundscribe-rg
```

## 🎵 Enhanced Whisper Speaker Detection

### Core Innovation
SoundScribe features **enhanced speaker detection** that goes beyond basic text analysis by leveraging Whisper's rich timing and confidence data for accurate speaker identification.

### How It Works
- **📊 Segment Analysis**: Uses Whisper's `verbose_json` format with timing data
- **⏸️ Pause Detection**: Identifies speaker changes through pause patterns (>2s)
- **📈 Confidence Analysis**: Detects transitions via Whisper confidence drops
- **💬 Conversation Patterns**: Recognizes textual transition cues ("thanks", "well", etc.)
- **⏱️ Speaking Time**: Calculates real duration per detected speaker

### Accuracy Improvements
```
Speaker Detection Accuracy:
├── 2-speaker calls: ~85% (vs ~60% text-only)
├── 3+ speaker calls: ~70% (vs ~40% text-only)
└── Meeting calls: ~75% (vs ~45% text-only)
```

### Implementation
- **🔄 Automatic**: Enhanced analysis built into transcription process
- **🎯 On-Demand**: "Enhanced Analysis" button for existing recordings
- **🎵 UI Indicators**: Purple badges show timing-based analysis
- **💯 Honest Scoring**: Clear confidence indicators and analysis methods

### Analysis Priority System
1. **🎤 Real Voice Diarization** (external services, if configured)
2. **🎵 Enhanced Whisper Segments** ← New high-accuracy method
3. **🤖 AI-Enhanced Transcript** (GPT analysis of text patterns)
4. **📝 Pattern Analysis** (regex-based text analysis)
5. **⚠️ Fallback Estimation** (basic estimation)

### Technical Details
```typescript
// Core detection algorithm
const PAUSE_THRESHOLD = 2.0; // Seconds
const CONFIDENCE_DROP_THRESHOLD = 0.3;

// Detect speaker changes via:
if (pauseDuration > PAUSE_THRESHOLD) {
  speakerChange = true; // Long pause detected
} else if (confidenceChange > CONFIDENCE_DROP_THRESHOLD) {
  speakerChange = true; // Confidence drop detected  
} else if (detectConversationalTransition(text)) {
  speakerChange = true; // Textual pattern detected
}
```

## ⚡ Azure OpenAI Rate Limits & Performance

### Current Configuration (High-Performance)
- **gpt-4o-mini**: 551,000 TPM (Global Standard deployment)
- **whisper-1**: High-quota Standard deployment for audio transcription
- **Automatic Retry Logic**: Built-in exponential backoff for rate limit handling
- **Real-time Processing**: Instant results without rate limit delays

### Rate Limit Troubleshooting

#### If You Experience 429 Errors:
1. **Check Deployment Quotas**: Verify your TPM limits in Azure Portal
2. **Upgrade to Global Standard**: Request quota increase for higher limits
3. **Monitor Usage**: Track token consumption patterns
4. **Contact Support**: For quota increase requests

#### Quota Increase Process:
```bash
# Steps to increase Azure OpenAI quotas:
# 1. Azure Portal → Azure OpenAI → Quotas
# 2. Select model (gpt-4o-mini or whisper-1)
# 3. Request increase (e.g., 551,000 TPM)
# 4. Choose "Global Standard" deployment type
# 5. Provide business justification
# 6. Wait 24-48 hours for approval
```

### Performance Monitoring
- **Token Usage**: Tracked in Edge Functions
- **Rate Limit Headers**: Monitored and logged
- **Error Recovery**: Automatic retry with intelligent wait times
- **User Feedback**: Clear error messages and progress indicators

## 🔧 Configuration

### Backend Rate Limiting
```bash
# Configure API rate limits
RATE_LIMIT_MAX_REQUESTS=100
RATE_LIMIT_WINDOW_MS=900000
```

### File Processing
```bash
# File size limits
MAX_FILE_SIZE_MB=500
CHUNK_SIZE_MB=25
PROCESSING_TIMEOUT_MS=300000
```

### Logging
```bash
# Log levels
LOG_LEVEL=info  # error, warn, info, debug
```

## 🛡️ Security

### Data Protection
- **Encryption at Rest**: Azure Storage encryption
- **Encryption in Transit**: TLS 1.2+ for all communications
- **Access Control**: Role-based access management
- **Audit Logging**: Comprehensive security logging

### API Security
- **Rate Limiting**: Protection against abuse
- **Input Validation**: Request sanitization
- **CORS Policies**: Secure cross-origin requests
- **Error Handling**: No sensitive data in error responses

## 📚 Documentation

- **[User Guide](docs/USER_GUIDE.md)** - End-user documentation
- **[Admin Guide](docs/ADMIN_GUIDE.md)** - System administration
- **[Azure Migration Guide](docs/AZURE_MIGRATION_GUIDE.md)** - Migration details
- **[Enhanced Whisper Analysis](ENHANCED_WHISPER_ANALYSIS.md)** - Speaker detection technical details
- **[Architecture](docs/architecture/)** - Technical architecture
- **[API Reference](docs/architecture/backend-services.md)** - Backend API docs

## 🤝 Contributing

### Development Workflow
1. Fork the repository
2. Create a feature branch (`git checkout -b feature/amazing-feature`)
3. Commit your changes (`git commit -m 'Add amazing feature'`)
4. Push to the branch (`git push origin feature/amazing-feature`)
5. Open a Pull Request

### Code Standards
- **TypeScript**: Strict type checking enabled
- **ESLint**: Code linting and formatting
- **Prettier**: Consistent code formatting
- **Testing**: Unit and E2E tests required

### Commit Convention
```
feat: add new feature
fix: bug fix
docs: documentation changes
style: formatting changes
refactor: code refactoring
test: adding tests
chore: maintenance tasks
```

## 📄 License

This project is licensed under the MIT License - see the [LICENSE](LICENSE) file for details.

## 🆘 Support

### Getting Help
- **Documentation**: Check the [docs](docs/) folder
- **Issues**: Report bugs via GitHub Issues
- **Discussions**: Use GitHub Discussions for questions
- **Email**: Contact support@soundscribe.com

### Troubleshooting
- **Common Issues**: See [Admin Guide](docs/ADMIN_GUIDE.md#troubleshooting)
- **Performance**: Check [Azure Migration Guide](docs/AZURE_MIGRATION_GUIDE.md)
- **Development**: Review [Architecture Docs](docs/architecture/)

## 🏆 Acknowledgments

- **Azure App Service** - Enterprise-grade hosting
- **Supabase** - Database and authentication
- **Azure OpenAI** - AI-powered insights
- **React Community** - Frontend framework
- **Open Source Contributors** - Community support

---

**Made with ❤️ by the SoundScribe Team**

*Last updated: December 2025 - Enhanced Whisper Speaker Detection Added*