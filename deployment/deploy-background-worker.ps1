# Deploy Background Worker to Azure App Service
$appName = "soundscribe-backend"
$resourceGroup = "soundscribe-rg"

Write-Host "Deploying Background Worker to Azure App Service..." -ForegroundColor Green

# Set environment variables
Write-Host "Configuring environment variables..."
az webapp config appsettings set --name $appName --resource-group $resourceGroup --settings `
    NODE_ENV="production" `
    PORT="3001" `
    FRONTEND_URL="https://preview--eci-sound-scribe.lovable.app" `
    SUPABASE_URL="$env:SUPABASE_URL" `
    SUPABASE_SERVICE_ROLE_KEY="$env:SUPABASE_SERVICE_ROLE_KEY" `
    AZURE_OPENAI_ENDPOINT="$env:AZURE_OPENAI_ENDPOINT" `
    AZURE_OPENAI_API_KEY="$env:AZURE_OPENAI_API_KEY" `
    AZURE_OPENAI_DEPLOYMENT_NAME="$env:AZURE_OPENAI_DEPLOYMENT_NAME" `
    AZURE_STORAGE_CONNECTION_STRING="$env:AZURE_STORAGE_CONNECTION_STRING"

# Configure CORS in Azure App Service
Write-Host "Configuring CORS settings..."
az webapp cors remove --name $appName --resource-group $resourceGroup --allowed-origins
az webapp cors add --name $appName --resource-group $resourceGroup --allowed-origins `
    "http://localhost:8080" `
    "http://localhost:3000" `
    "http://localhost:5173" `
    "https://preview--eci-sound-scribe.lovable.app" `
    "https://eci-sound-scribe.lovable.app" `
    "https://preview--echo-ai-scribe-app.lovable.app" `
    "https://echo-ai-scribe-app.lovable.app"

# Deploy the background worker
Write-Host "Deploying background worker code..."
cd ../background-worker
az webapp deploy --name $appName --resource-group $resourceGroup --src-path . --type zip

# Restart the app
Write-Host "Restarting Azure App Service..."
az webapp restart --name $appName --resource-group $resourceGroup

Write-Host "Background Worker deployment completed!" -ForegroundColor Green
Write-Host "Health check URL: https://$appName.azurewebsites.net/health"