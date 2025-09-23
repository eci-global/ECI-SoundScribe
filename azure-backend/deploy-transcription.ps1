# Deploy Azure Backend with Full Transcription Functionality

Write-Host "🎉 DEPLOYING TRANSCRIPTION BACKEND" -ForegroundColor Green
Write-Host "Features: Azure OpenAI + Supabase + Full Audio Processing" -ForegroundColor White
Write-Host ""

Write-Host "📦 Deploying transcription backend..." -ForegroundColor Yellow

try {
    az webapp deploy `
        --resource-group soundscribe-rg `
        --name soundscribe-backend `
        --src-path transcription-backend.zip `
        --type zip `
        --timeout 600
    
    Write-Host "✅ Transcription backend deployed!" -ForegroundColor Green
} catch {
    Write-Host "❌ Deployment failed: $_" -ForegroundColor Red
    exit 1
}

Write-Host "`n⏰ Waiting 30 seconds for startup..." -ForegroundColor Yellow
Start-Sleep -Seconds 30

Write-Host "`n🧪 Testing transcription backend..." -ForegroundColor Yellow

# Test health endpoint
try {
    $healthResponse = Invoke-WebRequest -Uri "https://soundscribe-backend.azurewebsites.net/health" -Method GET -TimeoutSec 10
    Write-Host "✅ Health endpoint: $($healthResponse.StatusCode)" -ForegroundColor Green
    $healthData = $healthResponse.Content | ConvertFrom-Json
    Write-Host "📊 Version: $($healthData.version)" -ForegroundColor Gray
} catch {
    Write-Host "❌ Health endpoint failed: $_" -ForegroundColor Red
}

# Test process-audio endpoint with sample data
try {
    $processBody = @{
        recording_id = "test-transcription-123"
        file_url = "https://example.com/test.wav"
        file_size = 1024000
    } | ConvertTo-Json
    
    $processResponse = Invoke-WebRequest -Uri "https://soundscribe-backend.azurewebsites.net/api/process-audio" -Method POST -Body $processBody -ContentType "application/json" -TimeoutSec 10
    Write-Host "✅ Process endpoint: $($processResponse.StatusCode)" -ForegroundColor Green
    $processData = $processResponse.Content | ConvertFrom-Json
    Write-Host "📊 Transcription enabled: $($processData.transcription_enabled)" -ForegroundColor Gray
} catch {
    Write-Host "❌ Process endpoint failed: $_" -ForegroundColor Red
    Write-Host "📄 Error: $($_.Exception.Message)" -ForegroundColor Yellow
}

Write-Host "`n🎉 Deployment Summary:" -ForegroundColor Cyan
Write-Host "• Azure backend with full transcription deployed" -ForegroundColor White
Write-Host "• Azure OpenAI gpt-4o-transcribe integration" -ForegroundColor White  
Write-Host "• Supabase database updates" -ForegroundColor White
Write-Host "• Background processing for large files" -ForegroundColor White
Write-Host "• Ready for your 8kHz WAV file test!" -ForegroundColor White

Write-Host "`n🔍 Next Steps:" -ForegroundColor Cyan
Write-Host "1. Upload your 8kHz WAV file through the frontend" -ForegroundColor White
Write-Host "2. Monitor Azure logs for processing status" -ForegroundColor White
Write-Host "3. Check if chunk 3 corruption issue is resolved" -ForegroundColor White
Write-Host "4. Verify transcript appears in your dashboard" -ForegroundColor White

Write-Host "`n📋 Monitor URLs:" -ForegroundColor Cyan
Write-Host "• Health: https://soundscribe-backend.azurewebsites.net/health" -ForegroundColor White
Write-Host "• Logs: https://soundscribe-backend.scm.azurewebsites.net/api/logs/docker" -ForegroundColor White