# Simple Azure OpenAI GlobalStandard Upgrade (Assumes you're already logged in)
# Run this if the main script gets stuck on authentication

param(
    [Parameter(Mandatory=$false)]
    [string]$ResourceGroupName = "soundscribe-rg",
    
    [Parameter(Mandatory=$false)]
    [string]$AccountName = "soundscribe-openai"
)

Write-Host "🚀 Simple Azure OpenAI GlobalStandard upgrade..." -ForegroundColor Green
Write-Host "💡 This script assumes you're already logged into Azure" -ForegroundColor Yellow

# Skip authentication and go straight to deployment check
Write-Host "`n📊 Checking current deployments..." -ForegroundColor Yellow

try {
    $currentDeployments = Get-AzCognitiveServicesAccountDeployment -ResourceGroupName $ResourceGroupName -AccountName $AccountName -ErrorAction Stop
    
    Write-Host "📋 Found deployments:" -ForegroundColor Cyan
    foreach ($deployment in $currentDeployments) {
        $skuName = if ($deployment.Sku) { $deployment.Sku.Name } else { "Unknown" }
        $capacity = if ($deployment.Sku) { $deployment.Sku.Capacity } else { "Unknown" }
        Write-Host "  • $($deployment.Name): $skuName (Capacity: $capacity)" -ForegroundColor White
    }
}
catch {
    Write-Host "❌ Failed to get deployments. Make sure you're logged in with:" -ForegroundColor Red
    Write-Host "   Connect-AzAccount" -ForegroundColor White
    Write-Host "   Set-AzContext -Subscription 'your-subscription-id'" -ForegroundColor White
    exit 1
}

# Update GPT-4o-mini to GlobalStandard
Write-Host "`n🔄 Upgrading GPT-4o-mini to GlobalStandard (551K TPM)..." -ForegroundColor Yellow

try {
    # Use the correct PowerShell hashtable syntax for SKU
    $sku = @{
        Name = 'GlobalStandard'
        Capacity = 551
    }

    # Check if gpt-4o-mini deployment exists
    $gptDeployment = $currentDeployments | Where-Object { $_.Name -eq "gpt-4o-mini" }
    
    if ($gptDeployment) {
        Write-Host "🔄 Updating existing gpt-4o-mini deployment..." -ForegroundColor Cyan
        
        # Update the deployment
        Set-AzCognitiveServicesAccountDeployment `
            -ResourceGroupName $ResourceGroupName `
            -AccountName $AccountName `
            -Name "gpt-4o-mini" `
            -Sku $sku
            
        Write-Host "✅ GPT-4o-mini upgraded to GlobalStandard!" -ForegroundColor Green
    }
    else {
        Write-Host "➕ Creating new gpt-4o-mini GlobalStandard deployment..." -ForegroundColor Cyan
        
        # Create new deployment
        New-AzCognitiveServicesAccountDeployment `
            -ResourceGroupName $ResourceGroupName `
            -AccountName $AccountName `
            -Name "gpt-4o-mini" `
            -Model @{Name="gpt-4o-mini"; Version="2024-07-18"} `
            -Sku $sku
            
        Write-Host "✅ New GPT-4o-mini GlobalStandard deployment created!" -ForegroundColor Green
    }
}
catch {
    Write-Host "❌ GPT-4o-mini upgrade failed:" -ForegroundColor Red
    Write-Host "   Error: $($_.Exception.Message)" -ForegroundColor White
    
    if ($_.Exception.Message -like "*quota*" -or $_.Exception.Message -like "*limit*") {
        Write-Host "💡 You may need to request quota increase in Azure Portal first" -ForegroundColor Yellow
        Write-Host "   Go to: Azure Portal > Azure OpenAI > Quotas > Request Increase" -ForegroundColor White
    }
}

# Update Whisper deployment
Write-Host "`n🎵 Upgrading Whisper deployment..." -ForegroundColor Yellow

try {
    $whisperSku = @{
        Name = 'GlobalStandard'
        Capacity = 300
    }

    $whisperDeployment = $currentDeployments | Where-Object { $_.Name -eq "whisper-1" }
    
    if ($whisperDeployment) {
        Write-Host "🔄 Updating existing whisper-1 deployment..." -ForegroundColor Cyan
        
        Set-AzCognitiveServicesAccountDeployment `
            -ResourceGroupName $ResourceGroupName `
            -AccountName $AccountName `
            -Name "whisper-1" `
            -Sku $whisperSku
            
        Write-Host "✅ Whisper upgraded to GlobalStandard!" -ForegroundColor Green
    }
    else {
        Write-Host "⚠️ whisper-1 deployment not found. Creating new one..." -ForegroundColor Yellow
        
        New-AzCognitiveServicesAccountDeployment `
            -ResourceGroupName $ResourceGroupName `
            -AccountName $AccountName `
            -Name "whisper-1" `
            -Model @{Name="whisper"; Version="001"} `
            -Sku $whisperSku
            
        Write-Host "✅ New Whisper GlobalStandard deployment created!" -ForegroundColor Green
    }
}
catch {
    Write-Host "⚠️ Whisper upgrade failed: $($_.Exception.Message)" -ForegroundColor Yellow
    Write-Host "💡 Whisper may not support GlobalStandard in your region" -ForegroundColor Cyan
}

# Verify final state
Write-Host "`n✅ Verifying final deployments..." -ForegroundColor Yellow

try {
    $finalDeployments = Get-AzCognitiveServicesAccountDeployment -ResourceGroupName $ResourceGroupName -AccountName $AccountName
    
    Write-Host "📋 Final configuration:" -ForegroundColor Green
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
}
catch {
    Write-Host "❌ Failed to verify deployments: $($_.Exception.Message)" -ForegroundColor Red
}

Write-Host "`n✅ Script completed!" -ForegroundColor Green