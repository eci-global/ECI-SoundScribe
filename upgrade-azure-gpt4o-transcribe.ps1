# Upgrade Azure OpenAI to use gpt-4o-transcribe instead of Whisper
# This script creates a gpt-4o-transcribe deployment and updates environment variables

param(
    [Parameter(Mandatory=$false)]
    [string]$ResourceGroupName = "soundscribe-rg",
    
    [Parameter(Mandatory=$false)]
    [string]$AccountName = "soundscribe-openai"
)

Write-Host "🚀 Starting Azure OpenAI gpt-4o-transcribe deployment upgrade..." -ForegroundColor Green
Write-Host "📋 Resource Group: $ResourceGroupName" -ForegroundColor Cyan
Write-Host "📋 Account Name: $AccountName" -ForegroundColor Cyan

# Step 1: Check authentication
Write-Host "`n🔐 Step 1: Checking Azure authentication..." -ForegroundColor Yellow
try {
    $context = Get-AzContext -ErrorAction Stop
    Write-Host "✅ Already authenticated as: $($context.Account.Id)" -ForegroundColor Green
} catch {
    Write-Host "❌ Not authenticated. Please run Connect-AzAccount first" -ForegroundColor Red
    exit 1
}

# Step 2: Check current deployments
Write-Host "`n📊 Step 2: Checking current deployments..." -ForegroundColor Yellow
try {
    $currentDeployments = Get-AzCognitiveServicesAccountDeployment -ResourceGroupName $ResourceGroupName -AccountName $AccountName -ErrorAction Stop
    
    Write-Host "📋 Current deployments:" -ForegroundColor Cyan
    foreach ($deployment in $currentDeployments) {
        $skuName = if ($deployment.Sku) { $deployment.Sku.Name } else { "Unknown" }
        $capacity = if ($deployment.Sku) { $deployment.Sku.Capacity } else { "Unknown" }
        Write-Host "  • $($deployment.Name): $skuName (Capacity: $capacity)" -ForegroundColor White
    }
} catch {
    Write-Host "❌ Failed to get deployments: $($_.Exception.Message)" -ForegroundColor Red
    exit 1
}

# Step 3: Create gpt-4o-transcribe deployment
Write-Host "`n�� Step 3: Creating gpt-4o-transcribe deployment..." -ForegroundColor Yellow

try {
    # Use GlobalStandard SKU for high performance
    $transcribeSku = @{
        Name = 'GlobalStandard'
        Capacity = 300  # 300K TPM for transcription
    }

    # Check if gpt-4o-transcribe deployment already exists
    $existingTranscribeDeployment = $currentDeployments | Where-Object { $_.Name -eq "gpt-4o-transcribe" }
    
    if ($existingTranscribeDeployment) {
        Write-Host "🔄 Updating existing gpt-4o-transcribe deployment..." -ForegroundColor Cyan
        
        Set-AzCognitiveServicesAccountDeployment `
            -ResourceGroupName $ResourceGroupName `
            -AccountName $AccountName `
            -Name "gpt-4o-transcribe" `
            -Sku $transcribeSku
            
        Write-Host "✅ gpt-4o-transcribe deployment updated to GlobalStandard!" -ForegroundColor Green
    } else {
        Write-Host "➕ Creating new gpt-4o-transcribe GlobalStandard deployment..." -ForegroundColor Cyan
        
        New-AzCognitiveServicesAccountDeployment `
            -ResourceGroupName $ResourceGroupName `
            -AccountName $AccountName `
            -Name "gpt-4o-transcribe" `
            -Model @{Name="gpt-4o-transcribe"; Version="2024-07-18"} `
            -Sku $transcribeSku
            
        Write-Host "✅ New gpt-4o-transcribe GlobalStandard deployment created!" -ForegroundColor Green
    }
} catch {
    Write-Host "❌ gpt-4o-transcribe deployment failed:" -ForegroundColor Red
    Write-Host "   Error: $($_.Exception.Message)" -ForegroundColor White
    
    if ($_.Exception.Message -like "*quota*" -or $_.Exception.Message -like "*limit*") {
        Write-Host "💡 You may need to request quota increase in Azure Portal first" -ForegroundColor Yellow
        Write-Host "   Go to: Azure Portal > Azure OpenAI > Quotas > Request Increase" -ForegroundColor White
    }
}

# Step 4: Update GPT-4o-mini to GlobalStandard (if not already)
Write-Host "`n🤖 Step 4: Upgrading GPT-4o-mini to GlobalStandard..." -ForegroundColor Yellow

try {
    $gptSku = @{
        Name = 'GlobalStandard'
        Capacity = 551  # 551K TPM for chat completions
    }

    $gptDeployment = $currentDeployments | Where-Object { $_.Name -eq "gpt-4o-mini" }
    
    if ($gptDeployment) {
        Write-Host "🔄 Updating existing gpt-4o-mini deployment..." -ForegroundColor Cyan
        
        Set-AzCognitiveServicesAccountDeployment `
            -ResourceGroupName $ResourceGroupName `
            -AccountName $AccountName `
            -Name "gpt-4o-mini" `
            -Sku $gptSku
            
        Write-Host "✅ GPT-4o-mini upgraded to GlobalStandard!" -ForegroundColor Green
    } else {
        Write-Host "➕ Creating new gpt-4o-mini GlobalStandard deployment..." -ForegroundColor Cyan
        
        New-AzCognitiveServicesAccountDeployment `
            -ResourceGroupName $ResourceGroupName `
            -AccountName $AccountName `
            -Name "gpt-4o-mini" `
            -Model @{Name="gpt-4o-mini"; Version="2024-07-18"} `
            -Sku $gptSku
            
        Write-Host "✅ New GPT-4o-mini GlobalStandard deployment created!" -ForegroundColor Green
    }
} catch {
    Write-Host "❌ GPT-4o-mini upgrade failed:" -ForegroundColor Red
    Write-Host "   Error: $($_.Exception.Message)" -ForegroundColor White
}

# Step 5: Verify final deployments
Write-Host "`n✅ Step 5: Verifying final deployments..." -ForegroundColor Yellow

try {
    $finalDeployments = Get-AzCognitiveServicesAccountDeployment -ResourceGroupName $ResourceGroupName -AccountName $AccountName
    
    Write-Host "📋 Final deployment configuration:" -ForegroundColor Green
    foreach ($deployment in $finalDeployments) {
        $skuName = if ($deployment.Sku) { $deployment.Sku.Name } else { "Unknown" }
        $capacity = if ($deployment.Sku) { $deployment.Sku.Capacity } else { "Unknown" }
        $status = if ($skuName -eq "GlobalStandard") { "🚀" } else { "⚠️" }
        Write-Host "  $status $($deployment.Name): $skuName (Capacity: $capacity)" -ForegroundColor White
    }
    
    # Check for success
    $globalStandardCount = ($finalDeployments | Where-Object { $_.Sku.Name -eq "GlobalStandard" }).Count
    
    if ($globalStandardCount -gt 0) {
        Write-Host "`n🎉 SUCCESS! $globalStandardCount deployment(s) upgraded to GlobalStandard" -ForegroundColor Green
        Write-Host "🎯 Rate limiting should now be eliminated!" -ForegroundColor Green
        Write-Host "🔄 Test with audio uploads to see the performance improvement" -ForegroundColor Green
    } else {
        Write-Host "`n⚠️ No GlobalStandard deployments detected" -ForegroundColor Yellow
        Write-Host "💡 You may need to request quota increases in Azure Portal" -ForegroundColor Yellow
    }
} catch {
    Write-Host "❌ Failed to verify deployments: $($_.Exception.Message)" -ForegroundColor Red
}

# Step 6: Display updated environment variables
Write-Host "`n📋 Updated Environment Variables:" -ForegroundColor Cyan
Write-Host "   AZURE_OPENAI_TRANSCRIBE_ENDPOINT=https://$AccountName.openai.azure.com/" -ForegroundColor White
Write-Host "   AZURE_OPENAI_TRANSCRIBE_DEPLOYMENT=gpt-4o-transcribe" -ForegroundColor White
Write-Host "   AZURE_OPENAI_TRANSCRIBE_API_KEY=<your-api-key>" -ForegroundColor White
Write-Host "   AZURE_OPENAI_GPT4O_MINI_DEPLOYMENT=gpt-4o-mini" -ForegroundColor White

Write-Host "`n✅ Script completed!" -ForegroundColor Green
Write-Host "�� Remember to update your environment variables with the new gpt-4o-transcribe configuration" -ForegroundColor Yellow 