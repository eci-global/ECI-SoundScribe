# Azure OpenAI Configuration Guide

## 🚨 **Fixing 500 Error in process-recording Function**

The 500 Internal Server Error in the `process-recording` Edge Function is caused by missing Azure OpenAI environment variables. This guide will help you configure them properly.

## 📋 **Required Environment Variables**

The following environment variables must be set in your Supabase dashboard:

### **Chat Completion (GPT Models)**
```bash
AZURE_OPENAI_ENDPOINT=https://your-resource-name.openai.azure.com/
AZURE_OPENAI_API_KEY=your-api-key-here
AZURE_OPENAI_GPT4O_MINI_DEPLOYMENT=gpt-4o-mini
AZURE_OPENAI_API_VERSION=2024-10-01-preview
```

### **Audio Transcription (Whisper)**
```bash
AZURE_OPENAI_WHISPER_ENDPOINT=https://your-whisper-resource.openai.azure.com/
AZURE_OPENAI_WHISPER_API_KEY=your-whisper-api-key-here
AZURE_OPENAI_WHISPER_DEPLOYMENT=whisper-1
```

## 🔧 **Setup Instructions**

### **1. Configure in Supabase Dashboard**

1. **Open Supabase Dashboard**
   - Go to [https://app.supabase.com](https://app.supabase.com)
   - Select your project: `qinkldgvejheppheykfl`

2. **Navigate to Edge Functions Settings**
   - Go to **Settings** → **Edge Functions**
   - Or directly: **Settings** → **Environment variables**

3. **Add Environment Variables**
   Add each of the 7 required variables listed above:
   
   ```
   Variable Name: AZURE_OPENAI_ENDPOINT
   Value: https://your-resource-name.openai.azure.com/
   
   Variable Name: AZURE_OPENAI_API_KEY
   Value: your-api-key-here
   
   Variable Name: AZURE_OPENAI_WHISPER_ENDPOINT
   Value: https://your-whisper-resource.openai.azure.com/
   
   Variable Name: AZURE_OPENAI_WHISPER_API_KEY
   Value: your-whisper-api-key-here
   
   Variable Name: AZURE_OPENAI_GPT4O_MINI_DEPLOYMENT
   Value: gpt-4o-mini
   
   Variable Name: AZURE_OPENAI_WHISPER_DEPLOYMENT
   Value: whisper-1
   
   Variable Name: AZURE_OPENAI_API_VERSION
   Value: 2024-10-01-preview
   ```

4. **Save Configuration**
   - Click **Save** after adding each variable
   - Wait for deployment to complete

### **2. Get Your Azure OpenAI Credentials**

If you don't have Azure OpenAI credentials:

1. **Azure Portal**
   - Go to [https://portal.azure.com](https://portal.azure.com)
   - Navigate to your Azure OpenAI resource

2. **Get Endpoint and API Key**
   - **Endpoint**: Found in **Keys and Endpoint** section
   - **API Key**: Copy **Key 1** or **Key 2**

3. **Verify Deployment Names**
   - Go to **Model deployments**
   - Confirm deployment names:
     - GPT model: Usually `gpt-4o-mini`
     - Whisper model: Usually `whisper-1`

### **3. Test Configuration**

Once configured, test using the built-in test function:

```bash
# Test Azure OpenAI connectivity
curl -X POST https://qinkldgvejheppheykfl.supabase.co/functions/v1/test-azure-openai \
  -H "Authorization: Bearer YOUR_SUPABASE_ANON_KEY"
```

## 🔍 **Troubleshooting**

### **Common Issues**

1. **Wrong Endpoint Format**
   ```bash
   # ❌ Incorrect
   AZURE_OPENAI_ENDPOINT=your-resource-name.openai.azure.com
   
   # ✅ Correct
   AZURE_OPENAI_ENDPOINT=https://your-resource-name.openai.azure.com/
   ```

2. **Missing Deployment Names**
   - Ensure deployment names match exactly what's in Azure portal
   - Common names: `gpt-4o-mini`, `whisper-1`

3. **Wrong API Version**
   - Use: `2024-10-01-preview`
   - Check Azure documentation for latest versions

4. **Separate Whisper Resource**
   - If using separate resources for chat and whisper, ensure both are configured
   - Can use same resource for both if you have all models deployed

### **Verification Steps**

1. **Check Supabase Environment Variables**
   - Ensure all 7 variables are set
   - No typos in variable names
   - Values don't have extra spaces

2. **Test Edge Function**
   ```bash
   # Should return detailed configuration status
   curl -X POST https://qinkldgvejheppheykfl.supabase.co/functions/v1/test-azure-openai
   ```

3. **Check Process Recording**
   ```bash
   # Test with a recording ID
   curl -X POST https://qinkldgvejheppheykfl.supabase.co/functions/v1/process-recording \
     -H "Content-Type: application/json" \
     -d '{"recording_id": "test-id"}'
   ```

## 🚀 **Local Development Setup**

For local development, create `.env.local`:

```bash
# Copy this to .env.local in your project root
AZURE_OPENAI_ENDPOINT=https://your-resource-name.openai.azure.com/
AZURE_OPENAI_API_KEY=your-api-key-here
AZURE_OPENAI_WHISPER_ENDPOINT=https://your-whisper-resource.openai.azure.com/
AZURE_OPENAI_WHISPER_API_KEY=your-whisper-api-key-here
AZURE_OPENAI_GPT4O_MINI_DEPLOYMENT=gpt-4o-mini
AZURE_OPENAI_WHISPER_DEPLOYMENT=whisper-1
AZURE_OPENAI_API_VERSION=2024-10-01-preview
```

## 📊 **Expected Results**

After configuration:

1. **Upload Processing Works**
   - No more 500 errors from process-recording
   - Files process successfully through Azure OpenAI

2. **Better Error Messages**
   - If something is misconfigured, you'll get specific error messages
   - Clear indication of which variables are missing

3. **Monitoring**
   - Test function provides full diagnostic information
   - Easy to verify configuration status

## 🆘 **Still Having Issues?**

If you're still getting 500 errors after configuration:

1. **Check Supabase Function Logs**
   - Go to Supabase Dashboard → Edge Functions → Logs
   - Look for detailed error messages

2. **Use Test Function**
   - Run `test-azure-openai` function for diagnostics
   - Check which specific variables are missing

3. **Verify Azure OpenAI Resource**
   - Ensure your Azure OpenAI resource is active
   - Check quota and rate limits
   - Verify model deployments exist

The configuration should resolve the 500 error and enable proper audio processing through Azure OpenAI.