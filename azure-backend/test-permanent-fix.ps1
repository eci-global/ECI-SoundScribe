# Test script to verify the permanent fix deployment

param(
    [Parameter(Mandatory=$false)]
    [string]$AppServiceName = "soundscribe-backend"
)

Write-Host "🧪 TESTING PERMANENT FIX" -ForegroundColor Green
Write-Host ""

# Test 1: Health Check
Write-Host "📊 Test 1: Health Check..." -ForegroundColor Yellow
try {
    $healthResponse = Invoke-WebRequest -Uri "https://$AppServiceName.azurewebsites.net/health" -Method GET -TimeoutSec 10
    $healthData = $healthResponse.Content | ConvertFrom-Json
    
    Write-Host "✅ Health check passed!" -ForegroundColor Green
    Write-Host "   Version: $($healthData.version)" -ForegroundColor White
    Write-Host "   API Version: $($healthData.apiVersion)" -ForegroundColor White
    Write-Host "   Deployment: $($healthData.deployment)" -ForegroundColor White
    
    if ($healthData.apiVersion -eq "2024-10-01-preview") {
        Write-Host "   ✅ API Version is correct!" -ForegroundColor Green
    } else {
        Write-Host "   ❌ API Version is wrong: $($healthData.apiVersion)" -ForegroundColor Red
    }
} catch {
    Write-Host "❌ Health check failed: $_" -ForegroundColor Red
}

# Test 2: Debug Configuration
Write-Host "`n📊 Test 2: Debug Configuration..." -ForegroundColor Yellow
try {
    $debugResponse = Invoke-WebRequest -Uri "https://$AppServiceName.azurewebsites.net/api/debug-config" -Method GET -TimeoutSec 10
    $debugData = $debugResponse.Content | ConvertFrom-Json
    
    Write-Host "✅ Debug endpoint available!" -ForegroundColor Green
    Write-Host "   Constructed URL: $($debugData.constructedUrl)" -ForegroundColor White
    
    if ($debugData.urlValidation.hasDoubleSlash) {
        Write-Host "   ❌ URL has double slash issue!" -ForegroundColor Red
    } else {
        Write-Host "   ✅ URL format is correct (no double slashes)" -ForegroundColor Green
    }
    
    if ($debugData.urlValidation.apiVersionCorrect) {
        Write-Host "   ✅ API version is correct in config" -ForegroundColor Green
    } else {
        Write-Host "   ❌ API version is incorrect in config" -ForegroundColor Red
    }
    
    Write-Host "`n📋 Environment Variables:" -ForegroundColor Cyan
    $debugData.environment.PSObject.Properties | ForEach-Object {
        if ($_.Value) {
            Write-Host "   $($_.Name): $($_.Value)" -ForegroundColor Gray
        }
    }
    
} catch {
    Write-Host "❌ Debug endpoint failed: $_" -ForegroundColor Red
}

# Test 3: Process Audio Endpoint
Write-Host "`n📊 Test 3: Process Audio Endpoint..." -ForegroundColor Yellow
try {
    $testBody = @{
        recording_id = "test-permanent-fix-$(Get-Date -Format 'yyyyMMddHHmmss')"
        file_url = "https://example.com/test.wav"
        file_size = 1024000
    } | ConvertTo-Json
    
    $processResponse = Invoke-WebRequest -Uri "https://$AppServiceName.azurewebsites.net/api/process-audio" -Method POST -Body $testBody -ContentType "application/json" -TimeoutSec 10
    $processData = $processResponse.Content | ConvertFrom-Json
    
    Write-Host "✅ Process endpoint working!" -ForegroundColor Green
    Write-Host "   Response: $($processData.message)" -ForegroundColor White
    Write-Host "   Transcription enabled: $($processData.transcription_enabled)" -ForegroundColor White
} catch {
    Write-Host "❌ Process endpoint failed: $_" -ForegroundColor Red
}

Write-Host "`n📊 Test Summary:" -ForegroundColor Cyan
Write-Host "If all tests pass, your Azure backend is permanently fixed!" -ForegroundColor White
Write-Host "You can now upload your 8kHz WAV file for transcription." -ForegroundColor White