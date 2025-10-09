# Upgrade Azure Backend to GPT-4o

## Current Setup
- **Transcription**: gpt-4o-transcribe (Whisper) ✅
- **Analysis**: gpt-4o-mini 📊
- **Cost**: ~$0.15-0.60 per 1M tokens

## Upgraded Setup
- **Transcription**: gpt-4o-transcribe (Whisper) ✅
- **Analysis**: gpt-4o 🚀
- **Cost**: ~$2.50-10 per 1M tokens (15-20x increase)

---

## Why Upgrade?

### Benefits:
1. **Better Coaching Insights**: More nuanced understanding of sales calls
2. **Smarter Objection Analysis**: Understands complex customer concerns
3. **More Accurate Scoring**: Better evaluation of call quality
4. **Deeper Summaries**: Captures more important details
5. **Better Pattern Recognition**: Identifies trends across calls

### Trade-offs:
- **Cost**: 15-20x more expensive per call
- **Speed**: Slightly slower (~10-20% longer processing time)
- **Token Usage**: May use slightly more tokens for better analysis

---

## How to Upgrade

### Step 1: Update Azure Environment Variable

```bash
# Via Azure CLI
az webapp config appsettings set \
  --resource-group soundscribe-rg \
  --name soundscribe-backend \
  --settings AZURE_OPENAI_GPT4O_DEPLOYMENT=gpt-4o
```

**OR** via Azure Portal:
1. Go to https://portal.azure.com
2. Navigate to **soundscribe-backend** App Service
3. Click **Configuration** → **Application settings**
4. Find `AZURE_OPENAI_GPT4O_DEPLOYMENT`
5. Change value from `gpt-4o-mini` to `gpt-4o`
6. Click **Save** → **Continue** to restart

### Step 2: Verify Deployment Name Exists in Azure OpenAI

Make sure you have a deployment named `gpt-4o` in your Azure OpenAI resource:

1. Go to Azure OpenAI Studio: https://oai.azure.com/
2. Click **Deployments** (left sidebar)
3. Check if `gpt-4o` deployment exists
4. If not, create it:
   - Click **+ Create new deployment**
   - Model: `gpt-4o` (latest version)
   - Deployment name: `gpt-4o`
   - Click **Create**

### Step 3: Restart Azure App Service

```bash
az webapp restart \
  --resource-group soundscribe-rg \
  --name soundscribe-backend
```

### Step 4: Test with a New Recording

Upload a test recording and check the logs:

```bash
az webapp log tail \
  --resource-group soundscribe-rg \
  --name soundscribe-backend
```

Look for:
```
🤖 Using chat deployment: gpt-4o (GPT for completions)
```

---

## Cost Estimation

### Average Call Processing:
- **Transcript**: 5,000-10,000 tokens (input)
- **Summary Generation**: ~2,000 tokens output
- **Coaching Insights**: ~2,000 tokens output

### With GPT-4o-mini (current):
- Input: 7,500 tokens × $0.15 / 1M = **$0.0011**
- Output: 4,000 tokens × $0.60 / 1M = **$0.0024**
- **Total per call**: ~$0.0035 (less than half a cent)

### With GPT-4o (upgraded):
- Input: 7,500 tokens × $2.50 / 1M = **$0.0188**
- Output: 4,000 tokens × $10 / 1M = **$0.0400**
- **Total per call**: ~$0.0588 (about 6 cents)

### Monthly Cost (100 calls/month):
- **GPT-4o-mini**: $0.35/month
- **GPT-4o**: $5.88/month
- **Difference**: +$5.53/month

### Monthly Cost (1,000 calls/month):
- **GPT-4o-mini**: $3.50/month
- **GPT-4o**: $58.80/month
- **Difference**: +$55.30/month

---

## Recommendation

### Use GPT-4o if:
- ✅ Quality is more important than cost
- ✅ You process < 1,000 calls/month (cost is still low)
- ✅ You need the best possible coaching insights
- ✅ Managers rely heavily on AI-generated feedback

### Stick with GPT-4o-mini if:
- ✅ Processing >5,000 calls/month (costs add up)
- ✅ Budget is very tight
- ✅ Current quality is "good enough"
- ✅ Human managers review all feedback anyway

---

## Hybrid Approach (Advanced)

You could use GPT-4o **only for high-value calls**:

```javascript
// In processor.js
const useGPT4o = recording.is_important || recording.deal_size > 100000;
const deployment = useGPT4o ? 'gpt-4o' : 'gpt-4o-mini';
```

This gives you the best of both worlds!

---

## Rollback (if needed)

If you want to go back to GPT-4o-mini:

```bash
az webapp config appsettings set \
  --resource-group soundscribe-rg \
  --name soundscribe-backend \
  --settings AZURE_OPENAI_GPT4O_DEPLOYMENT=gpt-4o-mini

az webapp restart \
  --resource-group soundscribe-rg \
  --name soundscribe-backend
```

---

**Questions?** Test with a few recordings first to compare quality vs. cost!
