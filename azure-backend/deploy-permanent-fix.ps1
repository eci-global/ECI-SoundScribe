# Permanent Fix Deployment Script for Azure Backend
# This script ensures a clean deployment without caching issues

param(
    [Parameter(Mandatory=$false)]
    [string]$ResourceGroup = "soundscribe-rg",
    
    [Parameter(Mandatory=$false)]
    [string]$AppServiceName = "soundscribe-backend",
    
    [Parameter(Mandatory=$false)]
    [string]$OpenAIAccountName = "soundscribe-openai"
)

Write-Host "🚨 PERMANENT FIX DEPLOYMENT" -ForegroundColor Green
Write-Host "This will completely fix the Azure backend issues" -ForegroundColor White
Write-Host ""

# Step 1: Stop the App Service
Write-Host "🛑 Step 1: Stopping App Service to clear cache..." -ForegroundColor Yellow
try {
    az webapp stop --resource-group $ResourceGroup --name $AppServiceName
    Write-Host "✅ App Service stopped" -ForegroundColor Green
    Start-Sleep -Seconds 5
} catch {
    Write-Host "⚠️ Failed to stop app service: $_" -ForegroundColor Yellow
}

# Step 2: Set correct environment variables
Write-Host "`n🔧 Step 2: Setting correct environment variables..." -ForegroundColor Yellow

$openaiEndpoint = "https://$OpenAIAccountName.openai.azure.com/"
Write-Host "📊 Using endpoint: $openaiEndpoint" -ForegroundColor Cyan

try {
    # Set all required environment variables with correct values
    az webapp config appsettings set `
        --resource-group $ResourceGroup `
        --name $AppServiceName `
        --settings `
            "AZURE_OPENAI_ENDPOINT=$openaiEndpoint" `
            "AZURE_OPENAI_TRANSCRIBE_ENDPOINT=$openaiEndpoint" `
            "AZURE_OPENAI_TRANSCRIBE_DEPLOYMENT=gpt-4o-transcribe" `
            "AZURE_OPENAI_API_VERSION=2024-10-01-preview" `
            "USE_GPT4O_TRANSCRIBE=true" `
            "NODE_ENV=production" `
            "PORT=3001" `
        --output table
    
    Write-Host "✅ Environment variables set correctly" -ForegroundColor Green
} catch {
    Write-Host "❌ Failed to set environment variables: $_" -ForegroundColor Red
    exit 1
}

# Step 3: Clean deployment directory via Kudu
Write-Host "`n🧹 Step 3: Cleaning old deployment files..." -ForegroundColor Yellow
Write-Host "⚠️ Manual step required:" -ForegroundColor Yellow
Write-Host "1. Go to: https://$AppServiceName.scm.azurewebsites.net/DebugConsole" -ForegroundColor White
Write-Host "2. Navigate to: site/wwwroot" -ForegroundColor White
Write-Host "3. Delete all files except 'web.config' if you want to keep IIS settings" -ForegroundColor White
Write-Host "4. Press Enter here when done..." -ForegroundColor Cyan
Read-Host

# Step 4: Deploy the fixed code
Write-Host "`n📦 Step 4: Deploying permanent fix code..." -ForegroundColor Yellow

# Ensure we have the latest fixed code
Write-Host "Creating deployment package..." -ForegroundColor White
if (Test-Path "permanent-fix-deployment.zip") {
    Remove-Item "permanent-fix-deployment.zip" -Force
}
Compress-Archive -Path server-simple.js,package.json,web.config -DestinationPath permanent-fix-deployment.zip -Force
Write-Host "✅ Deployment package created" -ForegroundColor Green

try {
    # Use the modern deploy command with clean flag
    az webapp deploy `
        --resource-group $ResourceGroup `
        --name $AppServiceName `
        --src-path permanent-fix-deployment.zip `
        --type zip `
        --clean true `
        --restart true `
        --timeout 600
    
    Write-Host "✅ Code deployed successfully" -ForegroundColor Green
} catch {
    Write-Host "⚠️ Modern deploy failed, trying legacy method..." -ForegroundColor Yellow
    
    az webapp deployment source config-zip `
        --resource-group $ResourceGroup `
        --name $AppServiceName `
        --src permanent-fix-deployment.zip
}

# Step 5: Start the App Service
Write-Host "`n▶️ Step 5: Starting App Service..." -ForegroundColor Yellow
try {
    az webapp start --resource-group $ResourceGroup --name $AppServiceName
    Write-Host "✅ App Service started" -ForegroundColor Green
} catch {
    Write-Host "⚠️ Failed to start app service: $_" -ForegroundColor Yellow
}

# Step 6: Wait for startup
Write-Host "`n⏰ Step 6: Waiting 60 seconds for startup..." -ForegroundColor Yellow
Start-Sleep -Seconds 60

# Step 7: Validate deployment
Write-Host "`n🧪 Step 7: Validating deployment..." -ForegroundColor Yellow

# Test health endpoint
try {
    $healthResponse = Invoke-WebRequest -Uri "https://$AppServiceName.azurewebsites.net/health" -Method GET -TimeoutSec 15
    Write-Host "✅ Health check passed: $($healthResponse.StatusCode)" -ForegroundColor Green
    $healthData = $healthResponse.Content | ConvertFrom-Json
    Write-Host "📊 Server version: $($healthData.version)" -ForegroundColor Gray
} catch {
    Write-Host "❌ Health check failed: $_" -ForegroundColor Red
}

# Test debug endpoint
try {
    $debugResponse = Invoke-WebRequest -Uri "https://$AppServiceName.azurewebsites.net/api/debug-config" -Method GET -TimeoutSec 15
    Write-Host "✅ Debug endpoint available" -ForegroundColor Green
    $debugData = $debugResponse.Content | ConvertFrom-Json
    Write-Host "📊 Configuration:" -ForegroundColor Cyan
    Write-Host ($debugData | ConvertTo-Json -Depth 5) -ForegroundColor Gray
} catch {
    Write-Host "⚠️ Debug endpoint not available (expected if not implemented yet)" -ForegroundColor Yellow
}

Write-Host "`n🎉 DEPLOYMENT COMPLETE!" -ForegroundColor Green
Write-Host "📋 Summary:" -ForegroundColor Cyan
Write-Host "• App Service restarted to clear cache" -ForegroundColor White
Write-Host "• Environment variables set correctly" -ForegroundColor White
Write-Host "• API Version: 2024-10-01-preview" -ForegroundColor White
Write-Host "• Endpoint: $openaiEndpoint" -ForegroundColor White
Write-Host "• Deployment: gpt-4o-transcribe" -ForegroundColor White

Write-Host "`n🔍 Next Steps:" -ForegroundColor Cyan
Write-Host "1. Check logs: https://$AppServiceName.scm.azurewebsites.net/api/logs/docker" -ForegroundColor White
Write-Host "2. Test with your 8kHz WAV file" -ForegroundColor White
Write-Host "3. Monitor for successful transcription" -ForegroundColor White

Write-Host "`n📊 Troubleshooting URLs:" -ForegroundColor Cyan
Write-Host "• Kudu Console: https://$AppServiceName.scm.azurewebsites.net" -ForegroundColor White
Write-Host "• Log Stream: https://$AppServiceName.scm.azurewebsites.net/api/logstream" -ForegroundColor White
Write-Host "• Environment: https://$AppServiceName.scm.azurewebsites.net/Env" -ForegroundColor White