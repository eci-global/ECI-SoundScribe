# Diagnose deployment issues with comprehensive testing

param(
    [Parameter(Mandatory=$false)]
    [string]$AppServiceName = "soundscribe-backend"
)

Write-Host "🔍 DIAGNOSING DEPLOYMENT" -ForegroundColor Green
Write-Host "Testing with longer timeouts and detailed analysis" -ForegroundColor White
Write-Host ""

# Test 1: Basic connectivity with longer timeout
Write-Host "📊 Test 1: Basic connectivity (60s timeout)..." -ForegroundColor Yellow
try {
    $response = Invoke-WebRequest -Uri "https://$AppServiceName.azurewebsites.net/" -Method GET -TimeoutSec 60
    Write-Host "✅ Basic connectivity: $($response.StatusCode)" -ForegroundColor Green
    Write-Host "📄 Response length: $($response.Content.Length) characters" -ForegroundColor Gray
} catch {
    Write-Host "❌ Basic connectivity failed: $_" -ForegroundColor Red
    Write-Host "📊 Error type: $($_.Exception.GetType().Name)" -ForegroundColor Yellow
}

# Test 2: Health endpoint with extended timeout
Write-Host "`n📊 Test 2: Health endpoint (60s timeout)..." -ForegroundColor Yellow
try {
    $healthResponse = Invoke-WebRequest -Uri "https://$AppServiceName.azurewebsites.net/health" -Method GET -TimeoutSec 60
    $healthData = $healthResponse.Content | ConvertFrom-Json
    
    Write-Host "✅ Health endpoint working!" -ForegroundColor Green
    Write-Host "📊 Status: $($response.StatusCode)" -ForegroundColor White
    Write-Host "📊 Version: $($healthData.version)" -ForegroundColor White
    Write-Host "📊 API Version: $($healthData.apiVersion)" -ForegroundColor White
    Write-Host "📊 Deployment: $($healthData.deployment)" -ForegroundColor White
    Write-Host "📊 Uptime: $($healthData.uptime) seconds" -ForegroundColor White
    
    # Check if API version is fixed
    if ($healthData.apiVersion -eq "2024-10-01-preview") {
        Write-Host "🎉 API VERSION IS FIXED!" -ForegroundColor Green
    } else {
        Write-Host "❌ API version still wrong: $($healthData.apiVersion)" -ForegroundColor Red
    }
    
} catch {
    Write-Host "❌ Health endpoint failed: $_" -ForegroundColor Red
    
    # Try to get more details about the error
    if ($_.Exception.Response) {
        Write-Host "📊 HTTP Status: $($_.Exception.Response.StatusCode)" -ForegroundColor Yellow
        Write-Host "📊 Status Description: $($_.Exception.Response.StatusDescription)" -ForegroundColor Yellow
    }
}

# Test 3: Debug configuration endpoint
Write-Host "`n📊 Test 3: Debug configuration..." -ForegroundColor Yellow
try {
    $debugResponse = Invoke-WebRequest -Uri "https://$AppServiceName.azurewebsites.net/api/debug-config" -Method GET -TimeoutSec 60
    $debugData = $debugResponse.Content | ConvertFrom-Json
    
    Write-Host "✅ Debug endpoint available!" -ForegroundColor Green
    Write-Host "📊 Constructed URL: $($debugData.constructedUrl)" -ForegroundColor White
    
    # Validate URL format
    if ($debugData.urlValidation.hasDoubleSlash) {
        Write-Host "❌ Double slash detected in URL!" -ForegroundColor Red
    } else {
        Write-Host "✅ URL format is correct (no double slashes)" -ForegroundColor Green
    }
    
    if ($debugData.urlValidation.apiVersionCorrect) {
        Write-Host "✅ API version validation passed" -ForegroundColor Green
    } else {
        Write-Host "❌ API version validation failed" -ForegroundColor Red
    }
    
    Write-Host "`n📋 Environment Variables from server:" -ForegroundColor Cyan
    $debugData.environment.PSObject.Properties | ForEach-Object {
        if ($_.Value) {
            Write-Host "   $($_.Name): $($_.Value)" -ForegroundColor Gray
        } else {
            Write-Host "   $($_.Name): [NOT SET]" -ForegroundColor Yellow
        }
    }
    
} catch {
    Write-Host "❌ Debug endpoint not working: $_" -ForegroundColor Red
}

# Test 4: Process audio endpoint 
Write-Host "`n📊 Test 4: Process audio endpoint..." -ForegroundColor Yellow
try {
    $testBody = @{
        recording_id = "diagnostic-test-$(Get-Date -Format 'yyyyMMddHHmmss')"
        file_url = "https://example.com/test.wav"
        file_size = 1024000
    } | ConvertTo-Json
    
    $processResponse = Invoke-WebRequest -Uri "https://$AppServiceName.azurewebsites.net/api/process-audio" -Method POST -Body $testBody -ContentType "application/json" -TimeoutSec 60
    $processData = $processResponse.Content | ConvertFrom-Json
    
    Write-Host "✅ Process endpoint working!" -ForegroundColor Green
    Write-Host "📊 Response: $($processData.message)" -ForegroundColor White
    Write-Host "📊 Transcription enabled: $($processData.transcription_enabled)" -ForegroundColor White
} catch {
    Write-Host "❌ Process endpoint failed: $_" -ForegroundColor Red
}

# Summary
Write-Host "`n📋 DIAGNOSIS SUMMARY:" -ForegroundColor Cyan
Write-Host "If Health and Debug endpoints work, your backend is fixed!" -ForegroundColor White
Write-Host "You can now test your 8kHz WAV file upload." -ForegroundColor White

Write-Host "`n🔍 Next Steps:" -ForegroundColor Cyan
Write-Host "1. If tests pass - try your WAV file upload" -ForegroundColor White
Write-Host "2. If tests fail - check the logs:" -ForegroundColor White
Write-Host "   https://$AppServiceName.scm.azurewebsites.net/api/logs/docker" -ForegroundColor Gray