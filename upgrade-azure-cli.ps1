# Upgrade Azure OpenAI to use gpt-4o-transcribe using Azure CLI
# This script creates a gpt-4o-transcribe deployment using Azure CLI commands

param(
    [Parameter(Mandatory=$false)]
    [string]$ResourceGroupName = "soundscribe-rg",
    
    [Parameter(Mandatory=$false)]
    [string]$AccountName = "soundscribe-openai"
)

Write-Host "🚀 Starting Azure OpenAI gpt-4o-transcribe deployment upgrade (CLI)..." -ForegroundColor Green
Write-Host "📋 Resource Group: $ResourceGroupName" -ForegroundColor Cyan
Write-Host "📋 Account Name: $AccountName" -ForegroundColor Cyan

# Step 1: Check authentication
Write-Host "`n🔐 Step 1: Checking Azure authentication..." -ForegroundColor Yellow
try {
    $account = az account show --query "user.name" -o tsv 2>$null
    if ($LASTEXITCODE -eq 0) {
        Write-Host "✅ Already authenticated as: $account" -ForegroundColor Green
    } else {
        Write-Host "❌ Not authenticated. Please run 'az login' first" -ForegroundColor Red
        exit 1
    }
} catch {
    Write-Host "❌ Azure CLI not available. Please install Azure CLI first" -ForegroundColor Red
    exit 1
}

# Step 2: Check current deployments
Write-Host "`n📊 Step 2: Checking current deployments..." -ForegroundColor Yellow
try {
    $deployments = az cognitiveservices account deployment list --resource-group $ResourceGroupName --name $AccountName --query "[].{name:name, model:model.name, sku:sku.name, capacity:sku.capacity}" -o json 2>$null
    
    if ($LASTEXITCODE -eq 0) {
        $deploymentsObj = $deployments | ConvertFrom-Json
        Write-Host "📋 Current deployments:" -ForegroundColor Cyan
        foreach ($deployment in $deploymentsObj) {
            $status = if ($deployment.sku -eq "GlobalStandard") { "🚀" } else { "⚠️" }
            Write-Host "  $status $($deployment.name): $($deployment.model) - $($deployment.sku) (Capacity: $($deployment.capacity))" -ForegroundColor White
        }
    } else {
        Write-Host "❌ Failed to get deployments. Check your Azure permissions." -ForegroundColor Red
        exit 1
    }
} catch {
    Write-Host "❌ Failed to get deployments: $($_.Exception.Message)" -ForegroundColor Red
    exit 1
}

# Step 3: Create gpt-4o-transcribe deployment
Write-Host "`n🎤 Step 3: Creating gpt-4o-transcribe deployment..." -ForegroundColor Yellow

try {
    # Check if gpt-4o-transcribe deployment already exists
    $existingDeployment = $deploymentsObj | Where-Object { $_.name -eq "gpt-4o-transcribe" }
    
    if ($existingDeployment) {
        Write-Host "🔄 Updating existing gpt-4o-transcribe deployment..." -ForegroundColor Cyan
        
        # Update the deployment to GlobalStandard
        az cognitiveservices account deployment create `
            --resource-group $ResourceGroupName `
            --name $AccountName `
            --deployment-name "gpt-4o-transcribe" `
            --model-name "gpt-4o-transcribe" `
            --model-version "2024-07-18" `
            --sku-name "GlobalStandard" `
            --sku-capacity 300 `
            --force 2>$null
            
        if ($LASTEXITCODE -eq 0) {
            Write-Host "✅ gpt-4o-transcribe deployment updated to GlobalStandard!" -ForegroundColor Green
        } else {
            Write-Host "❌ Failed to update gpt-4o-transcribe deployment" -ForegroundColor Red
        }
    } else {
        Write-Host "➕ Creating new gpt-4o-transcribe GlobalStandard deployment..." -ForegroundColor Cyan
        
        # Create new deployment
        az cognitiveservices account deployment create `
            --resource-group $ResourceGroupName `
            --name $AccountName `
            --deployment-name "gpt-4o-transcribe" `
            --model-name "gpt-4o-transcribe" `
            --model-version "2024-07-18" `
            --sku-name "GlobalStandard" `
            --sku-capacity 300 2>$null
            
        if ($LASTEXITCODE -eq 0) {
            Write-Host "✅ New gpt-4o-transcribe GlobalStandard deployment created!" -ForegroundColor Green
        } else {
            Write-Host "❌ Failed to create gpt-4o-transcribe deployment" -ForegroundColor Red
            Write-Host "💡 You may need to request quota increase in Azure Portal first" -ForegroundColor Yellow
        }
    }
} catch {
    Write-Host "❌ gpt-4o-transcribe deployment failed:" -ForegroundColor Red
    Write-Host "   Error: $($_.Exception.Message)" -ForegroundColor White
}

# Step 4: Update GPT-4o-mini to GlobalStandard (if not already)
Write-Host "`n🤖 Step 4: Upgrading GPT-4o-mini to GlobalStandard..." -ForegroundColor Yellow

try {
    $gptDeployment = $deploymentsObj | Where-Object { $_.name -eq "gpt-4o-mini" }
    
    if ($gptDeployment) {
        Write-Host "🔄 Updating existing gpt-4o-mini deployment..." -ForegroundColor Cyan
        
        az cognitiveservices account deployment create `
            --resource-group $ResourceGroupName `
            --name $AccountName `
            --deployment-name "gpt-4o-mini" `
            --model-name "gpt-4o-mini" `
            --model-version "2024-07-18" `
            --sku-name "GlobalStandard" `
            --sku-capacity 551 `
            --force 2>$null
            
        if ($LASTEXITCODE -eq 0) {
            Write-Host "✅ GPT-4o-mini upgraded to GlobalStandard!" -ForegroundColor Green
        } else {
            Write-Host "❌ Failed to update gpt-4o-mini deployment" -ForegroundColor Red
        }
    } else {
        Write-Host "➕ Creating new gpt-4o-mini GlobalStandard deployment..." -ForegroundColor Cyan
        
        az cognitiveservices account deployment create `
            --resource-group $ResourceGroupName `
            --name $AccountName `
            --deployment-name "gpt-4o-mini" `
            --model-name "gpt-4o-mini" `
            --model-version "2024-07-18" `
            --sku-name "GlobalStandard" `
            --sku-capacity 551 2>$null
            
        if ($LASTEXITCODE -eq 0) {
            Write-Host "✅ New GPT-4o-mini GlobalStandard deployment created!" -ForegroundColor Green
        } else {
            Write-Host "❌ Failed to create gpt-4o-mini deployment" -ForegroundColor Red
        }
    }
} catch {
    Write-Host "❌ GPT-4o-mini upgrade failed:" -ForegroundColor Red
    Write-Host "   Error: $($_.Exception.Message)" -ForegroundColor White
}

# Step 5: Verify final deployments
Write-Host "`n✅ Step 5: Verifying final deployments..." -ForegroundColor Yellow

try {
    $finalDeployments = az cognitiveservices account deployment list --resource-group $ResourceGroupName --name $AccountName --query "[].{name:name, model:model.name, sku:sku.name, capacity:sku.capacity}" -o json 2>$null
    
    if ($LASTEXITCODE -eq 0) {
        $finalDeploymentsObj = $finalDeployments | ConvertFrom-Json
        Write-Host "📋 Final deployment configuration:" -ForegroundColor Green
        foreach ($deployment in $finalDeploymentsObj) {
            $status = if ($deployment.sku -eq "GlobalStandard") { "🚀" } else { "⚠️" }
            Write-Host "  $status $($deployment.name): $($deployment.model) - $($deployment.sku) (Capacity: $($deployment.capacity))" -ForegroundColor White
        }
        
        # Check for success
        $globalStandardCount = ($finalDeploymentsObj | Where-Object { $_.sku -eq "GlobalStandard" }).Count
        
        if ($globalStandardCount -gt 0) {
            Write-Host "`n🎉 SUCCESS! $globalStandardCount deployment(s) upgraded to GlobalStandard" -ForegroundColor Green
            Write-Host "🎯 Rate limiting should now be eliminated!" -ForegroundColor Green
            Write-Host "🔄 Test with audio uploads to see the performance improvement" -ForegroundColor Green
        } else {
            Write-Host "`n⚠️ No GlobalStandard deployments detected" -ForegroundColor Yellow
            Write-Host "💡 You may need to request quota increases in Azure Portal" -ForegroundColor Yellow
        }
    } else {
        Write-Host "❌ Failed to verify deployments" -ForegroundColor Red
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
Write-Host "🎯 Remember to update your environment variables with the new gpt-4o-transcribe configuration" -ForegroundColor Yellow 