# Fix Azure App Service Environment Variables for Whisper Deployment

param(
    [Parameter(Mandatory=$false)]
    [string]$ResourceGroup = "soundscribe-rg",
    
    [Parameter(Mandatory=$false)]
    [string]$AppServiceName = "soundscribe-backend"
)

Write-Host "🔧 Fixing Azure App Service environment variables..." -ForegroundColor Green

# Set the correct Whisper deployment name
Write-Host "📝 Setting AZURE_OPENAI_WHISPER_DEPLOYMENT to 'whisper-1'..." -ForegroundColor Yellow

try {
    az webapp config appsettings set `
        --resource-group $ResourceGroup `
        --name $AppServiceName `
        --settings "AZURE_OPENAI_WHISPER_DEPLOYMENT=whisper-1" `
        --output none
    
    Write-Host "✅ Environment variable set successfully!" -ForegroundColor Green
    
    # Restart the app service to apply changes
    Write-Host "🔄 Restarting app service to apply changes..." -ForegroundColor Yellow
    az webapp restart --resource-group $ResourceGroup --name $AppServiceName
    
    Write-Host "✅ App service restarted successfully!" -ForegroundColor Green
    Write-Host "" 
    Write-Host "📋 Next steps:" -ForegroundColor Cyan
    Write-Host "1. Wait 30-60 seconds for the app to fully restart" -ForegroundColor White
    Write-Host "2. Test your audio upload again" -ForegroundColor White
    Write-Host "3. If you still want to use gpt-4o-transcribe instead of Whisper, run:" -ForegroundColor White
    Write-Host "   .\migrate-to-gpt4o-transcribe.ps1" -ForegroundColor Yellow
    
} catch {
    Write-Host "❌ Failed to update environment variables: $_" -ForegroundColor Red
    Write-Host "Please ensure you're logged into Azure CLI: az login" -ForegroundColor Yellow
}