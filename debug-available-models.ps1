# Debug Available Models - Show actual model names and details
# This script properly displays available models to diagnose the Whisper issue

param(
    [Parameter(Mandatory=$false)]
    [string]$ResourceGroupName = "soundscribe-rg",
    
    [Parameter(Mandatory=$false)]
    [string]$AccountName = "soundscribe-openai",
    
    [Parameter(Mandatory=$false)]
    [string]$SubscriptionId = "f55203c5-2169-42af-8d67-1b93872aef84"
)

Write-Host "🔍 Debug: Checking available models with proper formatting..." -ForegroundColor Green

# Get access token
try {
    $accessToken = az account get-access-token --query accessToken -o tsv
    if (-not $accessToken) {
        Write-Host "❌ Failed to get access token. Please run: az login" -ForegroundColor Red
        exit 1
    }
    Write-Host "✅ Access token obtained" -ForegroundColor Green
}
catch {
    Write-Host "❌ Failed to get access token: $($_.Exception.Message)" -ForegroundColor Red
    exit 1
}

# API setup
$baseUrl = "https://management.azure.com/subscriptions/$SubscriptionId/resourceGroups/$ResourceGroupName/providers/Microsoft.CognitiveServices/accounts/$AccountName"

$headers = @{
    "Authorization" = "Bearer $accessToken"
    "Content-Type" = "application/json"
}

# Get resource details first
Write-Host "`n🌍 Checking resource location..." -ForegroundColor Yellow

$resourceUrl = "$baseUrl" + "?api-version=2023-05-01"

try {
    $resourceResponse = Invoke-RestMethod -Uri $resourceUrl -Method GET -Headers $headers
    $currentRegion = $resourceResponse.location
    
    Write-Host "📋 Resource Details:" -ForegroundColor Cyan
    Write-Host "  • Name: $($resourceResponse.name)" -ForegroundColor White
    Write-Host "  • Region: $currentRegion" -ForegroundColor White
    Write-Host "  • SKU: $($resourceResponse.sku.name)" -ForegroundColor White
    
    # Check if region supports Whisper
    $whisperRegions = @("eastus2", "southindia", "northcentralus", "norwayeast", "swedencentral", "switzerlandnorth", "westeurope")
    $supportsWhisper = $whisperRegions -contains $currentRegion.ToLower()
    
    Write-Host "  • Whisper Support: $(if ($supportsWhisper) { '✅ YES' } else { '❌ NO' })" -ForegroundColor $(if ($supportsWhisper) { 'Green' } else { 'Red' })
}
catch {
    Write-Host "⚠️ Could not get resource details: $($_.Exception.Message)" -ForegroundColor Yellow
}

# Get available models with proper error handling
Write-Host "`n🔍 Fetching available models..." -ForegroundColor Yellow

$modelsUrl = "$baseUrl/models?api-version=2023-05-01"

try {
    $modelsResponse = Invoke-RestMethod -Uri $modelsUrl -Method GET -Headers $headers
    
    if ($modelsResponse.value -and $modelsResponse.value.Count -gt 0) {
        Write-Host "📋 Available models ($($modelsResponse.value.Count) total):" -ForegroundColor Cyan
        
        $gptModels = @()
        $whisperModels = @()
        $otherModels = @()
        
        foreach ($model in $modelsResponse.value) {
            # Safely extract model info
            $modelId = ""
            $modelVersion = ""
            $capabilities = @()
            
            if ($model.model) {
                if ($model.model.id) { $modelId = $model.model.id }
                if ($model.model.version) { $modelVersion = $model.model.version }
            }
            
            # Handle different response structures
            if ($model.id) { $modelId = $model.id }
            if ($model.version) { $modelVersion = $model.version }
            
            # Extract capabilities
            if ($model.capabilities) {
                $capabilities = $model.capabilities
            }
            
            # Categorize models
            if ($modelId -like "*gpt*" -or $modelId -like "*GPT*") {
                $gptModels += @{ id = $modelId; version = $modelVersion; capabilities = $capabilities }
            }
            elseif ($modelId -like "*whisper*" -or $modelId -like "*Whisper*") {
                $whisperModels += @{ id = $modelId; version = $modelVersion; capabilities = $capabilities }
            }
            else {
                $otherModels += @{ id = $modelId; version = $modelVersion; capabilities = $capabilities }
            }
            
            Write-Host "  • $modelId $(if ($modelVersion) { "(v$modelVersion)" })" -ForegroundColor White
        }
        
        # Summary by category
        Write-Host "`n📊 Model Summary:" -ForegroundColor Green
        Write-Host "  🧠 GPT Models: $($gptModels.Count)" -ForegroundColor White
        foreach ($gpt in $gptModels) {
            Write-Host "    • $($gpt.id) $(if ($gpt.version) { "(v$($gpt.version))" })" -ForegroundColor Cyan
        }
        
        Write-Host "  🎵 Whisper Models: $($whisperModels.Count)" -ForegroundColor White
        if ($whisperModels.Count -eq 0) {
            Write-Host "    ❌ No Whisper models found" -ForegroundColor Red
        } else {
            foreach ($whisper in $whisperModels) {
                Write-Host "    • $($whisper.id) $(if ($whisper.version) { "(v$($whisper.version))" })" -ForegroundColor Green
            }
        }
        
        Write-Host "  📄 Other Models: $($otherModels.Count)" -ForegroundColor White
        
        # Diagnosis
        Write-Host "`n💡 Diagnosis:" -ForegroundColor Yellow
        if ($whisperModels.Count -eq 0) {
            if (-not $supportsWhisper) {
                Write-Host "  ❌ Root cause: Your region ($currentRegion) does not support Whisper" -ForegroundColor Red
                Write-Host "  🔧 Solution: Create new Azure OpenAI resource in supported region" -ForegroundColor Yellow
                
                Write-Host "`n🌍 Whisper-supported regions:" -ForegroundColor Cyan
                Write-Host "  • East US 2 (eastus2) - Recommended" -ForegroundColor White
                Write-Host "  • North Central US (northcentralus)" -ForegroundColor White
                Write-Host "  • West Europe (westeurope)" -ForegroundColor White
                Write-Host "  • Sweden Central (swedencentral)" -ForegroundColor White
                Write-Host "  • Switzerland North (switzerlandnorth)" -ForegroundColor White
                Write-Host "  • Norway East (norwayeast)" -ForegroundColor White
                Write-Host "  • India South (southindia)" -ForegroundColor White
            } else {
                Write-Host "  ⚠️ Strange: Your region supports Whisper but no models found" -ForegroundColor Yellow
                Write-Host "  🔧 Possible solutions:" -ForegroundColor Yellow
                Write-Host "    • Wait for model catalog to refresh (can take hours)" -ForegroundColor White
                Write-Host "    • Request Whisper access/quota from Azure support" -ForegroundColor White
                Write-Host "    • Check subscription permissions" -ForegroundColor White
            }
        } else {
            Write-Host "  ✅ Whisper models are available! Try deployment creation again." -ForegroundColor Green
        }
        
    } else {
        Write-Host "⚠️ No models returned from API" -ForegroundColor Yellow
    }
}
catch {
    Write-Host "❌ Failed to get models: $($_.Exception.Message)" -ForegroundColor Red
    
    if ($_.Exception.Response) {
        Write-Host "   Status: $($_.Exception.Response.StatusCode)" -ForegroundColor Red
    }
}

# Alternative: Check using Azure CLI
Write-Host "`n🔄 Alternative: Checking via Azure CLI..." -ForegroundColor Yellow

try {
    $cliResult = az cognitiveservices model list --name $AccountName --resource-group $ResourceGroupName 2>$null
    
    if ($cliResult) {
        $cliModels = $cliResult | ConvertFrom-Json
        Write-Host "📋 Azure CLI found $($cliModels.Count) models:" -ForegroundColor Cyan
        
        $cliWhisperFound = $false
        foreach ($model in $cliModels) {
            if ($model.name -like "*whisper*") {
                Write-Host "  🎵 $($model.name) (v$($model.version))" -ForegroundColor Green
                $cliWhisperFound = $true
            }
        }
        
        if (-not $cliWhisperFound) {
            Write-Host "  ❌ No Whisper models found via CLI either" -ForegroundColor Red
        }
    }
}
catch {
    Write-Host "⚠️ Azure CLI check failed" -ForegroundColor Yellow
}

Write-Host "`n✅ Debug completed!" -ForegroundColor Green