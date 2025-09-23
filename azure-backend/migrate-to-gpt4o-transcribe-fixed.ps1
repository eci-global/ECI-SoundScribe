# Migrate Azure Backend to use gpt-4o-transcribe instead of Whisper

param(
    [Parameter(Mandatory=$false)]
    [string]$ResourceGroup = "soundscribe-rg",
    
    [Parameter(Mandatory=$false)]
    [string]$AppServiceName = "soundscribe-backend",
    
    [Parameter(Mandatory=$false)]
    [string]$OpenAIAccountName = "soundscribe-openai"
)

Write-Host "🚀 Migrating Azure Backend to use gpt-4o-transcribe..." -ForegroundColor Green
Write-Host "📋 Resource Group: $ResourceGroup" -ForegroundColor Cyan
Write-Host "📋 App Service: $AppServiceName" -ForegroundColor Cyan
Write-Host "📋 OpenAI Account: $OpenAIAccountName" -ForegroundColor Cyan
Write-Host ""

# Step 1: Update environment variables to use gpt-4o-transcribe
Write-Host "📝 Step 1: Updating environment variables..." -ForegroundColor Yellow

try {
    # Get OpenAI endpoint and key
    $openaiEndpoint = "https://$OpenAIAccountName.openai.azure.com/"
    
    Write-Host "Setting transcription environment variables..." -ForegroundColor White
    
    # Update app settings to use gpt-4o-transcribe instead of Whisper
    az webapp config appsettings set `
        --resource-group $ResourceGroup `
        --name $AppServiceName `
        --settings @(
            "AZURE_OPENAI_TRANSCRIBE_ENDPOINT=$openaiEndpoint",
            "AZURE_OPENAI_TRANSCRIBE_DEPLOYMENT=gpt-4o-transcribe",
            "AZURE_OPENAI_TRANSCRIBE_API_KEY=`$AZURE_OPENAI_API_KEY",
            "USE_GPT4O_TRANSCRIBE=true"
        ) `
        --output none
    
    Write-Host "✅ Environment variables updated successfully!" -ForegroundColor Green
    
} catch {
    Write-Host "❌ Failed to update environment variables: $_" -ForegroundColor Red
    Write-Host "Please ensure:" -ForegroundColor Yellow
    Write-Host "1. You're logged into Azure CLI: az login" -ForegroundColor White  
    Write-Host "2. You have the correct resource names" -ForegroundColor White
    exit 1
}

# Step 2: Update server-simple.js to use gpt-4o-transcribe
Write-Host "`n📋 Step 2: Updating server code..." -ForegroundColor Yellow

$serverPath = "./server-simple.js"
if (Test-Path $serverPath) {
    Write-Host "Backing up current server-simple.js..." -ForegroundColor White
    Copy-Item $serverPath "$serverPath.backup" -Force
    
    Write-Host "Updating transcription configuration..." -ForegroundColor White
    
    # Read the current file
    $content = Get-Content $serverPath -Raw
    
    # Replace Whisper configuration with gpt-4o-transcribe
    # Fix the regex patterns to use proper PowerShell syntax
    $content = $content -replace "whisperDeployment: process\.env\.AZURE_OPENAI_WHISPER_DEPLOYMENT \|\| 'whisper-1'", "transcribeDeployment: process.env.AZURE_OPENAI_TRANSCRIBE_DEPLOYMENT || 'gpt-4o-transcribe'"
    
    $content = $content -replace "whisperEndpoint = process\.env\.AZURE_OPENAI_WHISPER_ENDPOINT \|\| this\.endpoint", "transcribeEndpoint = process.env.AZURE_OPENAI_TRANSCRIBE_ENDPOINT || this.endpoint"
    
    $content = $content -replace "whisperApiKey = process\.env\.AZURE_OPENAI_WHISPER_API_KEY \|\| this\.apiKey", "transcribeApiKey = process.env.AZURE_OPENAI_TRANSCRIBE_API_KEY || this.apiKey"
    
    # Replace API calls from /deployments/whisper/ to /deployments/gpt-4o-transcribe/
    $content = $content -replace "/deployments/\`$\{[^}]*whisper[^}]*\}/audio/transcriptions", "/deployments/`${this.transcribeDeployment}/audio/transcriptions"
    
    # Replace variable references
    $content = $content -replace "this\.whisperDeployment", "this.transcribeDeployment"
    $content = $content -replace "this\.whisperEndpoint", "this.transcribeEndpoint"  
    $content = $content -replace "this\.whisperApiKey", "this.transcribeApiKey"
    
    # Write the updated content
    Set-Content $serverPath $content -NoNewline
    
    Write-Host "✅ Server code updated successfully!" -ForegroundColor Green
    Write-Host "   • Backup created: $serverPath.backup" -ForegroundColor Gray
    
} else {
    Write-Host "⚠️ Server file not found at $serverPath" -ForegroundColor Yellow
    Write-Host "Please run this script from the azure-backend directory" -ForegroundColor White
}

# Step 3: Deploy updated code
Write-Host "`n🚀 Step 3: Deploying updated code..." -ForegroundColor Yellow

try {
    # Create deployment zip
    $deploymentZip = "gpt4o-transcribe-deployment.zip"
    
    Write-Host "Creating deployment package..." -ForegroundColor White
    
    # Remove old zip if exists
    if (Test-Path $deploymentZip) {
        Remove-Item $deploymentZip -Force
    }
    
    # Zip the necessary files
    $filesToZip = @()
    if (Test-Path "server-simple.js") { $filesToZip += "server-simple.js" }
    if (Test-Path "package.json") { $filesToZip += "package.json" }
    if (Test-Path "utils") { $filesToZip += "utils" }
    if (Test-Path "web.config") { $filesToZip += "web.config" }
    
    if ($filesToZip.Count -gt 0) {
        Compress-Archive -Path $filesToZip -DestinationPath $deploymentZip -Force
        
        Write-Host "Deploying to Azure App Service..." -ForegroundColor White
        
        az webapp deployment source config-zip `
            --resource-group $ResourceGroup `
            --name $AppServiceName `
            --src $deploymentZip
        
        Write-Host "✅ Deployment completed successfully!" -ForegroundColor Green
    } else {
        Write-Host "⚠️ No files found to deploy" -ForegroundColor Yellow
    }
    
} catch {
    Write-Host "❌ Deployment failed: $_" -ForegroundColor Red
}

# Step 4: Restart app service
Write-Host "`n🔄 Step 4: Restarting app service..." -ForegroundColor Yellow

try {
    az webapp restart --resource-group $ResourceGroup --name $AppServiceName
    Write-Host "✅ App service restarted successfully!" -ForegroundColor Green
} catch {
    Write-Host "❌ Failed to restart app service: $_" -ForegroundColor Red
}

Write-Host "`n🎉 Migration completed!" -ForegroundColor Green
Write-Host "📋 Summary of changes:" -ForegroundColor Cyan
Write-Host "  • Updated environment variables to use gpt-4o-transcribe" -ForegroundColor White
Write-Host "  • Modified server-simple.js to call gpt-4o-transcribe API" -ForegroundColor White
Write-Host "  • Deployed updated code to Azure" -ForegroundColor White
Write-Host "  • Restarted app service" -ForegroundColor White
Write-Host ""
Write-Host "🔍 Next steps:" -ForegroundColor Cyan
Write-Host "1. Ensure gpt-4o-transcribe deployment exists in Azure OpenAI" -ForegroundColor White
Write-Host "   Run: ..\create-gpt4o-transcribe-simple.ps1" -ForegroundColor Yellow
Write-Host "2. Wait 1-2 minutes for the app to fully restart" -ForegroundColor White
Write-Host "3. Test audio upload with your 8kHz WAV file" -ForegroundColor White
Write-Host "4. Monitor logs for any issues" -ForegroundColor White