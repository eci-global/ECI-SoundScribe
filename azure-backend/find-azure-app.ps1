# Find Azure App Service for Echo AI Scribe Backend

Write-Host "🔍 Finding Azure App Service for Echo AI Scribe..." -ForegroundColor Green

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

Write-Host "`n📋 Available Resource Groups:" -ForegroundColor Yellow
az group list --query "[].name" -o table

Write-Host "`n🌐 All Web Apps in your subscription:" -ForegroundColor Yellow
$webapps = az webapp list --query "[].{Name:name, ResourceGroup:resourceGroup, URL:defaultHostName}" -o json | ConvertFrom-Json

if ($webapps.Count -eq 0) {
    Write-Host "❌ No web apps found in your subscription" -ForegroundColor Red
    exit 1
}

Write-Host "Found $($webapps.Count) web app(s):" -ForegroundColor Green

foreach ($app in $webapps) {
    Write-Host "`n📦 App Name: $($app.Name)" -ForegroundColor Cyan
    Write-Host "   Resource Group: $($app.ResourceGroup)" -ForegroundColor White
    Write-Host "   URL: https://$($app.URL)" -ForegroundColor White
    
    # Check if this might be the Echo AI Scribe backend
    if ($app.Name -like "*echo*" -or $app.Name -like "*scribe*" -or $app.Name -like "*backend*") {
        Write-Host "   ⭐ This might be your Echo AI Scribe backend!" -ForegroundColor Yellow
    }
}

Write-Host "`n💡 To deploy, update deploy-chunk-fix.ps1 with the correct:" -ForegroundColor Yellow
Write-Host "   - Resource Group name" -ForegroundColor White
Write-Host "   - App Service name" -ForegroundColor White