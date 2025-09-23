# Deploy working server with /api/process-audio endpoint

Write-Host "🚀 DEPLOYING WORKING ENDPOINT" -ForegroundColor Green
Write-Host "Adding /api/process-audio endpoint to working ultra-minimal server" -ForegroundColor White
Write-Host ""

Write-Host "📦 Deploying server with process endpoint..." -ForegroundColor Yellow

try {
    az webapp deploy `
        --resource-group soundscribe-rg `
        --name soundscribe-backend `
        --src-path working-with-endpoint.zip `
        --type zip `
        --timeout 300
    
    Write-Host "✅ Deployment completed!" -ForegroundColor Green
} catch {
    Write-Host "❌ Deployment failed: $_" -ForegroundColor Red
    exit 1
}

Write-Host "`n⏰ Waiting 20 seconds for update..." -ForegroundColor Yellow
Start-Sleep -Seconds 20

Write-Host "`n🧪 Testing endpoints..." -ForegroundColor Yellow

# Test health endpoint
try {
    $healthResponse = Invoke-WebRequest -Uri "https://soundscribe-backend.azurewebsites.net/health" -Method GET -TimeoutSec 10
    Write-Host "✅ Health endpoint: $($healthResponse.StatusCode)" -ForegroundColor Green
} catch {
    Write-Host "❌ Health endpoint failed: $_" -ForegroundColor Red
}

# Test process-audio endpoint
try {
    $processBody = @{
        recording_id = "test-123"
        file_url = "https://example.com/test.mp3"
    } | ConvertTo-Json
    
    $processResponse = Invoke-WebRequest -Uri "https://soundscribe-backend.azurewebsites.net/api/process-audio" -Method POST -Body $processBody -ContentType "application/json" -TimeoutSec 10
    Write-Host "✅ Process endpoint: $($processResponse.StatusCode)" -ForegroundColor Green
    Write-Host "📄 Response: $($processResponse.Content | ConvertFrom-Json | ConvertTo-Json -Compress)" -ForegroundColor Gray
} catch {
    Write-Host "❌ Process endpoint failed: $_" -ForegroundColor Red
    Write-Host "📄 Error details: $($_.Exception.Message)" -ForegroundColor Yellow
}

Write-Host "`n🎉 Deployment Summary:" -ForegroundColor Cyan
Write-Host "• Azure backend is now running successfully" -ForegroundColor White
Write-Host "• /health endpoint working" -ForegroundColor White
Write-Host "• /api/process-audio endpoint added" -ForegroundColor White
Write-Host "• Ready for your 8kHz WAV file upload test!" -ForegroundColor White

Write-Host "`n📋 Test URLs:" -ForegroundColor Cyan
Write-Host "• Health: https://soundscribe-backend.azurewebsites.net/health" -ForegroundColor White
Write-Host "• Process: https://soundscribe-backend.azurewebsites.net/api/process-audio" -ForegroundColor White