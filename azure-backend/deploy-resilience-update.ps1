# Deploy Resilience Updates to Azure App Service
# This script deploys the enhanced rate limiting and resilience improvements

Write-Host "🚀 Deploying Resilience Updates to Azure App Service..." -ForegroundColor Green

# Configuration
$resourceGroup = "ECI-Solutions"
$appServiceName = "echo-ai-scribe-backend"

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
    Write-Host "❌ App Service not found. Listing available services..." -ForegroundColor Red
    az webapp list --resource-group $resourceGroup --query "[].name" -o table
    exit 1
}

Write-Host "✅ App Service found: $appServiceName" -ForegroundColor Green

# Create deployment package
Write-Host "📦 Creating deployment package..." -ForegroundColor Yellow

if (Test-Path "deployment-resilience.zip") {
    Remove-Item "deployment-resilience.zip"
}

# Include key files with resilience improvements
$filesToInclude = @(
    "utils/azureOpenAI.js",
    "processor.js", 
    "server.js",
    "package.json",
    "web.config"
)

Compress-Archive -Path $filesToInclude -DestinationPath "deployment-resilience.zip" -Force
Write-Host "✅ Package created: deployment-resilience.zip" -ForegroundColor Green

# Deploy to Azure
Write-Host "🚀 Deploying to Azure App Service..." -ForegroundColor Yellow
az webapp deployment source config-zip --resource-group $resourceGroup --name $appServiceName --src "deployment-resilience.zip"

# Restart app service
Write-Host "🔄 Restarting App Service..." -ForegroundColor Yellow
az webapp restart --name $appServiceName --resource-group $resourceGroup

Write-Host "✅ Deployment complete!" -ForegroundColor Green
Write-Host "Key improvements:" -ForegroundColor Cyan
Write-Host "  • Enhanced rate limiting handling" -ForegroundColor White
Write-Host "  • Partial success for large files" -ForegroundColor White
Write-Host "  • Better error recovery" -ForegroundColor White

# Cleanup
Remove-Item "deployment-resilience.zip"
