# Deploy Simplified Azure Backend to Fix CORS
$appName = "soundscribe-backend"
$resourceGroup = "soundscribe-rg"

Write-Host "Deploying Simplified Azure Backend to Fix CORS..." -ForegroundColor Green

# Ensure we're in the deployment directory
Set-Location $PSScriptRoot

# Update FRONTEND_URL to include preview URL
Write-Host "Setting environment variables..."
az webapp config appsettings set --name $appName --resource-group $resourceGroup --settings `
    NODE_ENV="production" `
    PORT="3000" `
    FRONTEND_URL="https://preview--eci-sound-scribe.lovable.app"

# Configure CORS in Azure App Service (redundant but helpful)
Write-Host "Configuring CORS settings in Azure..."
az webapp cors remove --name $appName --resource-group $resourceGroup --allowed-origins
az webapp cors add --name $appName --resource-group $resourceGroup --allowed-origins `
    "http://localhost:8080" `
    "http://localhost:3000" `
    "http://localhost:5173" `
    "https://preview--eci-sound-scribe.lovable.app" `
    "https://eci-sound-scribe.lovable.app" `
    "https://preview--echo-ai-scribe-app.lovable.app" `
    "https://echo-ai-scribe-app.lovable.app"

# Create deployment package
Write-Host "Creating deployment package..."
$deployFile = "cors-fix-deploy.zip"
if (Test-Path $deployFile) {
    Remove-Item $deployFile
}

# Package only the essential files
Compress-Archive -Path server-simple.js, package.json, web.config -DestinationPath $deployFile

# Deploy to Azure
Write-Host "Deploying to Azure App Service..."
az webapp deploy --name $appName --resource-group $resourceGroup --src-path $deployFile --type zip

# Cleanup
Remove-Item $deployFile

# Restart the app
Write-Host "Restarting Azure App Service..."
az webapp restart --name $appName --resource-group $resourceGroup

Write-Host "CORS fix deployment completed!" -ForegroundColor Green
Write-Host "Health check URL: https://soundscribe-backend.azurewebsites.net/health"
Write-Host "API endpoint: https://soundscribe-backend.azurewebsites.net/api/process-recording"
Write-Host ""
Write-Host "Wait 2-3 minutes for the deployment to fully complete, then test the frontend upload." -ForegroundColor Yellow