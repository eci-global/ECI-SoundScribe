# Fixed deployment - solves the "Cannot find module 'cors'" issue

Write-Host "🔧 FIXED DEPLOYMENT" -ForegroundColor Green
Write-Host "Issue: Azure was running old server-simple.js with new package.json" -ForegroundColor White
Write-Host "Fix: Replace server-simple.js with ultra-minimal version" -ForegroundColor White
Write-Host ""

Write-Host "📦 Deploying fixed server..." -ForegroundColor Yellow

try {
    az webapp deploy `
        --resource-group soundscribe-rg `
        --name soundscribe-backend `
        --src-path fixed-deployment.zip `
        --type zip `
        --timeout 300
    
    Write-Host "✅ Fixed deployment completed!" -ForegroundColor Green
} catch {
    Write-Host "❌ Deployment failed: $_" -ForegroundColor Red
    exit 1
}

Write-Host "`n⏰ Waiting 30 seconds for startup..." -ForegroundColor Yellow
Start-Sleep -Seconds 30

Write-Host "`n🧪 Testing fixed server..." -ForegroundColor Yellow

try {
    $response = Invoke-WebRequest -Uri "https://soundscribe-backend.azurewebsites.net/" -Method GET -TimeoutSec 15
    Write-Host "✅ SUCCESS! Fixed server is working!" -ForegroundColor Green
    Write-Host "📊 Status: $($response.StatusCode)" -ForegroundColor White
    Write-Host "📄 Response: $($response.Content | ConvertFrom-Json | ConvertTo-Json)" -ForegroundColor Gray
} catch {
    Write-Host "❌ Fixed server failed: $_" -ForegroundColor Red
}

Write-Host "`n🧪 Testing health endpoint..." -ForegroundColor Yellow
try {
    $healthResponse = Invoke-WebRequest -Uri "https://soundscribe-backend.azurewebsites.net/health" -Method GET -TimeoutSec 15
    Write-Host "✅ Health endpoint works!" -ForegroundColor Green
    Write-Host "📊 Status: $($healthResponse.StatusCode)" -ForegroundColor White
    Write-Host "📄 Health Data: $($healthResponse.Content | ConvertFrom-Json | ConvertTo-Json)" -ForegroundColor Gray
} catch {
    Write-Host "❌ Health endpoint failed: $_" -ForegroundColor Red
}

Write-Host "`n🎉 Deployment Summary:" -ForegroundColor Cyan
Write-Host "• Fixed dependency mismatch issue" -ForegroundColor White
Write-Host "• Server should now start without 'Cannot find module' errors" -ForegroundColor White
Write-Host "• Ultra-minimal server provides basic transcription endpoint" -ForegroundColor White
Write-Host "`n📋 Manual test URLs:" -ForegroundColor Cyan
Write-Host "• Root: https://soundscribe-backend.azurewebsites.net/" -ForegroundColor White
Write-Host "• Health: https://soundscribe-backend.azurewebsites.net/health" -ForegroundColor White