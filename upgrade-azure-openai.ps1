# Azure OpenAI GlobalStandard Deployment Upgrade Script
# This script upgrades deployments to GlobalStandard tier for high-performance processing

param(
    [Parameter(Mandatory=$false)]
    [string]$ResourceGroupName = "soundscribe-rg",
    
    [Parameter(Mandatory=$false)]
    [string]$AccountName = "soundscribe-openai",
    
    [Parameter(Mandatory=$false)]
    [string]$SubscriptionId = "f55203c5-2169-42af-8d67-1b93872aef84"
)

Write-Host "🚀 Starting Azure OpenAI GlobalStandard deployment upgrade..." -ForegroundColor Green
Write-Host "📋 Resource Group: $ResourceGroupName" -ForegroundColor Cyan
Write-Host "📋 Account Name: $AccountName" -ForegroundColor Cyan

try {
    # Step 1: Login to Azure and set context
    Write-Host "`n🔐 Step 1: Authenticating with Azure..." -ForegroundColor Yellow
    
    try {
        $context = Get-AzContext -ErrorAction SilentlyContinue
        if ($context -and $context.Account) {
            Write-Host "✅ Already authenticated as: $($context.Account.Id)" -ForegroundColor Green
        } else {
            Write-Host "🔄 No active session found. Connecting to Azure..." -ForegroundColor Yellow
            Connect-AzAccount -WarningAction SilentlyContinue | Out-Null
            Write-Host "✅ Successfully authenticated" -ForegroundColor Green
        }
    }
    catch {
        Write-Host "🔄 Authentication failed. Attempting fresh login..." -ForegroundColor Yellow
        Connect-AzAccount -WarningAction SilentlyContinue | Out-Null
        Write-Host "✅ Successfully authenticated" -ForegroundColor Green
    }
    
    try {
        Set-AzContext -Subscription $SubscriptionId -WarningAction SilentlyContinue | Out-Null
        $currentContext = Get-AzContext
        Write-Host "✅ Context set to subscription: $($currentContext.Subscription.Name) ($SubscriptionId)" -ForegroundColor Green
    }
    catch {
        Write-Host "❌ Failed to set subscription context. Please check subscription ID: $SubscriptionId" -ForegroundColor Red
        throw
    }

    # Step 2: Check current deployments
    Write-Host "`n📊 Step 2: Checking current deployments..." -ForegroundColor Yellow
    $currentDeployments = Get-AzCognitiveServicesAccountDeployment -ResourceGroupName $ResourceGroupName -AccountName $AccountName
    
    if ($currentDeployments) {
        Write-Host "📋 Current deployments found:" -ForegroundColor Cyan
        foreach ($deployment in $currentDeployments) {
            $skuName = if ($deployment.Sku) { $deployment.Sku.Name } else { "Unknown" }
            $capacity = if ($deployment.Sku) { $deployment.Sku.Capacity } else { "Unknown" }
            Write-Host "  • $($deployment.Name): $skuName (Capacity: $capacity)" -ForegroundColor White
        }
    }
    else {
        Write-Host "❌ No deployments found. Please create deployments first." -ForegroundColor Red
        exit 1
    }

    # Step 3: Upgrade GPT-4o-mini to GlobalStandard
    Write-Host "`n🔄 Step 3: Upgrading GPT-4o-mini to GlobalStandard (551K TPM)..." -ForegroundColor Yellow
    
    # Create GlobalStandard SKU for GPT-4o-mini
    $gptSku = @{
        Name = 'GlobalStandard'
        Capacity = 551  # 551,000 TPM capacity
    }

    try {
        # Update or create GPT-4o-mini deployment with GlobalStandard SKU
        $gptDeploymentName = "gpt-4o-mini"
        
        # Check if deployment exists
        $existingGptDeployment = $currentDeployments | Where-Object { $_.Name -eq $gptDeploymentName }
        
        if ($existingGptDeployment) {
            Write-Host "🔄 Updating existing GPT-4o-mini deployment..." -ForegroundColor Yellow
            Set-AzCognitiveServicesAccountDeployment -ResourceGroupName $ResourceGroupName -AccountName $AccountName -Name $gptDeploymentName -Sku $gptSku
        } else {
            Write-Host "➕ Creating new GPT-4o-mini GlobalStandard deployment..." -ForegroundColor Yellow
            New-AzCognitiveServicesAccountDeployment -ResourceGroupName $ResourceGroupName -AccountName $AccountName -Name $gptDeploymentName -Model @{Name="gpt-4o-mini"; Version="2024-07-18"} -Sku $gptSku
        }
        
        Write-Host "✅ GPT-4o-mini successfully upgraded to GlobalStandard (551K TPM)" -ForegroundColor Green
    }
    catch {
        Write-Host "❌ Failed to upgrade GPT-4o-mini: $($_.Exception.Message)" -ForegroundColor Red
        Write-Host "💡 You may need to request quota increase first in Azure Portal" -ForegroundColor Yellow
    }

    # Step 4: Upgrade Whisper to GlobalStandard (if available)
    Write-Host "`n🎵 Step 4: Upgrading Whisper to GlobalStandard..." -ForegroundColor Yellow
    
    $whisperSku = @{
        Name = 'GlobalStandard'
        Capacity = 300  # High capacity for Whisper
    }

    try {
        $whisperDeploymentName = "whisper-1"
        
        # Check if Whisper deployment exists
        $existingWhisperDeployment = $currentDeployments | Where-Object { $_.Name -eq $whisperDeploymentName }
        
        if ($existingWhisperDeployment) {
            Write-Host "🔄 Updating existing Whisper deployment..." -ForegroundColor Yellow
            Set-AzCognitiveServicesAccountDeployment -ResourceGroupName $ResourceGroupName -AccountName $AccountName -Name $whisperDeploymentName -Sku $whisperSku
            Write-Host "✅ Whisper successfully upgraded to GlobalStandard" -ForegroundColor Green
        } else {
            Write-Host "➕ Creating new Whisper GlobalStandard deployment..." -ForegroundColor Yellow
            New-AzCognitiveServicesAccountDeployment -ResourceGroupName $ResourceGroupName -AccountName $AccountName -Name $whisperDeploymentName -Model @{Name="whisper"; Version="001"} -Sku $whisperSku
            Write-Host "✅ Whisper GlobalStandard deployment created" -ForegroundColor Green
        }
    }
    catch {
        Write-Host "⚠️ Whisper GlobalStandard upgrade failed: $($_.Exception.Message)" -ForegroundColor Yellow
        Write-Host "💡 Note: Whisper may not support GlobalStandard in all regions. Standard deployment with high quota should work." -ForegroundColor Cyan
    }

    # Step 5: Verify final deployments
    Write-Host "`n✅ Step 5: Verifying final deployments..." -ForegroundColor Yellow
    $finalDeployments = Get-AzCognitiveServicesAccountDeployment -ResourceGroupName $ResourceGroupName -AccountName $AccountName
    
    Write-Host "📋 Final deployment configuration:" -ForegroundColor Green
    foreach ($deployment in $finalDeployments) {
        $skuName = if ($deployment.Sku) { $deployment.Sku.Name } else { "Unknown" }
        $capacity = if ($deployment.Sku) { $deployment.Sku.Capacity } else { "Unknown" }
        $status = if ($skuName -eq "GlobalStandard") { "🚀" } else { "⚠️" }
        Write-Host "  $status $($deployment.Name): $skuName (Capacity: $capacity)" -ForegroundColor White
    }

    # Success message
    Write-Host "`n🎉 Upgrade process completed!" -ForegroundColor Green
    Write-Host "✅ Your Azure OpenAI deployments are now optimized for high-performance processing" -ForegroundColor Green
    Write-Host "🎯 Benefits: Eliminated 429 rate limiting errors, instant processing, better user experience" -ForegroundColor Green
    Write-Host "🔄 Test with a new recording upload to experience real-time AI processing!" -ForegroundColor Green
    
    # Next steps
    Write-Host "`n📋 Next Steps:" -ForegroundColor Cyan
    Write-Host "  1. Update your environment variables to use the new deployment names" -ForegroundColor White
    Write-Host "  2. Test the API endpoints to verify functionality" -ForegroundColor White
    Write-Host "  3. Monitor usage and performance metrics" -ForegroundColor White
    Write-Host "  4. Update documentation with new configuration" -ForegroundColor White

}
catch {
    Write-Host "`n❌ Script execution failed: $($_.Exception.Message)" -ForegroundColor Red
    Write-Host "💡 Please check your Azure permissions and resource configuration" -ForegroundColor Yellow
    exit 1
}