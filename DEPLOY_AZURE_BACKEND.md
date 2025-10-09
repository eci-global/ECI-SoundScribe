# Deploy Azure Backend with Employee Auto-Detection

## 🎯 What We're Fixing

The Azure backend currently processes recordings but SKIPS the employee detection and scorecard generation steps. We need to deploy the updated code that includes `postProcessEmployeeForRecording`.

## 📊 Current Status

✅ **Frontend** - Deployed and working
✅ **Supabase Edge Functions** - Deployed and working
✅ **RLS Policies** - Fixed
❌ **Azure Backend** - Running OLD code without employee auto-detection

## 🔍 Evidence

Looking at Azure logs (`Browser Console Errors data.txt`):
- Processing completes at line 165
- NO "Employee post-processing" message
- NO "extract-employee-name" call
- NO "generate-employee-scorecard" call

The code exists in `azure-backend/processor.js:497-503` but isn't running in production.

---

## ✅ Step 1: Verify Environment Variables in Azure

The Azure App Service needs this environment variable:

```
SUPABASE_SERVICE_ROLE_KEY=eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6InFpbmtsZGd2ZWpoZXBwaGV5a2ZsIiwicm9sZSI6InNlcnZpY2Vfcm9sZSIsImlhdCI6MTc0OTU5MDQ0NywiZXhwIjoyMDY1MTY2NDQ3fQ.kzYjtO7X0ECTfydiyCrt13WD4hnoknlYThqVia-jwo4
```

### To Check/Add in Azure Portal:

1. Go to https://portal.azure.com
2. Navigate to **soundscribe-backend** App Service
3. Click **Configuration** (left sidebar)
4. Under **Application settings**, look for `SUPABASE_SERVICE_ROLE_KEY`
5. If it's missing or wrong, click **+ New application setting**:
   - Name: `SUPABASE_SERVICE_ROLE_KEY`
   - Value: (paste the key above)
6. Click **Save** at the top
7. Click **Continue** when prompted to restart

---

## 🚀 Step 2: Deploy Updated Code to Azure

You have **4 deployment options**:

### Option A: Deploy via VS Code (Easiest if you have Azure Extension)

1. Open VS Code
2. Install Azure App Service extension (if not already installed)
3. Sign in to Azure account
4. Right-click on `azure-backend` folder
5. Select **Deploy to Web App...**
6. Choose **soundscribe-backend**
7. Confirm deployment

### Option B: Deploy via Azure CLI

```bash
# Login to Azure
az login

# Navigate to azure-backend
cd azure-backend

# Create deployment ZIP
zip -r deploy.zip . -x "node_modules/*" -x ".git/*"

# Deploy to Azure
az webapp deployment source config-zip \
  --resource-group soundscribe-rg \
  --name soundscribe-backend \
  --src deploy.zip

# Check deployment status
az webapp log tail \
  --resource-group soundscribe-rg \
  --name soundscribe-backend
```

### Option C: Deploy via GitHub Actions (If Connected)

If your Azure App Service is connected to GitHub:

1. Push changes to your repository:
   ```bash
   git add azure-backend/
   git commit -m "feat: add employee auto-detection to Azure backend"
   git push origin main
   ```

2. GitHub Actions will automatically deploy
3. Monitor at: https://github.com/YOUR_USERNAME/YOUR_REPO/actions

### Option D: Manual FTP Deployment

1. Go to Azure Portal → soundscribe-backend
2. Click **Deployment Center** (left sidebar)
3. Click **FTPS credentials** tab
4. Use an FTP client to upload files from `azure-backend/` to the Azure server
5. Restart the App Service after upload

---

## 🧪 Step 3: Verify Deployment

After deploying, check that it's working:

### 3.1 Check Azure Logs

```bash
# Via Azure CLI
az webapp log tail \
  --resource-group soundscribe-rg \
  --name soundscribe-backend

# Or via Azure Portal
# Go to soundscribe-backend → Monitoring → Log stream
```

### 3.2 Upload a Test Recording

1. Upload a new test recording
2. Wait for processing to complete
3. Check logs for:
   ```
   ✅ Processing completed successfully for recording: [id]
   👤 Employee post-processing summary: {
     participationChecked: true,
     participationCreated: true,
     scorecardCreated: true
   }
   ```

### 3.3 Verify Auto-Linking

1. Check the employee's profile page
2. Recording should automatically appear
3. Scorecard should be generated

---

## 🔧 Step 4: Troubleshooting

### Issue 1: "Function Not Found" Error

**Symptom**: Logs show `postProcessEmployeeForRecording is not defined`

**Fix**:
1. Verify `azure-backend/supabase.js` was uploaded
2. Check `azure-backend/processor.js` line 499 has correct import
3. Restart the App Service

### Issue 2: "extract-employee-name failed"

**Symptom**: Logs show employee detection running but failing

**Fix**:
1. Verify `SUPABASE_SERVICE_ROLE_KEY` is set correctly in Azure
2. Check Supabase Edge Function `extract-employee-name` is deployed
3. Verify RLS policies allow service role access

### Issue 3: Deployment Fails

**Symptom**: Deployment errors or App Service won't start

**Fix**:
1. Check `azure-backend/package.json` has all dependencies
2. Verify Node.js version matches (`node -v` locally vs Azure settings)
3. Check Application Insights for startup errors

### Issue 4: Old Code Still Running

**Symptom**: Deployment succeeded but logs don't show new code

**Fix**:
1. **Restart the App Service**:
   - Azure Portal → soundscribe-backend → Overview
   - Click **Restart** at the top
   - Wait 2-3 minutes
2. Clear Azure's deployment cache:
   ```bash
   az webapp restart \
     --resource-group soundscribe-rg \
     --name soundscribe-backend
   ```

---

## 📋 Deployment Checklist

Before deploying, ensure:

- [ ] `azure-backend/processor.js` has `postProcessEmployeeForRecording` call (line 497-503)
- [ ] `azure-backend/supabase.js` has `postProcessEmployeeForRecording` function (line 230-291)
- [ ] `SUPABASE_SERVICE_ROLE_KEY` is set in Azure App Service configuration
- [ ] `SUPABASE_URL` is set in Azure (should already exist)
- [ ] All `package.json` dependencies are listed
- [ ] No syntax errors (run `npm run lint` if available)

After deploying:

- [ ] App Service restarted successfully
- [ ] Azure logs show "Employee post-processing" messages
- [ ] Test recording auto-links to employee profile
- [ ] Scorecard is automatically generated

---

## 🎉 Expected Outcome

After successful deployment, when you upload a new recording:

1. **Azure Backend** processes the audio
2. **Transcription** completes
3. **AI Analysis** runs (summary, insights, coaching)
4. **NEW: Employee Detection** runs automatically 🎯
   - Calls `extract-employee-name` Edge Function
   - Detects employee name in transcript
   - Creates `employee_call_participation` record
5. **NEW: Scorecard Generation** runs automatically 🎯
   - Calls `generate-employee-scorecard` Edge Function
   - Analyzes performance
   - Creates scorecard with strengths/improvements
6. **Profile Page** shows recording immediately (no manual linking needed!)

---

## 🔐 Security Note

The `SUPABASE_SERVICE_ROLE_KEY` is a sensitive credential. It's safe to add to Azure App Service environment variables because:

1. Azure encrypts environment variables at rest
2. Only authorized Azure users can view them
3. The backend needs this key to bypass RLS policies for automatic processing
4. It's already used for other Supabase operations in your backend

If you ever need to rotate it:
1. Go to Supabase Dashboard → Settings → API
2. Click "Roll service_role key"
3. Update the environment variable in Azure
4. Restart the App Service

---

## 📞 Quick Deploy Commands

```bash
# Quick deploy via Azure CLI
cd /c/Projects/ECI-SoundScribe/azure-backend
az webapp up --name soundscribe-backend --resource-group soundscribe-rg

# Or create and deploy ZIP
zip -r ../backend-deploy.zip . -x "node_modules/*"
cd ..
az webapp deployment source config-zip \
  --resource-group soundscribe-rg \
  --name soundscribe-backend \
  --src backend-deploy.zip

# Check logs
az webapp log tail --resource-group soundscribe-rg --name soundscribe-backend
```

---

## ✅ Success Criteria

You'll know it's working when:

1. **Azure logs** show:
   ```
   👤 Employee post-processing summary: {
     participationChecked: true,
     participationCreated: true,
     scorecardCreated: true
   }
   ```

2. **New recordings** automatically appear on employee profiles without manual linking

3. **Scorecards** are automatically generated with strengths and improvements

4. **No more manual fixes needed** for future uploads!

---

**Need help deploying?** Let me know which deployment method you prefer (VS Code, Azure CLI, GitHub, or FTP) and I can walk you through it step by step!
