# Check Existing Azure OpenAI Deployments
# This script will show you exactly what deployments exist and their current configuration

param(
    [Parameter(Mandatory=$false)]
    [string]$ResourceGroupName = "soundscribe-rg",
    
    [Parameter(Mandatory=$false)]
    [string]$AccountName = "soundscribe-openai",
    
    [Parameter(Mandatory=$false)]
    [string]$SubscriptionId = "f55203c5-2169-42af-8d67-1b93872aef84"
)

Write-Host "🔍 Checking existing Azure OpenAI deployments..." -ForegroundColor Green

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

# API endpoints
$baseUrl = "https://management.azure.com/subscriptions/$SubscriptionId/resourceGroups/$ResourceGroupName/providers/Microsoft.CognitiveServices/accounts/$AccountName"
$deploymentsUrl = "$baseUrl/deployments?api-version=2023-05-01"

$headers = @{
    "Authorization" = "Bearer $accessToken"
    "Content-Type" = "application/json"
}

# Get deployments
Write-Host "`n📊 Fetching deployment information..." -ForegroundColor Yellow

try {
    $response = Invoke-RestMethod -Uri $deploymentsUrl -Method GET -Headers $headers
    $deployments = $response.value
    
    if ($deployments -and $deployments.Count -gt 0) {
        Write-Host "📋 Found $($deployments.Count) existing deployment(s):" -ForegroundColor Cyan
        Write-Host ""
        
        foreach ($deployment in $deployments) {
            $name = $deployment.name
            $skuName = $deployment.sku.name
            $skuCapacity = $deployment.sku.capacity
            $modelName = $deployment.properties.model.name
            $modelVersion = $deployment.properties.model.version
            $provisioningState = $deployment.properties.provisioningState
            
            $status = if ($skuName -eq "GlobalStandard") { "🚀" } else { "⚠️" }
            
            Write-Host "  $status Deployment: $name" -ForegroundColor White
            Write-Host "    Model: $modelName (version: $modelVersion)" -ForegroundColor Gray
            Write-Host "    SKU: $skuName" -ForegroundColor Gray
            Write-Host "    Capacity: $skuCapacity" -ForegroundColor Gray
            Write-Host "    Status: $provisioningState" -ForegroundColor Gray
            Write-Host ""
        }
        
        # Analysis
        $gptDeployments = $deployments | Where-Object { $_.properties.model.name -like "*gpt*" }
        $whisperDeployments = $deployments | Where-Object { $_.properties.model.name -like "*whisper*" }
        $globalStandardCount = ($deployments | Where-Object { $_.sku.name -eq "GlobalStandard" }).Count
        
        Write-Host "🧮 Summary:" -ForegroundColor Yellow
        Write-Host "  • Total deployments: $($deployments.Count)" -ForegroundColor White
        Write-Host "  • GPT deployments: $($gptDeployments.Count)" -ForegroundColor White
        Write-Host "  • Whisper deployments: $($whisperDeployments.Count)" -ForegroundColor White
        Write-Host "  • GlobalStandard deployments: $globalStandardCount" -ForegroundColor White
        
        # Recommendations
        Write-Host "`n💡 Recommendations:" -ForegroundColor Cyan
        
        if ($gptDeployments.Count -eq 0) {
            Write-Host "  • No GPT deployments found - you'll need to create one first" -ForegroundColor Yellow
        } else {
            foreach ($gpt in $gptDeployments) {
                if ($gpt.sku.name -ne "GlobalStandard") {
                    Write-Host "  • Upgrade '$($gpt.name)' from $($gpt.sku.name) to GlobalStandard" -ForegroundColor Yellow
                } else {
                    Write-Host "  • '$($gpt.name)' is already GlobalStandard ✅" -ForegroundColor Green
                }
            }
        }
        
        if ($whisperDeployments.Count -eq 0) {
            Write-Host "  • No Whisper deployments found - you may need to create one" -ForegroundColor Yellow
        } else {
            foreach ($whisper in $whisperDeployments) {
                if ($whisper.sku.name -ne "GlobalStandard") {
                    Write-Host "  • Consider upgrading '$($whisper.name)' to GlobalStandard (if available in region)" -ForegroundColor Yellow
                } else {
                    Write-Host "  • '$($whisper.name)' is already GlobalStandard ✅" -ForegroundColor Green
                }
            }
        }
        
    } else {
        Write-Host "⚠️ No deployments found in this Azure OpenAI resource!" -ForegroundColor Yellow
        Write-Host "" 
        Write-Host "💡 You need to create deployments first. Go to:" -ForegroundColor Cyan
        Write-Host "   Azure Portal > Your OpenAI Resource > Deployments > Create New" -ForegroundColor White
        Write-Host ""
        Write-Host "📋 Recommended deployments to create:" -ForegroundColor Yellow
        Write-Host "  1. GPT-4o-mini (for chat/analysis)" -ForegroundColor White
        Write-Host "  2. Whisper (for speech-to-text)" -ForegroundColor White
    }
}
catch {
    Write-Host "❌ Failed to get deployments: $($_.Exception.Message)" -ForegroundColor Red
    
    if ($_.Exception.Response) {
        $statusCode = $_.Exception.Response.StatusCode
        Write-Host "   Status Code: $statusCode" -ForegroundColor Red
        
        if ($statusCode -eq 403) {
            Write-Host "💡 Permission denied. Make sure you have Cognitive Services Contributor role." -ForegroundColor Yellow
        } elseif ($statusCode -eq 404) {
            Write-Host "💡 Resource not found. Check your subscription, resource group, and account names." -ForegroundColor Yellow
        }
    }
}

# Check quotas
Write-Host "`n📊 Checking quota information..." -ForegroundColor Yellow

$quotasUrl = "$baseUrl/quotas?api-version=2023-05-01"

try {
    $quotaResponse = Invoke-RestMethod -Uri $quotasUrl -Method GET -Headers $headers
    
    if ($quotaResponse.value -and $quotaResponse.value.Count -gt 0) {
        Write-Host "📋 Available quotas:" -ForegroundColor Cyan
        
        foreach ($quota in $quotaResponse.value) {
            $modelName = $quota.properties.model.name
            $skuName = $quota.properties.sku.name
            $limit = $quota.properties.limit
            $used = $quota.properties.usage
            
            Write-Host "  • $modelName ($skuName): $used / $limit TPM" -ForegroundColor White
        }
    }
}
catch {
    Write-Host "⚠️ Could not retrieve quota information" -ForegroundColor Yellow
}

Write-Host "`n✅ Deployment check completed!" -ForegroundColor Green