# Manual Azure OpenAI GlobalStandard Upgrade Guide

If the PowerShell scripts are having authentication issues, you can upgrade manually through the Azure Portal.

## 🎯 Quick Manual Steps

### Step 1: Access Azure Portal
1. Go to [https://portal.azure.com](https://portal.azure.com)
2. Navigate to your **Azure OpenAI** resource: `soundscribe-openai`
3. Select **Quotas** from the left menu

### Step 2: Request Quota Increase (If Needed)
1. Click on **gpt-4o-mini** model
2. Check current **Tokens per Minute Rate Limit**
3. If it's less than 551,000:
   - Click **Request Quota Increase**
   - Set **New limit**: `551000`
   - **Deployment Type**: Select `GlobalStandard`
   - **Justification**: "Production AI sales call analysis requiring high-volume concurrent processing"
   - Submit request (usually approved within 24-48 hours)

### Step 3: Update/Create GlobalStandard Deployment

#### Option A: Update Existing Deployment
1. Go to **Deployments** in your Azure OpenAI resource
2. Find your **gpt-4o-mini** deployment
3. Click **Edit**
4. Change **Deployment type** to `GlobalStandard`
5. Set **Tokens per minute rate limit** to `551000`
6. Click **Save**

#### Option B: Create New GlobalStandard Deployment
1. Go to **Deployments** → **Create new deployment**
2. **Model**: Select `gpt-4o-mini`
3. **Deployment name**: `gpt-4o-mini`
4. **Model version**: Latest available (e.g., `2024-07-18`)
5. **Deployment type**: `GlobalStandard` ⚠️ **Important!**
6. **Tokens per minute rate limit**: `551000`
7. **Enable dynamic quota**: ✅ Yes (recommended)
8. Click **Create**

### Step 4: Verify Configuration
1. Go back to **Deployments**
2. Confirm you see:
   - ✅ `gpt-4o-mini`: GlobalStandard (551,000 TPM)
   - ✅ `whisper-1`: Standard or GlobalStandard (high quota)

## 🧪 Test Your Deployment

### PowerShell Test
```powershell
# Set your environment variables
$env:AZURE_OPENAI_API_KEY = "your-actual-api-key"
$env:AZURE_OPENAI_ENDPOINT = "https://eastus.api.cognitive.microsoft.com/"

# Run the test script
.\test-azure-globalstandard.ps1
```

### Manual API Test
Use this curl command to test:

```bash
curl -X POST "https://eastus.api.cognitive.microsoft.com/openai/deployments/gpt-4o-mini/chat/completions?api-version=2024-10-01-preview" \
  -H "Content-Type: application/json" \
  -H "api-key: YOUR_API_KEY" \
  -d '{
    "messages": [{"role": "user", "content": "Test GlobalStandard deployment"}],
    "max_tokens": 50,
    "temperature": 0
  }'
```

Expected response: Should return quickly without 429 errors.

## 🔧 Alternative: Azure CLI Method

If you prefer command line but PowerShell isn't working:

```bash
# Login to Azure
az login

# Set subscription
az account set --subscription "f55203c5-2169-42af-8d67-1b93872aef84"

# Check current deployments
az cognitiveservices account deployment list \
  --name "soundscribe-openai" \
  --resource-group "soundscribe-rg"

# Create GlobalStandard deployment
az cognitiveservices account deployment create \
  --name "soundscribe-openai" \
  --resource-group "soundscribe-rg" \
  --deployment-name "gpt-4o-mini-global" \
  --model-name "gpt-4o-mini" \
  --model-version "2024-07-18" \
  --sku-capacity 551 \
  --sku-name "GlobalStandard"
```

## 🚨 Troubleshooting

### Issue: "Quota not available"
**Solution**: Request quota increase first (Step 2 above)

### Issue: "GlobalStandard not available in region"
**Solutions**: 
- Try different Azure region (East US, West Europe usually have best availability)
- Use Standard deployment with maximum available quota

### Issue: Authentication errors
**Solutions**:
- Verify API key is correct and active
- Check endpoint URL matches your resource region
- Ensure you have Cognitive Services Contributor role

### Issue: Still getting 429 errors after upgrade
**Wait time**: GlobalStandard activation can take 15-30 minutes after deployment

## ✅ Success Indicators

You'll know it worked when:
- ✅ Azure Portal shows `GlobalStandard` deployment type
- ✅ Rate limit shows `551,000` TPM
- ✅ API test calls return without 429 errors
- ✅ Your SoundScribe app processes audio instantly

## 📞 Need Help?

If you encounter issues:
1. **Azure Support**: Create support ticket for quota/deployment issues
2. **Check Azure Status**: [status.azure.com](https://status.azure.com) for service issues
3. **Documentation**: [Azure OpenAI Service docs](https://docs.microsoft.com/azure/cognitive-services/openai/)

---

**🎉 Once completed, your Azure OpenAI will handle high-volume processing without rate limiting!**