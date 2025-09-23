# 🚨 Azure OpenAI Whisper 500 Error Resolution

**Date**: 2025-01-21  
**Issue**: Azure OpenAI Whisper API returning HTTP 500 "Internal server error"  
**Status**: ✅ ENHANCED ERROR HANDLING & DIAGNOSTICS IMPLEMENTED

---

## 🔍 Problem Analysis

### Error Details from Logs
```
2025-07-21T14:57:23.9682479Z 🌐 Whisper URL: https://northcentralus.api.cognitive.microsoft.com/openai/deployments/whisper-1/audio/transcriptions?api-version=2025-01-01-preview
2025-07-21T14:57:31.1850551Z ❌ Whisper transcription failed: {
  statusCode: 500,
  message: 'Internal server error',
  activityId: '660f7eb6-cd43-4175-8204-baefeb63a36a'
}
```

### Root Cause Analysis
The error is occurring during Azure OpenAI Whisper transcription with:
- **API Version**: `2025-01-01-preview` (potentially unstable preview version)
- **Region**: North Central US (`northcentralus.api.cognitive.microsoft.com`)
- **Error Type**: Internal Server Error (500) - indicates Azure service issue

---

## ✅ Solutions Implemented

### 1. Enhanced Error Diagnostics

**File**: `/azure-backend/utils/azureOpenAI.js`

#### Added Comprehensive 500 Error Logging
```javascript
// Enhanced error logging for 500 errors
if (error.response?.status === 500) {
  console.error(`🚨 Azure OpenAI Whisper 500 Error Details:`);
  console.error(`   Status: ${error.response.status}`);
  console.error(`   Status Text: ${error.response.statusText}`);
  console.error(`   Response Data:`, JSON.stringify(error.response.data, null, 2));
  console.error(`   File Size: ${audioBuffer.length} bytes`);
  console.error(`   Content Type: ${this.getContentType(filename)}`);
  console.error(`   API Version: ${this.apiVersion}`);
  console.error(`   Deployment: ${this.whisperDeployment}`);
  console.error(`   Endpoint: ${this.whisperEndpoint}`);
  
  if (error.response.data?.error?.message) {
    console.error(`   Azure Error Message: ${error.response.data.error.message}`);
  }
}
```

### 2. API Version Fallback System

#### Automatic Fallback for 500 Errors
```javascript
// Try with fallback API version if we got a 500 error
if (error.response?.status === 500 && this.apiVersion.includes('2025-01-01')) {
  console.log(`🔄 Attempting fallback with stable API version due to 500 error...`);
  
  // Temporarily use stable API version
  const originalApiVersion = this.apiVersion;
  this.apiVersion = '2024-10-01-preview'; // Known stable version
  
  // Retry with stable API version
  const fallbackResult = await this.withRetry(fallbackOperation, 'Fallback Transcription', {
    isTranscription: true,
    maxRetries: 3
  });
}
```

### 3. Audio Chunk Validation

#### Pre-Send Validation
```javascript
// Validate audio buffer before sending
if (!audioBuffer || audioBuffer.length === 0) {
  throw new Error('Audio buffer is empty or invalid');
}

if (audioBuffer.length > 25 * 1024 * 1024) { // 25MB Whisper limit
  throw new Error(`Audio chunk too large: ${audioBuffer.length} bytes (max 25MB for Whisper)`);
}

// Check for minimum file size (avoid sending tiny corrupted chunks)
if (audioBuffer.length < 1024) { // 1KB minimum
  throw new Error(`Audio chunk too small: ${audioBuffer.length} bytes (likely corrupted)`);
}
```

### 4. Extended Timeout & Configuration

#### Optimized Settings
```javascript
const response = await axios.post(url, formData, {
  headers: {
    'api-key': this.whisperApiKey,
    ...formData.getHeaders()
  },
  timeout: 180000, // Increased to 3 minutes for large chunks
  maxContentLength: Infinity,
  maxBodyLength: Infinity
});

// Use temperature 0 for deterministic results (Azure OpenAI Whisper best practice)
formData.append('temperature', (options.temperature !== undefined ? options.temperature : 0).toString());
```

---

## 🧪 Diagnostic Tools

### Azure Health Check Script

**File**: `/azure-backend/test-azure-health.js`

#### Comprehensive Testing
```bash
# Run health check
node azure-backend/test-azure-health.js
```

**Tests Performed**:
1. **Configuration Check**: Validates endpoint, deployment, API key
2. **Small Audio Test**: Tests with minimal valid audio
3. **API Version Compatibility**: Tests multiple API versions
4. **Chunk Size Validation**: Tests different buffer sizes

---

## 🔧 Troubleshooting Steps

### Immediate Actions
1. **Run Health Check**: `node azure-backend/test-azure-health.js`
2. **Check Azure Service Status**: Monitor Azure OpenAI service health
3. **Review Logs**: Look for detailed 500 error information
4. **Test API Version**: Try with `2024-10-01-preview` instead of `2025-01-01-preview`

### Environment Variable Check
```bash
# Verify Azure OpenAI configuration
echo "Endpoint: $AZURE_OPENAI_ENDPOINT"
echo "API Version: $AZURE_OPENAI_API_VERSION"
echo "Whisper Deployment: $AZURE_OPENAI_WHISPER_DEPLOYMENT"
```

### Common Fixes

#### 1. API Version Issue
```bash
# Set stable API version
export AZURE_OPENAI_API_VERSION="2024-10-01-preview"
```

#### 2. Regional Issue
If North Central US has issues, try different endpoint:
```bash
# Try East US endpoint
export AZURE_OPENAI_ENDPOINT="https://eastus.api.cognitive.microsoft.com/"
```

#### 3. Deployment Issue
```bash
# Verify deployment exists and is active
az cognitiveservices account deployment show \
  --name your-openai-resource \
  --resource-group your-resource-group \
  --deployment-name whisper-1
```

---

## 📊 Error Recovery Flow

### New Recovery Process
1. **Primary Attempt**: Use configured API version and settings
2. **Retry Logic**: 5 attempts with exponential backoff for 500 errors
3. **API Version Fallback**: If 500 error with 2025 preview, try 2024 stable
4. **Detailed Logging**: Capture all error details for debugging
5. **Graceful Failure**: Provide detailed error information for manual investigation

### Success Indicators
- ✅ Detailed error logs for debugging
- ✅ Automatic API version fallback
- ✅ Audio chunk validation
- ✅ Extended timeouts for large files
- ✅ Health check tool for diagnosis

---

## 🎯 Expected Outcomes

### For Joe Rogan File Test
1. **Performance**: No 2+ hour compression (✅ Fixed)
2. **Azure Upload**: Direct routing to backend (✅ Working)
3. **Whisper Processing**: Should now provide better error details and fallback
4. **Recovery**: Automatic retry with stable API version

### Monitoring Points
- Check if fallback API version resolves 500 errors
- Monitor Azure service health in North Central US region
- Validate chunk sizes are appropriate (should be <25MB)
- Confirm audio format compatibility

---

## 🔬 Next Steps

### If 500 Errors Persist
1. **Test with health check script** to isolate the issue
2. **Switch to stable API version** (`2024-10-01-preview`)
3. **Contact Azure Support** with activity IDs from error logs
4. **Consider alternative regions** if regional service issues

### Long-term Improvements
1. **Multi-region failover** for Azure OpenAI
2. **Alternative transcription services** as backup
3. **Advanced chunk validation** with audio format analysis
4. **Real-time service health monitoring**

---

**Status**: Enhanced error handling implemented. The system now provides detailed diagnostics and automatic fallback for 500 errors. Test with the health check script to validate Azure service status.

*Last Updated: 2025-01-21*