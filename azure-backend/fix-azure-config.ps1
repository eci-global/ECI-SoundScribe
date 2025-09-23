# Fix Azure Configuration in App Service

Write-Host "🔧 Fixing Azure OpenAI configuration in App Service..." -ForegroundColor Green

# Configuration
$resourceGroup = "soundscribe-rg"
$appServiceName = "soundscribe-backend"

# Check login
$azAccount = az account show --query "user.name" -o tsv 2>$null
if (-not $azAccount) {
    Write-Host "❌ Please log in to Azure CLI first: az login" -ForegroundColor Red
    exit 1
}
Write-Host "✅ Logged in as: $azAccount" -ForegroundColor Green

# First, let's check current app settings
Write-Host "`n📋 Current Azure OpenAI settings:" -ForegroundColor Yellow
$currentSettings = az webapp config appsettings list --name $appServiceName --resource-group $resourceGroup --query "[?contains(name, 'AZURE_OPENAI')]" -o json | ConvertFrom-Json

foreach ($setting in $currentSettings) {
    Write-Host "   $($setting.name) = $($setting.value)" -ForegroundColor White
}

# Check if Whisper deployment setting exists
$whisperSetting = $currentSettings | Where-Object { $_.name -eq "AZURE_OPENAI_WHISPER_DEPLOYMENT" }

if (-not $whisperSetting -or $whisperSetting.value -ne "whisper-1") {
    Write-Host "`n⚠️  AZURE_OPENAI_WHISPER_DEPLOYMENT is not set correctly!" -ForegroundColor Yellow
    Write-Host "🔧 Setting AZURE_OPENAI_WHISPER_DEPLOYMENT to 'whisper-1'..." -ForegroundColor Yellow
    
    az webapp config appsettings set `
        --name $appServiceName `
        --resource-group $resourceGroup `
        --settings AZURE_OPENAI_WHISPER_DEPLOYMENT=whisper-1
    
    Write-Host "✅ Environment variable set!" -ForegroundColor Green
} else {
    Write-Host "✅ AZURE_OPENAI_WHISPER_DEPLOYMENT is already set to 'whisper-1'" -ForegroundColor Green
}

# Also ensure the API version is set correctly
Write-Host "`n🔧 Ensuring API version is set..." -ForegroundColor Yellow
az webapp config appsettings set `
    --name $appServiceName `
    --resource-group $resourceGroup `
    --settings AZURE_OPENAI_API_VERSION=2024-10-01-preview

Write-Host "`n🔄 Restarting App Service to apply configuration..." -ForegroundColor Yellow
az webapp restart --name $appServiceName --resource-group $resourceGroup

Write-Host "`n✅ Configuration fixed!" -ForegroundColor Green
Write-Host "⏳ Please wait 1-2 minutes for the service to restart." -ForegroundColor Yellow

Write-Host "`n📋 Updated settings:" -ForegroundColor Yellow
az webapp config appsettings list --name $appServiceName --resource-group $resourceGroup --query "[?contains(name, 'AZURE_OPENAI')]" -o table