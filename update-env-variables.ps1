# Update Environment Variables for gpt-4o-transcribe Migration
# This script helps set up the new environment variables for the gpt-4o-transcribe resource

param(
    [Parameter(Mandatory=$false)]
    [string]$ResourceName = "dkora-mc9jz7vq-eastus2",
    
    [Parameter(Mandatory=$false)]
    [string]$Region = "eastus2"
)

Write-Host "🔧 Updating Environment Variables for gpt-4o-transcribe Migration..." -ForegroundColor Green
Write-Host "📋 Resource Name: $ResourceName" -ForegroundColor Cyan
Write-Host "📋 Region: $Region" -ForegroundColor Cyan

# Step 1: Get the API key for the new resource
Write-Host "`n🔑 Step 1: Getting API key for $ResourceName..." -ForegroundColor Yellow

try {
    $apiKey = az cognitiveservices account keys list --name $ResourceName --resource-group "applications-devbox" --query "key1" -o tsv 2>$null
    
    if ($LASTEXITCODE -eq 0 -and $apiKey) {
        Write-Host "✅ API key retrieved successfully" -ForegroundColor Green
        Write-Host "   Key preview: $($apiKey.Substring(0,8))..." -ForegroundColor White
    } else {
        Write-Host "❌ Failed to get API key. Please check the resource name and permissions." -ForegroundColor Red
        exit 1
    }
} catch {
    Write-Host "❌ Error getting API key: $($_.Exception.Message)" -ForegroundColor Red
    exit 1
}

# Step 2: Check if gpt-4o-transcribe deployment exists
Write-Host "`n🎤 Step 2: Checking gpt-4o-transcribe deployment..." -ForegroundColor Yellow

try {
    $deployments = az cognitiveservices account deployment list --resource-group "applications-devbox" --name $ResourceName --query "[].{name:name, model:model.name, sku:sku.name, capacity:sku.capacity}" -o json 2>$null
    
    if ($LASTEXITCODE -eq 0) {
        $deploymentsObj = $deployments | ConvertFrom-Json
        $transcribeDeployment = $deploymentsObj | Where-Object { $_.name -eq "gpt-4o-transcribe" }
        
        if ($transcribeDeployment) {
            Write-Host "✅ gpt-4o-transcribe deployment found!" -ForegroundColor Green
            Write-Host "   Model: $($transcribeDeployment.model)" -ForegroundColor White
            Write-Host "   SKU: $($transcribeDeployment.sku)" -ForegroundColor White
            Write-Host "   Capacity: $($transcribeDeployment.capacity)K TPM" -ForegroundColor White
        } else {
            Write-Host "⚠️ gpt-4o-transcribe deployment not found" -ForegroundColor Yellow
            Write-Host "💡 You may need to create the deployment first" -ForegroundColor Cyan
        }
    } else {
        Write-Host "❌ Failed to check deployments" -ForegroundColor Red
    }
} catch {
    Write-Host "❌ Error checking deployments: $($_.Exception.Message)" -ForegroundColor Red
}

# Step 3: Display the new environment variables
Write-Host "`n📋 Step 3: New Environment Variables Configuration" -ForegroundColor Cyan
Write-Host "=" * 60 -ForegroundColor Gray

Write-Host "`n🎤 For gpt-4o-transcribe (NEW):" -ForegroundColor Green
Write-Host "AZURE_OPENAI_TRANSCRIBE_ENDPOINT=https://$ResourceName.openai.azure.com/" -ForegroundColor White
Write-Host "AZURE_OPENAI_TRANSCRIBE_API_KEY=$apiKey" -ForegroundColor White
Write-Host "AZURE_OPENAI_TRANSCRIBE_DEPLOYMENT=gpt-4o-transcribe" -ForegroundColor White

Write-Host "`n🤖 For gpt-4o-mini (EXISTING):" -ForegroundColor Green
Write-Host "AZURE_OPENAI_ENDPOINT=https://soundscribe-openai.openai.azure.com/" -ForegroundColor White
Write-Host "AZURE_OPENAI_API_KEY=<your-existing-key>" -ForegroundColor White
Write-Host "AZURE_OPENAI_GPT4O_MINI_DEPLOYMENT=gpt-4o-mini" -ForegroundColor White

Write-Host "`n⚙️ Common Settings:" -ForegroundColor Green
Write-Host "AZURE_OPENAI_API_VERSION=2024-10-01-preview" -ForegroundColor White

# Step 4: Create environment file template
Write-Host "`n📝 Step 4: Creating environment file template..." -ForegroundColor Yellow

$envTemplate = @"
# Azure OpenAI Configuration for gpt-4o-transcribe Migration

# gpt-4o-transcribe (NEW - Audio Transcription)
AZURE_OPENAI_TRANSCRIBE_ENDPOINT=https://$ResourceName.openai.azure.com/
AZURE_OPENAI_TRANSCRIBE_API_KEY=$apiKey
AZURE_OPENAI_TRANSCRIBE_DEPLOYMENT=gpt-4o-transcribe

# gpt-4o-mini (EXISTING - Chat Completions)
AZURE_OPENAI_ENDPOINT=https://soundscribe-openai.openai.azure.com/
AZURE_OPENAI_API_KEY=<your-existing-gpt4o-mini-key>
AZURE_OPENAI_GPT4O_MINI_DEPLOYMENT=gpt-4o-mini

# Common Settings
AZURE_OPENAI_API_VERSION=2024-10-01-preview

# Supabase Configuration
SUPABASE_URL=https://qinkldgvejheppheykfl.supabase.co
SUPABASE_SERVICE_ROLE_KEY=<your-supabase-service-role-key>
"@

$envTemplate | Out-File -FilePath "echo-ai-scribe-app/.env.gpt4o-transcribe" -Encoding UTF8
Write-Host "✅ Environment template created: .env.gpt4o-transcribe" -ForegroundColor Green

# Step 5: Instructions for next steps
Write-Host "`n📋 Step 5: Next Steps" -ForegroundColor Cyan
Write-Host "=" * 60 -ForegroundColor Gray

Write-Host "`n1. 📝 Update your environment variables:" -ForegroundColor Yellow
Write-Host "   - Copy the new variables above to your .env file" -ForegroundColor White
Write-Host "   - Update Supabase secrets if using secret management" -ForegroundColor White

Write-Host "`n2. 🚀 Deploy the updated Edge Functions:" -ForegroundColor Yellow
Write-Host "   supabase functions deploy process-recording" -ForegroundColor White
Write-Host "   supabase functions deploy process-large-recording" -ForegroundColor White
Write-Host "   supabase functions deploy test-azure-openai" -ForegroundColor White

Write-Host "`n3. 🧪 Test the new configuration:" -ForegroundColor Yellow
Write-Host "   - Upload a test audio file" -ForegroundColor White
Write-Host "   - Check the transcription uses gpt-4o-transcribe" -ForegroundColor White
Write-Host "   - Verify performance improvements" -ForegroundColor White

Write-Host "`n4. 📊 Monitor performance:" -ForegroundColor Yellow
Write-Host "   - Check for 429 rate limiting errors" -ForegroundColor White
Write-Host "   - Monitor transcription speed" -ForegroundColor White
Write-Host "   - Verify GlobalStandard tier benefits" -ForegroundColor White

Write-Host "`n✅ Migration setup completed!" -ForegroundColor Green
Write-Host "🎯 Your SoundScribe app is now configured to use gpt-4o-transcribe!" -ForegroundColor Green 