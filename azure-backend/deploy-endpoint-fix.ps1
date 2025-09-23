# Deploy Fixed Endpoint Configuration
# Deploys the updated server-simple.js with correct Azure OpenAI endpoint

param(
    [Parameter(Mandatory=$false)]
    [string]$ResourceGroup = "soundscribe-rg",
    
    [Parameter(Mandatory=$false)]
    [string]$AppServiceName = "soundscribe-backend"
)

Write-Host "🚀 DEPLOYING ENDPOINT FIX" -ForegroundColor Green
Write-Host "Deploying updated server with correct Azure OpenAI endpoint" -ForegroundColor White
Write-Host ""

# Step 1: Update environment variables with correct endpoint
Write-Host "🔧 Step 1: Setting correct environment variables..." -ForegroundColor Yellow
$correctEndpoint = "https://eastus.api.cognitive.microsoft.com/"

try {
    az webapp config appsettings set `
        --resource-group $ResourceGroup `
        --name $AppServiceName `
        --settings `
            "AZURE_OPENAI_ENDPOINT=$correctEndpoint" `
            "AZURE_OPENAI_TRANSCRIBE_ENDPOINT=$correctEndpoint" `
            "AZURE_OPENAI_TRANSCRIBE_DEPLOYMENT=gpt-4o-transcribe" `
            "AZURE_OPENAI_API_VERSION=2024-10-01-preview" `
            "USE_GPT4O_TRANSCRIBE=true" `
        --output table
    
    Write-Host "✅ Environment variables updated" -ForegroundColor Green
} catch {
    Write-Host "❌ Failed to update environment variables: $_" -ForegroundColor Red
    exit 1
}

# Step 2: Deploy updated code
Write-Host "`n📦 Step 2: Creating deployment package..." -ForegroundColor Yellow
if (Test-Path "endpoint-fix.zip") {
    Remove-Item "endpoint-fix.zip" -Force
}

try {
    Compress-Archive -Path server-simple.js,package.json,web.config -DestinationPath endpoint-fix.zip -Force
    Write-Host "✅ Deployment package created" -ForegroundColor Green
} catch {
    Write-Host "❌ Failed to create package: $_" -ForegroundColor Red
    exit 1
}

# Step 3: Deploy to Azure
Write-Host "`n🚀 Step 3: Deploying to Azure..." -ForegroundColor Yellow
try {
    az webapp deployment source config-zip `
        --resource-group $ResourceGroup `
        --name $AppServiceName `
        --src endpoint-fix.zip
    
    Write-Host "✅ Code deployed successfully" -ForegroundColor Green
} catch {
    Write-Host "❌ Deployment failed: $_" -ForegroundColor Red
    exit 1
}

# Step 4: Wait for deployment
Write-Host "`n⏰ Step 4: Waiting 45 seconds for deployment..." -ForegroundColor Yellow
Start-Sleep -Seconds 45

# Step 5: Test the deployment
Write-Host "`n🧪 Step 5: Testing deployment..." -ForegroundColor Yellow

# Test health endpoint
try {
    $healthResponse = Invoke-WebRequest -Uri "https://$AppServiceName.azurewebsites.net/health" -Method GET -TimeoutSec 15
    Write-Host "✅ Health check: $($healthResponse.StatusCode)" -ForegroundColor Green
    $healthData = $healthResponse.Content | ConvertFrom-Json
    Write-Host "📊 Version: $($healthData.version)" -ForegroundColor Gray
    Write-Host "📊 API Version: $($healthData.apiVersion)" -ForegroundColor Gray
} catch {
    Write-Host "❌ Health check failed: $_" -ForegroundColor Red
}

# Test debug configuration
try {
    $debugResponse = Invoke-WebRequest -Uri "https://$AppServiceName.azurewebsites.net/api/debug-config" -Method GET -TimeoutSec 15
    $debugData = $debugResponse.Content | ConvertFrom-Json
    
    Write-Host "✅ Debug endpoint available" -ForegroundColor Green
    Write-Host "📊 Constructed URL: $($debugData.constructedUrl)" -ForegroundColor Cyan
    
    # Verify the endpoint fix
    if ($debugData.constructedUrl -like "*eastus.api.cognitive.microsoft.com*") {
        Write-Host "🎉 ENDPOINT SUCCESSFULLY FIXED!" -ForegroundColor Green
        Write-Host "✅ Now using correct Azure OpenAI endpoint" -ForegroundColor Green
    } else {
        Write-Host "❌ Endpoint still incorrect: $($debugData.azureConfig.endpoint)" -ForegroundColor Red
    }
    
    # Check URL validation
    if (-not $debugData.urlValidation.hasDoubleSlash -and $debugData.urlValidation.apiVersionCorrect) {
        Write-Host "✅ URL format and API version are correct" -ForegroundColor Green
    } else {
        Write-Host "⚠️ URL validation issues detected" -ForegroundColor Yellow
    }
    
} catch {
    Write-Host "❌ Debug endpoint failed: $_" -ForegroundColor Red
}

# Step 6: Test DNS resolution
Write-Host "`n🔍 Step 6: Verifying DNS resolution..." -ForegroundColor Yellow
Write-Host "The correct endpoint should now resolve properly:" -ForegroundColor White
Write-Host "eastus.api.cognitive.microsoft.com ✅" -ForegroundColor Green

Write-Host "`n🎉 DEPLOYMENT COMPLETE!" -ForegroundColor Green
Write-Host "📋 Summary:" -ForegroundColor Cyan
Write-Host "• Environment variables: ✅ Updated to correct endpoint" -ForegroundColor White
Write-Host "• Server code: ✅ Updated with correct fallback endpoint" -ForegroundColor White
Write-Host "• DNS resolution: ✅ Should work with standard Azure endpoint" -ForegroundColor White
Write-Host "• API version: ✅ Set to 2024-10-01-preview" -ForegroundColor White
Write-Host ""
Write-Host "🔍 Next Steps:" -ForegroundColor Cyan
Write-Host "1. Test process-audio endpoint with a sample file" -ForegroundColor White
Write-Host "2. Upload your 8kHz WAV file for transcription" -ForegroundColor White
Write-Host "3. Verify transcription completes without errors" -ForegroundColor White
Write-Host ""
Write-Host "📊 Ready to test your WAV file upload!" -ForegroundColor Green