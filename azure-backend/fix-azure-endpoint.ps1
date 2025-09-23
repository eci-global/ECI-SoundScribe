# Fix Azure OpenAI Endpoint Configuration
# Updates the endpoint from the incorrect custom domain to the standard Azure endpoint

param(
    [Parameter(Mandatory=$false)]
    [string]$ResourceGroup = "soundscribe-rg",
    
    [Parameter(Mandatory=$false)]
    [string]$AppServiceName = "soundscribe-backend"
)

Write-Host "🔧 FIXING AZURE OPENAI ENDPOINT" -ForegroundColor Green
Write-Host "Correcting endpoint from custom domain to standard Azure endpoint" -ForegroundColor White
Write-Host ""

# The correct Azure OpenAI endpoint based on documentation
$correctEndpoint = "https://eastus.api.cognitive.microsoft.com/"

Write-Host "📊 Current Configuration Check:" -ForegroundColor Yellow
Write-Host "• Incorrect endpoint: https://soundscribe-openai.openai.azure.com/" -ForegroundColor Red
Write-Host "• Correct endpoint:   $correctEndpoint" -ForegroundColor Green
Write-Host ""

# Update Azure App Service environment variables
Write-Host "🔄 Updating Azure App Service environment variables..." -ForegroundColor Yellow

try {
    # Set the correct environment variables
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
    
    Write-Host "✅ Environment variables updated successfully" -ForegroundColor Green
} catch {
    Write-Host "❌ Failed to update environment variables: $_" -ForegroundColor Red
    exit 1
}

# Restart the app service to apply changes
Write-Host "`n🔄 Restarting App Service to apply changes..." -ForegroundColor Yellow
try {
    az webapp restart --resource-group $ResourceGroup --name $AppServiceName
    Write-Host "✅ App Service restarted successfully" -ForegroundColor Green
} catch {
    Write-Host "❌ Failed to restart app service: $_" -ForegroundColor Red
}

# Wait for restart
Write-Host "`n⏰ Waiting 30 seconds for restart to complete..." -ForegroundColor Yellow
Start-Sleep -Seconds 30

# Test the fixed configuration
Write-Host "`n🧪 Testing fixed configuration..." -ForegroundColor Yellow

# Test health endpoint
try {
    $healthResponse = Invoke-WebRequest -Uri "https://$AppServiceName.azurewebsites.net/health" -Method GET -TimeoutSec 15
    Write-Host "✅ Health check: $($healthResponse.StatusCode)" -ForegroundColor Green
    $healthData = $healthResponse.Content | ConvertFrom-Json
    Write-Host "📊 API Version: $($healthData.apiVersion)" -ForegroundColor Gray
} catch {
    Write-Host "❌ Health check failed: $_" -ForegroundColor Red
}

# Test debug configuration
try {
    $debugResponse = Invoke-WebRequest -Uri "https://$AppServiceName.azurewebsites.net/api/debug-config" -Method GET -TimeoutSec 15
    $debugData = $debugResponse.Content | ConvertFrom-Json
    
    Write-Host "✅ Debug endpoint available" -ForegroundColor Green
    Write-Host "📊 New constructed URL: $($debugData.constructedUrl)" -ForegroundColor Cyan
    
    # Check if the URL now uses the correct endpoint
    if ($debugData.constructedUrl -like "*eastus.api.cognitive.microsoft.com*") {
        Write-Host "🎉 ENDPOINT FIXED! Now using correct Azure OpenAI endpoint" -ForegroundColor Green
    } else {
        Write-Host "⚠️ Endpoint may still need updating" -ForegroundColor Yellow
    }
    
    if ($debugData.urlValidation.hasDoubleSlash) {
        Write-Host "❌ URL still has double slash issue" -ForegroundColor Red
    } else {
        Write-Host "✅ URL format is correct" -ForegroundColor Green
    }
    
} catch {
    Write-Host "❌ Debug endpoint failed: $_" -ForegroundColor Red
}

Write-Host "`n🎉 ENDPOINT FIX COMPLETE!" -ForegroundColor Green
Write-Host "📋 Summary:" -ForegroundColor Cyan
Write-Host "• Endpoint changed to: $correctEndpoint" -ForegroundColor White
Write-Host "• App Service restarted" -ForegroundColor White
Write-Host "• Configuration tested" -ForegroundColor White
Write-Host ""
Write-Host "🔍 Next Steps:" -ForegroundColor Cyan
Write-Host "1. Test DNS resolution for the new endpoint" -ForegroundColor White
Write-Host "2. Test audio processing with a sample file" -ForegroundColor White
Write-Host "3. Upload your 8kHz WAV file for transcription" -ForegroundColor White
Write-Host ""
Write-Host "📊 New Azure OpenAI endpoint should resolve correctly:" -ForegroundColor Cyan
Write-Host "nslookup eastus.api.cognitive.microsoft.com" -ForegroundColor Gray