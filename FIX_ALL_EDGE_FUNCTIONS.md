# 🔧 Fix All Edge Function Issues

## 🚨 **Multiple Edge Functions Failing**

Several Edge functions are returning 500 Internal Server Errors due to missing Azure OpenAI configuration:

- ✅ `analyze-speakers-topics` - **FIXED** (now working for Call Outline)
- ❌ `generate-ai-moments` - **FAILING** (Key Moments showing only 1 instead of 5-15)
- ❌ `generate-coaching` - **FAILING** (Coaching Insights not generating)

## 🔍 **Root Cause**
All functions require the same Azure OpenAI environment variables, but they're only configured for some functions or missing entirely.

## ✅ **Complete Solution**

### **Step 1: Deploy All Edge Functions**
```powershell
# Login to Supabase CLI
npx supabase login

# Deploy all Edge functions at once
npx supabase functions deploy

# Or deploy individually:
npx supabase functions deploy generate-ai-moments
npx supabase functions deploy generate-coaching
npx supabase functions deploy analyze-speakers-topics
```

### **Step 2: Configure Environment Variables for ALL Edge Functions**

Go to **Supabase Dashboard → Project Settings → Edge Functions** and add these environment variables:

| Variable Name | Value | Purpose |
|---------------|-------|---------|
| `AZURE_OPENAI_ENDPOINT` | `https://eastus.api.cognitive.microsoft.com/` | Azure OpenAI service endpoint |
| `AZURE_OPENAI_API_KEY` | Your Azure OpenAI API key | Authentication |
| `AZURE_OPENAI_API_VERSION` | `2024-10-01-preview` | API version |
| `AZURE_OPENAI_GPT4O_MINI_DEPLOYMENT` | `gpt-4o-mini` | Chat completion model |
| `AZURE_OPENAI_WHISPER_DEPLOYMENT` | `whisper-1` | Audio transcription model |
| `SUPABASE_URL` | Your Supabase project URL | Database connection |
| `SUPABASE_SERVICE_ROLE_KEY` | Your service role key | Database access |

### **Step 3: Test Each Function**

#### **Test analyze-speakers-topics** ✅ (Should already work)
```bash
# This should work since Call Outline is working
node test-topic-analysis.js
```

#### **Test generate-ai-moments** ❌ (Currently failing)
```bash
node test-ai-moments-generation.js
```
Expected: Generate 5-15 comprehensive moments

#### **Test generate-coaching** ❌ (Currently failing)
```bash
# Create test script for coaching
node test-coaching-generation.js
```
Expected: Generate coaching insights and recommendations

## 🎯 **What Each Function Does**

### **1. analyze-speakers-topics** ✅
- **Purpose**: Generates comprehensive call outline with 5-15 topics
- **Input**: Recording transcript
- **Output**: Topics with categories, decisions, questions, objections, action items
- **UI**: Call Outline panel
- **Status**: **WORKING** ✅

### **2. generate-ai-moments** ❌
- **Purpose**: Identifies key conversation moments for timeline
- **Input**: Recording transcript  
- **Output**: 5-15 moments (questions, decisions, pricing, objections, etc.)
- **UI**: Key Moments panel
- **Status**: **FAILING** - Only 1 pattern-matched moment showing

### **3. generate-coaching** ❌
- **Purpose**: Provides AI coaching insights and recommendations
- **Input**: Recording transcript and performance data
- **Output**: Coaching feedback, strengths, improvement areas
- **UI**: Coaching Insights card
- **Status**: **FAILING** - 500 Internal Server Error

## 🧪 **Testing Steps After Fix**

### **1. Test Key Moments**
1. Load a recording with transcript
2. Key Moments section should show 5-15 diverse moments
3. If not, click "Generate AI Moments" button
4. Should see comprehensive results

### **2. Test Coaching Insights**
1. Load a recording with transcript
2. Coaching section should generate insights automatically
3. Should see coaching feedback, strengths, recommendations
4. No more 500 errors in console

### **3. Verify All Working**
All three panels should show rich AI-generated content:
- **Call Outline**: 5-15 comprehensive topics with metadata
- **Key Moments**: 5-15 timeline moments with categories  
- **Coaching Insights**: AI coaching feedback and recommendations

## 🔄 **Alternative: Manual Function Updates**

If CLI deployment fails, manually update via Supabase Dashboard:

1. **Go to**: Supabase Dashboard → Edge Functions
2. **For each failing function**:
   - Find `generate-ai-moments` → Click "Edit"
   - Copy content from `supabase/functions/generate-ai-moments/index.ts`
   - Paste and Save
   - Repeat for `generate-coaching`

## 📊 **Expected Results After Fix**

### **Key Moments Panel** 🔵
- **Before**: 1 pattern-matched moment
- **After**: 5-15 AI moments (questions, decisions, pricing, objections, actions)

### **Coaching Insights** 🎯
- **Before**: 500 error, no insights
- **After**: Comprehensive coaching feedback and recommendations

### **Call Outline** ✅
- **Already working**: 5-15 comprehensive topics with rich metadata

## 🚀 **Quick Test Commands**

Create these test scripts to verify all functions:

```bash
# Test all Edge functions at once
node test-all-edge-functions.js

# Individual tests
node test-ai-moments-generation.js      # Key Moments
node test-coaching-generation.js        # Coaching Insights  
node test-topic-analysis.js             # Call Outline
```

## 💡 **Key Insight**

The pattern is clear: **All AI-powered features need the same Azure OpenAI environment variables**. Once configured properly, all three panels will provide comprehensive AI-powered insights:

1. **Call Outline** ✅ Already working
2. **Key Moments** → Will show 5-15 moments instead of 1
3. **Coaching Insights** → Will generate instead of 500 error

This is a **configuration issue**, not a code issue. The functions are built correctly but can't access Azure OpenAI services!