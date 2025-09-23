# Deploy Chunk 3 Fix to Azure App Service
# This script deploys the enhanced WAV chunk processing fix

Write-Host "🚀 Deploying Chunk 3 Fix to Azure App Service..." -ForegroundColor Green

# Configuration
$resourceGroup = "soundscribe-rg"
$appServiceName = "soundscribe-backend"

# Check if Azure CLI is installed and logged in
try {
    $azAccount = az account show --query "user.name" -o tsv 2>$null
    if (-not $azAccount) {
        Write-Host "❌ Please log in to Azure CLI first: az login" -ForegroundColor Red
        exit 1
    }
    Write-Host "✅ Logged in as: $azAccount" -ForegroundColor Green
} catch {
    Write-Host "❌ Azure CLI not found. Please install Azure CLI." -ForegroundColor Red
    exit 1
}

# Check if the app service exists
Write-Host "🔍 Checking if App Service exists..." -ForegroundColor Yellow
$appExists = az webapp show --name $appServiceName --resource-group $resourceGroup --query "name" -o tsv 2>$null

if (-not $appExists) {
    Write-Host "❌ App Service not found. Please check the app service name." -ForegroundColor Red
    exit 1
}

Write-Host "✅ App Service found: $appServiceName" -ForegroundColor Green

# Create deployment package
Write-Host "📦 Creating deployment package with chunk fix..." -ForegroundColor Yellow

if (Test-Path "deployment-chunk-fix.zip") {
    Remove-Item "deployment-chunk-fix.zip"
}

# Create the deployment package with updated server-simple.js
Compress-Archive -Path @(
    "server-simple.js",
    "package.json",
    "web.config",
    "utils/*.js"
) -DestinationPath "deployment-chunk-fix.zip" -Force

Write-Host "✅ Deployment package created" -ForegroundColor Green

# Deploy to Azure
Write-Host "🚀 Deploying to Azure App Service..." -ForegroundColor Yellow

$deployResult = az webapp deployment source config-zip `
    --resource-group $resourceGroup `
    --name $appServiceName `
    --src "deployment-chunk-fix.zip" `
    --timeout 600 2>&1

if ($LASTEXITCODE -eq 0) {
    Write-Host "✅ Deployment successful!" -ForegroundColor Green
    
    # Restart the app service to ensure changes take effect
    Write-Host "🔄 Restarting App Service to apply changes..." -ForegroundColor Yellow
    az webapp restart --name $appServiceName --resource-group $resourceGroup
    
    Write-Host "✅ App Service restarted successfully!" -ForegroundColor Green
    Write-Host "⏳ Please wait 1-2 minutes for the service to fully restart." -ForegroundColor Yellow
    
    # Show app URL
    $appUrl = az webapp show --name $appServiceName --resource-group $resourceGroup --query "defaultHostName" -o tsv
    Write-Host "🌐 App URL: https://$appUrl" -ForegroundColor Cyan
    
} else {
    Write-Host "❌ Deployment failed!" -ForegroundColor Red
    Write-Host $deployResult -ForegroundColor Red
    exit 1
}

Write-Host "✅ Chunk 3 fix deployment complete!" -ForegroundColor Green
Write-Host "📝 Changes deployed:" -ForegroundColor Yellow
Write-Host "  - WAV pre-processing for low sample rate files" -ForegroundColor White
Write-Host "  - Enhanced FFmpeg flags for chunk extraction" -ForegroundColor White
Write-Host "  - Chunk validation and error recovery" -ForegroundColor White
Write-Host "  - Fix for 8kHz WAV file chunk 3 corruption" -ForegroundColor White