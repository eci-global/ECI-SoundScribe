# Deploy Fixed Azure OpenAI Configuration

Write-Host "🔧 DEPLOYING FIXED AZURE OPENAI CONFIG" -ForegroundColor Green
Write-Host "Fixes: Double slash removal + API version correction" -ForegroundColor White
Write-Host ""

Write-Host "📦 Deploying fixed configuration..." -ForegroundColor Yellow

try {
    az webapp deploy `
        --resource-group soundscribe-rg `
        --name soundscribe-backend `
        --src-path fixed-azure-config.zip `
        --type zip `
        --timeout 300
    
    Write-Host "✅ Fixed configuration deployed!" -ForegroundColor Green
} catch {
    Write-Host "❌ Deployment failed: $_" -ForegroundColor Red
    exit 1
}

Write-Host "`n⏰ Waiting 20 seconds for update..." -ForegroundColor Yellow
Start-Sleep -Seconds 20

Write-Host "`n🧪 Testing fixed configuration..." -ForegroundColor Yellow

# Test health endpoint
try {
    $healthResponse = Invoke-WebRequest -Uri "https://soundscribe-backend.azurewebsites.net/health" -Method GET -TimeoutSec 10
    Write-Host "✅ Health endpoint: $($healthResponse.StatusCode)" -ForegroundColor Green
} catch {
    Write-Host "❌ Health endpoint failed: $_" -ForegroundColor Red
}

Write-Host "`n🎉 Configuration Fix Summary:" -ForegroundColor Cyan
Write-Host "• Fixed double slash in Azure OpenAI URLs" -ForegroundColor White
Write-Host "• Updated API version to 2024-10-01-preview" -ForegroundColor White
Write-Host "• Added URL cleaning and validation" -ForegroundColor White
Write-Host "• Enhanced error logging for debugging" -ForegroundColor White

Write-Host "`n🔍 Ready for Test:" -ForegroundColor Cyan
Write-Host "• Upload your 8kHz WAV file again" -ForegroundColor White
Write-Host "• Should see successful Azure OpenAI connection" -ForegroundColor White
Write-Host "• Monitor logs for improved debugging info" -ForegroundColor White
Write-Host "• Transcription should complete successfully" -ForegroundColor White

Write-Host "`n📋 Monitor:" -ForegroundColor Cyan
Write-Host "• Logs: https://soundscribe-backend.scm.azurewebsites.net/api/logs/docker" -ForegroundColor White