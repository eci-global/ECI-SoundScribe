# Create gpt-4o-transcribe deployment using Azure CLI
# Simple version that works with Azure CLI

param(
    [Parameter(Mandatory=$false)]
    [string]$ResourceGroupName = "soundscribe-rg",
    
    [Parameter(Mandatory=$false)]
    [string]$AccountName = "soundscribe-openai"
)

Write-Host "🚀 Creating gpt-4o-transcribe deployment using Azure CLI..." -ForegroundColor Green
Write-Host "📋 Resource Group: $ResourceGroupName" -ForegroundColor Cyan
Write-Host "📋 Account Name: $AccountName" -ForegroundColor Cyan
Write-Host ""

# Step 1: Check current deployments
Write-Host "📊 Checking current deployments..." -ForegroundColor Yellow

try {
    $deployments = az cognitiveservices account deployment list `
        --resource-group $ResourceGroupName `
        --name $AccountName `
        --query "[].{name:name, model:properties.model.name, sku:sku.name, capacity:sku.capacity}" `
        --output json | ConvertFrom-Json
    
    Write-Host "📋 Current deployments:" -ForegroundColor Cyan
    foreach ($deployment in $deployments) {
        $status = if ($deployment.sku -eq "GlobalStandard") { "🚀" } else { "⚠️" }
        Write-Host "  $status $($deployment.name): $($deployment.sku) (Capacity: $($deployment.capacity))" -ForegroundColor White
    }
    
    # Check if gpt-4o-transcribe already exists
    $existingTranscribe = $deployments | Where-Object { $_.name -eq "gpt-4o-transcribe" }
    if ($existingTranscribe) {
        Write-Host "✅ gpt-4o-transcribe deployment already exists!" -ForegroundColor Green
        Write-Host "📋 Current configuration: $($existingTranscribe.sku) (Capacity: $($existingTranscribe.capacity))" -ForegroundColor White
        Write-Host ""
        Write-Host "🔄 Proceeding to migrate backend code..." -ForegroundColor Yellow
        exit 0
    }
    
} catch {
    Write-Host "❌ Failed to check deployments: $_" -ForegroundColor Red
    exit 1
}

# Step 2: Create gpt-4o-transcribe deployment
Write-Host "`n🎯 Creating gpt-4o-transcribe deployment..." -ForegroundColor Yellow

try {
    Write-Host "Creating deployment with GlobalStandard SKU..." -ForegroundColor White
    
    az cognitiveservices account deployment create `
        --resource-group $ResourceGroupName `
        --name $AccountName `
        --deployment-name "gpt-4o-transcribe" `
        --model-name "gpt-4o" `
        --model-version "2024-08-06" `
        --model-format "OpenAI" `
        --sku-capacity 300 `
        --sku-name "GlobalStandard"
    
    Write-Host "✅ gpt-4o-transcribe deployment created successfully!" -ForegroundColor Green
    
} catch {
    Write-Host "❌ Failed to create gpt-4o-transcribe deployment: $_" -ForegroundColor Red
    Write-Host "💡 Trying with Standard SKU as fallback..." -ForegroundColor Yellow
    
    try {
        az cognitiveservices account deployment create `
            --resource-group $ResourceGroupName `
            --name $AccountName `
            --deployment-name "gpt-4o-transcribe" `
            --model-name "gpt-4o" `
            --model-version "2024-08-06" `
            --model-format "OpenAI" `
            --sku-capacity 100 `
            --sku-name "Standard"
        
        Write-Host "✅ gpt-4o-transcribe deployment created with Standard SKU!" -ForegroundColor Green
        Write-Host "⚠️ Note: Standard SKU has lower rate limits than GlobalStandard" -ForegroundColor Yellow
        
    } catch {
        Write-Host "❌ Both GlobalStandard and Standard deployment failed: $_" -ForegroundColor Red
        Write-Host "💡 You may need to:" -ForegroundColor Yellow
        Write-Host "   1. Request quota increase in Azure Portal" -ForegroundColor White
        Write-Host "   2. Check if gpt-4o model is available in your region" -ForegroundColor White
        Write-Host "   3. Try creating the deployment manually in Azure Portal" -ForegroundColor White
        exit 1
    }
}

# Step 3: Verify deployment
Write-Host "`n✅ Verifying deployment..." -ForegroundColor Yellow

try {
    $finalDeployments = az cognitiveservices account deployment list `
        --resource-group $ResourceGroupName `
        --name $AccountName `
        --query "[].{name:name, model:properties.model.name, sku:sku.name, capacity:sku.capacity}" `
        --output json | ConvertFrom-Json
    
    Write-Host "📋 Final deployment configuration:" -ForegroundColor Green
    foreach ($deployment in $finalDeployments) {
        $status = if ($deployment.sku -eq "GlobalStandard") { "🚀" } else { "⚠️" }
        Write-Host "  $status $($deployment.name): $($deployment.sku) (Capacity: $($deployment.capacity))" -ForegroundColor White
    }
    
    $transcribeDeployment = $finalDeployments | Where-Object { $_.name -eq "gpt-4o-transcribe" }
    if ($transcribeDeployment) {
        Write-Host "`n🎉 SUCCESS! gpt-4o-transcribe deployment is ready!" -ForegroundColor Green
        Write-Host "📋 Configuration: $($transcribeDeployment.sku) (Capacity: $($transcribeDeployment.capacity))" -ForegroundColor White
    } else {
        Write-Host "`n❌ gpt-4o-transcribe deployment not found after creation" -ForegroundColor Red
        exit 1
    }
    
} catch {
    Write-Host "❌ Failed to verify deployment: $_" -ForegroundColor Red
}

Write-Host "`n📋 Environment Variables for your app:" -ForegroundColor Cyan
Write-Host "   AZURE_OPENAI_TRANSCRIBE_ENDPOINT=https://$AccountName.openai.azure.com/" -ForegroundColor White
Write-Host "   AZURE_OPENAI_TRANSCRIBE_DEPLOYMENT=gpt-4o-transcribe" -ForegroundColor White
Write-Host "   AZURE_OPENAI_TRANSCRIBE_API_KEY=<your-existing-api-key>" -ForegroundColor White

Write-Host "`n✅ Script completed!" -ForegroundColor Green
Write-Host "🔄 Next step: Run .\migrate-to-gpt4o-transcribe.ps1 to update your backend code" -ForegroundColor Yellow