# Quick CORS Fix Deployment for Background Worker
$appName = "soundscribe-backend"
$resourceGroup = "soundscribe-rg"

Write-Host "Applying CORS fix to Background Worker..." -ForegroundColor Green

# Update FRONTEND_URL to include current domain
Write-Host "Updating FRONTEND_URL environment variable..."
az webapp config appsettings set --name $appName --resource-group $resourceGroup --settings `
    FRONTEND_URL="https://f9827dbd-5df6-4d40-9bdf-efa5c5236ea6.lovableproject.com"

# Configure CORS in Azure App Service
Write-Host "Configuring CORS settings in Azure..."
az webapp cors remove --name $appName --resource-group $resourceGroup --allowed-origins
az webapp cors add --name $appName --resource-group $resourceGroup --allowed-origins `
    "http://localhost:8080" `
    "http://localhost:3000" `
    "http://localhost:5173" `
    "https://f9827dbd-5df6-4d40-9bdf-efa5c5236ea6.lovableproject.com" `
    "https://preview--eci-sound-scribe.lovable.app" `
    "https://eci-sound-scribe.lovable.app" `
    "https://preview--echo-ai-scribe-app.lovable.app" `
    "https://echo-ai-scribe-app.lovable.app"

# Deploy only the updated server.js
Write-Host "Deploying updated background worker..."
cd ../background-worker

# Create a minimal deployment package with just the server updates
$tempDir = New-TemporaryFile | %{ rm $_; mkdir $_ }
Copy-Item server.js $tempDir
Copy-Item package.json $tempDir
Copy-Item package-lock.json $tempDir -ErrorAction SilentlyContinue
Copy-Item -Recurse processor.js $tempDir -ErrorAction SilentlyContinue
Copy-Item -Recurse utils $tempDir -ErrorAction SilentlyContinue

# Create zip and deploy
Compress-Archive -Path "$tempDir\*" -DestinationPath cors-fix-deploy.zip -Force
az webapp deploy --name $appName --resource-group $resourceGroup --src-path cors-fix-deploy.zip --type zip

# Cleanup
Remove-Item $tempDir -Recurse -Force
Remove-Item cors-fix-deploy.zip

# Restart the app
Write-Host "Restarting Azure App Service..."
az webapp restart --name $appName --resource-group $resourceGroup

Write-Host "CORS fix deployed successfully!" -ForegroundColor Green
Write-Host "Test the endpoint in a few minutes at: https://$appName.azurewebsites.net/api/process-recording"