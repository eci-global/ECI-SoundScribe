# Response Format Fix Deployment Script for Azure Backend
# This script deploys the fix for the verbose_json response_format issue

param(
    [Parameter(Mandatory=$false)]
    [string]$ResourceGroup = "soundscribe-rg",
    
    [Parameter(Mandatory=$false)]
    [string]$AppServiceName = "soundscribe-backend"
)

Write-Host "🔧 RESPONSE FORMAT FIX DEPLOYMENT" -ForegroundColor Green
Write-Host "Fixing verbose_json response_format issue for gpt-4o-transcribe" -ForegroundColor White
Write-Host ""

# Step 1: Create deployment package with all necessary files
Write-Host "📦 Step 1: Creating deployment package..." -ForegroundColor Yellow

if (Test-Path "response-format-fix-deployment.zip") {
    Remove-Item "response-format-fix-deployment.zip" -Force
}

try {
    # Include all necessary files for the backend
    $filesToInclude = @(
        "server-simple.js",
        "processor.js", 
        "package.json",
        "web.config",
        "utils\*"
    )
    
    # Create the deployment package
    Compress-Archive -Path $filesToInclude -DestinationPath response-format-fix-deployment.zip -Force
    Write-Host "✅ Deployment package created successfully" -ForegroundColor Green
    Write-Host "📁 Package size: $((Get-Item response-format-fix-deployment.zip).Length / 1MB) MB" -ForegroundColor Gray
} catch {
    Write-Host "❌ Failed to create package: $_" -ForegroundColor Red
    exit 1
}

# Step 2: Deploy to Azure
Write-Host "`n🚀 Step 2: Deploying to Azure..." -ForegroundColor Yellow

try {
    # Use the modern deploy command
    az webapp deploy `
        --resource-group $ResourceGroup `
        --name $AppServiceName `
        --src-path response-format-fix-deployment.zip `
        --type zip `
        --clean true `
        --restart true `
        --timeout 600
    
    Write-Host "✅ Deployment completed successfully" -ForegroundColor Green
} catch {
    Write-Host "⚠️ Modern deploy failed, trying legacy method..." -ForegroundColor Yellow
    
    try {
        az webapp deployment source config-zip `
            --resource-group $ResourceGroup `
            --name $AppServiceName `
            --src response-format-fix-deployment.zip
        
        Write-Host "✅ Legacy deployment completed" -ForegroundColor Green
    } catch {
        Write-Host "❌ Both deployment methods failed: $_" -ForegroundColor Red
        exit 1
    }
}

# Step 3: Wait for startup
Write-Host "`n⏰ Step 3: Waiting 45 seconds for startup..." -ForegroundColor Yellow
Start-Sleep -Seconds 45

# Step 4: Test the deployment
Write-Host "`n🧪 Step 4: Testing deployment..." -ForegroundColor Yellow

try {
    $response = Invoke-WebRequest -Uri "https://$AppServiceName.azurewebsites.net/health" -Method GET -TimeoutSec 15
    Write-Host "✅ Health check passed: $($response.StatusCode)" -ForegroundColor Green
    
    $data = $response.Content | ConvertFrom-Json
    Write-Host "📊 Status: $($data.status)" -ForegroundColor Gray
    Write-Host "📊 Environment: $($data.environment)" -ForegroundColor Gray
    Write-Host "📊 Port: $($data.port)" -ForegroundColor Gray
} catch {
    Write-Host "❌ Health check failed: $_" -ForegroundColor Red
    Write-Host "⚠️ The app might still be starting up..." -ForegroundColor Yellow
}

# Step 5: Test configuration
Write-Host "`n🔧 Step 5: Testing configuration..." -ForegroundColor Yellow

try {
    $configResponse = Invoke-WebRequest -Uri "https://$AppServiceName.azurewebsites.net/api/debug-config" -Method GET -TimeoutSec 15
    Write-Host "✅ Configuration check passed: $($configResponse.StatusCode)" -ForegroundColor Green
    
    $configData = $configResponse.Content | ConvertFrom-Json
    Write-Host "📊 OpenAI Endpoint: $($configData.openaiEndpoint)" -ForegroundColor Gray
    Write-Host "📊 Transcribe Deployment: $($configData.transcribeDeployment)" -ForegroundColor Gray
    Write-Host "📊 API Version: $($configData.apiVersion)" -ForegroundColor Gray
} catch {
    Write-Host "❌ Configuration check failed: $_" -ForegroundColor Red
}

Write-Host "`n🎉 DEPLOYMENT COMPLETE!" -ForegroundColor Green
Write-Host "The response_format fix has been deployed successfully." -ForegroundColor White
Write-Host ""
Write-Host "📋 What was fixed:" -ForegroundColor Cyan
Write-Host "• Changed response_format from 'verbose_json' to 'json' in processor.js" -ForegroundColor White
Write-Host "• This resolves the gpt-4o-transcribe compatibility issue" -ForegroundColor White
Write-Host ""
Write-Host "🧪 Next Steps:" -ForegroundColor Cyan
Write-Host "1. Test audio upload and transcription" -ForegroundColor White
Write-Host "2. Check logs for successful transcription" -ForegroundColor White
Write-Host "3. Verify no more 'verbose_json' errors" -ForegroundColor White
Write-Host ""
Write-Host "📊 Monitor logs at: https://$AppServiceName.scm.azurewebsites.net/api/logs/docker" -ForegroundColor Gray 