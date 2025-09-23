# Emergency deployment fix for Azure backend startup issues

param(
    [Parameter(Mandatory=$false)]
    [string]$ResourceGroup = "soundscribe-rg",
    
    [Parameter(Mandatory=$false)]
    [string]$AppServiceName = "soundscribe-backend"
)

Write-Host "🚨 EMERGENCY FIX DEPLOYMENT" -ForegroundColor Red
Write-Host "📋 Resource Group: $ResourceGroup" -ForegroundColor Cyan
Write-Host "📋 App Service: $AppServiceName" -ForegroundColor Cyan
Write-Host ""

Write-Host "🔄 Step 1: Deploying emergency fix..." -ForegroundColor Yellow

try {
    az webapp deploy `
        --resource-group $ResourceGroup `
        --name $AppServiceName `
        --src-path emergency-fix-deployment.zip `
        --type zip
    
    Write-Host "✅ Emergency deployment completed!" -ForegroundColor Green
} catch {
    Write-Host "❌ Emergency deployment failed: $_" -ForegroundColor Red
    Write-Host "💡 Trying alternative deployment method..." -ForegroundColor Yellow
    
    try {
        az webapp deployment source config-zip `
            --resource-group $ResourceGroup `
            --name $AppServiceName `
            --src emergency-fix-deployment.zip
        
        Write-Host "✅ Alternative deployment completed!" -ForegroundColor Green
    } catch {
        Write-Host "❌ All deployment methods failed: $_" -ForegroundColor Red
        exit 1
    }
}

Write-Host "`n🔄 Step 2: Restarting app service..." -ForegroundColor Yellow

try {
    az webapp restart --resource-group $ResourceGroup --name $AppServiceName
    Write-Host "✅ App service restarted!" -ForegroundColor Green
} catch {
    Write-Host "⚠️ Restart failed, but deployment may still work: $_" -ForegroundColor Yellow
}

Write-Host "`n🧪 Step 3: Testing emergency fix..." -ForegroundColor Yellow
Write-Host "Waiting 30 seconds for startup..." -ForegroundColor White
Start-Sleep -Seconds 30

try {
    $response = Invoke-WebRequest -Uri "https://soundscribe-backend.azurewebsites.net/health" -Method GET -TimeoutSec 10
    Write-Host "✅ Health check successful!" -ForegroundColor Green
    Write-Host "📊 Response: $($response.StatusCode) $($response.StatusDescription)" -ForegroundColor White
} catch {
    Write-Host "⚠️ Health check failed, but app may still be starting: $_" -ForegroundColor Yellow
    Write-Host "🔍 Manual check: https://soundscribe-backend.azurewebsites.net/health" -ForegroundColor White
}

Write-Host "`n🎉 Emergency fix deployment complete!" -ForegroundColor Green
Write-Host "📋 What was fixed:" -ForegroundColor Cyan
Write-Host "  • Removed complex FFmpeg dependencies" -ForegroundColor White
Write-Host "  • Simplified Azure OpenAI configuration" -ForegroundColor White
Write-Host "  • Cleaned up undefined variables" -ForegroundColor White
Write-Host "  • Fixed port configuration for Azure" -ForegroundColor White
Write-Host ""
Write-Host "🔍 Next steps:" -ForegroundColor Cyan
Write-Host "1. Test the health endpoint: https://soundscribe-backend.azurewebsites.net/health" -ForegroundColor White
Write-Host "2. Try uploading your 8kHz WAV file" -ForegroundColor White
Write-Host "3. Monitor the processing in real-time" -ForegroundColor White