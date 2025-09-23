# Ultra-minimal deployment for Azure backend debugging

Write-Host "🔬 ULTRA-MINIMAL DEPLOYMENT" -ForegroundColor Magenta
Write-Host "Purpose: Identify core startup issue" -ForegroundColor White
Write-Host ""

Write-Host "📦 Deploying ultra-minimal server..." -ForegroundColor Yellow

try {
    az webapp deploy `
        --resource-group soundscribe-rg `
        --name soundscribe-backend `
        --src-path ultra-minimal-deployment.zip `
        --type zip `
        --timeout 300
    
    Write-Host "✅ Ultra-minimal deployment completed!" -ForegroundColor Green
} catch {
    Write-Host "❌ Deployment failed: $_" -ForegroundColor Red
    exit 1
}

Write-Host "`n⏰ Waiting 60 seconds for startup..." -ForegroundColor Yellow
Start-Sleep -Seconds 60

Write-Host "`n🧪 Testing ultra-minimal server..." -ForegroundColor Yellow

try {
    $response = Invoke-WebRequest -Uri "https://soundscribe-backend.azurewebsites.net/" -Method GET -TimeoutSec 15
    Write-Host "✅ SUCCESS! Ultra-minimal server is working!" -ForegroundColor Green
    Write-Host "📊 Status: $($response.StatusCode)" -ForegroundColor White
    Write-Host "📄 Response: $($response.Content)" -ForegroundColor Gray
} catch {
    Write-Host "❌ Ultra-minimal server also failed: $_" -ForegroundColor Red
    Write-Host "🔍 This suggests a fundamental Azure App Service configuration issue" -ForegroundColor Yellow
    
    Write-Host "`n🧪 Trying health endpoint..." -ForegroundColor Yellow
    try {
        $healthResponse = Invoke-WebRequest -Uri "https://soundscribe-backend.azurewebsites.net/health" -Method GET -TimeoutSec 15
        Write-Host "✅ Health endpoint works!" -ForegroundColor Green
        Write-Host "📊 Status: $($healthResponse.StatusCode)" -ForegroundColor White
    } catch {
        Write-Host "❌ Health endpoint also failed: $_" -ForegroundColor Red
    }
}

Write-Host "`n📋 Manual test URLs:" -ForegroundColor Cyan
Write-Host "• Root: https://soundscribe-backend.azurewebsites.net/" -ForegroundColor White
Write-Host "• Health: https://soundscribe-backend.azurewebsites.net/health" -ForegroundColor White
Write-Host "• Logs: https://soundscribe-backend.scm.azurewebsites.net/api/logs/docker" -ForegroundColor White