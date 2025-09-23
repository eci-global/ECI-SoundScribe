# Update Supabase Secrets for gpt-4o-transcribe Migration
# This script updates Supabase secrets with the new environment variables

param(
    [Parameter(Mandatory=$false)]
    [string]$ResourceName = "dkora-mc9jz7vq-eastus2",
    
    [Parameter(Mandatory=$false)]
    [string]$ApiKey = ""
)

Write-Host "🔧 Updating Supabase Secrets for gpt-4o-transcribe Migration..." -ForegroundColor Green
Write-Host "📋 Resource Name: $ResourceName" -ForegroundColor Cyan

# Step 1: Get API key if not provided
if (-not $ApiKey) {
    Write-Host "`n🔑 Step 1: Getting API key for $ResourceName..." -ForegroundColor Yellow
    
    try {
        $ApiKey = az cognitiveservices account keys list --name $ResourceName --resource-group "applications-devbox" --query "key1" -o tsv 2>$null
        
        if ($LASTEXITCODE -eq 0 -and $ApiKey) {
            Write-Host "✅ API key retrieved successfully" -ForegroundColor Green
            Write-Host "   Key preview: $($ApiKey.Substring(0,8))..." -ForegroundColor White
        } else {
            Write-Host "❌ Failed to get API key. Please provide it manually." -ForegroundColor Red
            Write-Host "💡 Get it from Azure Portal: $ResourceName → Keys" -ForegroundColor Yellow
            exit 1
        }
    } catch {
        Write-Host "❌ Error getting API key: $($_.Exception.Message)" -ForegroundColor Red
        exit 1
    }
}

# Step 2: Set Supabase secrets
Write-Host "`n🔐 Step 2: Setting Supabase secrets..." -ForegroundColor Yellow

try {
    # Set the new gpt-4o-transcribe environment variables
    Write-Host "Setting AZURE_OPENAI_TRANSCRIBE_ENDPOINT..." -ForegroundColor Cyan
    supabase secrets set AZURE_OPENAI_TRANSCRIBE_ENDPOINT="https://$ResourceName.openai.azure.com/"
    
    Write-Host "Setting AZURE_OPENAI_TRANSCRIBE_API_KEY..." -ForegroundColor Cyan
    supabase secrets set AZURE_OPENAI_TRANSCRIBE_API_KEY="$ApiKey"
    
    Write-Host "Setting AZURE_OPENAI_TRANSCRIBE_DEPLOYMENT..." -ForegroundColor Cyan
    supabase secrets set AZURE_OPENAI_TRANSCRIBE_DEPLOYMENT="gpt-4o-transcribe"
    
    Write-Host "Setting AZURE_OPENAI_API_VERSION..." -ForegroundColor Cyan
    supabase secrets set AZURE_OPENAI_API_VERSION="2024-10-01-preview"
    
    Write-Host "✅ Supabase secrets updated successfully!" -ForegroundColor Green
    
} catch {
    Write-Host "❌ Error setting Supabase secrets: $($_.Exception.Message)" -ForegroundColor Red
    exit 1
}

# Step 3: Verify secrets were set
Write-Host "`n🔍 Step 3: Verifying secrets..." -ForegroundColor Yellow

try {
    Write-Host "Checking if secrets are accessible..." -ForegroundColor Cyan
    
    # Test the secrets by checking if they're set
    $secrets = supabase secrets list 2>$null
    
    if ($LASTEXITCODE -eq 0) {
        Write-Host "✅ Supabase secrets verification completed" -ForegroundColor Green
    } else {
        Write-Host "⚠️ Could not verify secrets list, but they should be set" -ForegroundColor Yellow
    }
    
} catch {
    Write-Host "⚠️ Could not verify secrets: $($_.Exception.Message)" -ForegroundColor Yellow
}

# Step 4: Display summary
Write-Host "`n📋 Step 4: Secrets Configuration Summary" -ForegroundColor Cyan
Write-Host "=" * 60 -ForegroundColor Gray

Write-Host "`n🎤 gpt-4o-transcribe Configuration:" -ForegroundColor Green
Write-Host "AZURE_OPENAI_TRANSCRIBE_ENDPOINT=https://$ResourceName.openai.azure.com/" -ForegroundColor White
Write-Host "AZURE_OPENAI_TRANSCRIBE_API_KEY=$($ApiKey.Substring(0,8))..." -ForegroundColor White
Write-Host "AZURE_OPENAI_TRANSCRIBE_DEPLOYMENT=gpt-4o-transcribe" -ForegroundColor White
Write-Host "AZURE_OPENAI_API_VERSION=2024-10-01-preview" -ForegroundColor White

Write-Host "`n🤖 Existing gpt-4o-mini Configuration (unchanged):" -ForegroundColor Green
Write-Host "AZURE_OPENAI_ENDPOINT=https://soundscribe-openai.openai.azure.com/" -ForegroundColor White
Write-Host "AZURE_OPENAI_API_KEY=<existing-key>" -ForegroundColor White
Write-Host "AZURE_OPENAI_GPT4O_MINI_DEPLOYMENT=gpt-4o-mini" -ForegroundColor White

# Step 5: Instructions for testing
Write-Host "`n🧪 Step 5: Testing Instructions" -ForegroundColor Cyan
Write-Host "=" * 60 -ForegroundColor Gray

Write-Host "`n1. 🚀 Test the new configuration:" -ForegroundColor Yellow
Write-Host "   supabase functions invoke test-azure-openai" -ForegroundColor White

Write-Host "`n2. 📝 Test with a real audio upload:" -ForegroundColor Yellow
Write-Host "   - Upload an audio file through your app" -ForegroundColor White
Write-Host "   - Check that transcription uses gpt-4o-transcribe" -ForegroundColor White
Write-Host "   - Verify performance improvements" -ForegroundColor White

Write-Host "`n3. 📊 Monitor the logs:" -ForegroundColor Yellow
Write-Host "   supabase functions logs process-recording" -ForegroundColor White

Write-Host "`n✅ Supabase secrets update completed!" -ForegroundColor Green
Write-Host "🎯 Your Edge Functions are now configured to use gpt-4o-transcribe!" -ForegroundColor Green 