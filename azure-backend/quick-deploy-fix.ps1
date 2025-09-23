# Quick deployment script if the current one fails
# Uses only Azure CLI without complex operations

param(
    [Parameter(Mandatory=$false)]
    [string]$ResourceGroup = "soundscribe-rg",
    
    [Parameter(Mandatory=$false)]
    [string]$AppServiceName = "soundscribe-backend"
)

Write-Host "🚀 QUICK FIX DEPLOYMENT" -ForegroundColor Green
Write-Host "Simple deployment without complex operations" -ForegroundColor White
Write-Host ""

# Create deployment package using PowerShell native commands
Write-Host "📦 Creating deployment package..." -ForegroundColor Yellow
if (Test-Path "quick-fix-deployment.zip") {
    Remove-Item "quick-fix-deployment.zip" -Force
}

try {
    Compress-Archive -Path server-simple.js,package.json,web.config -DestinationPath quick-fix-deployment.zip -Force
    Write-Host "✅ Package created successfully" -ForegroundColor Green
} catch {
    Write-Host "❌ Failed to create package: $_" -ForegroundColor Red
    exit 1
}

# Deploy using Azure CLI
Write-Host "`n🚀 Deploying to Azure..." -ForegroundColor Yellow

try {
    az webapp deployment source config-zip `
        --resource-group $ResourceGroup `
        --name $AppServiceName `
        --src quick-fix-deployment.zip
    
    Write-Host "✅ Deployment completed" -ForegroundColor Green
} catch {
    Write-Host "❌ Deployment failed: $_" -ForegroundColor Red
    exit 1
}

# Wait and test
Write-Host "`n⏰ Waiting 30 seconds for startup..." -ForegroundColor Yellow
Start-Sleep -Seconds 30

Write-Host "`n🧪 Testing deployment..." -ForegroundColor Yellow
try {
    $response = Invoke-WebRequest -Uri "https://$AppServiceName.azurewebsites.net/health" -Method GET -TimeoutSec 10
    Write-Host "✅ Health check passed: $($response.StatusCode)" -ForegroundColor Green
    
    $data = $response.Content | ConvertFrom-Json
    Write-Host "📊 Version: $($data.version)" -ForegroundColor Gray
    Write-Host "📊 API Version: $($data.apiVersion)" -ForegroundColor Gray
} catch {
    Write-Host "❌ Health check failed: $_" -ForegroundColor Red
}

Write-Host "`n📋 Next Steps:" -ForegroundColor Cyan
Write-Host "1. Check debug config: https://$AppServiceName.azurewebsites.net/api/debug-config" -ForegroundColor White
Write-Host "2. Test your 8kHz WAV file upload" -ForegroundColor White