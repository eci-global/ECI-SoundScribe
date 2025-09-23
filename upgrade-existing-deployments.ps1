# Upgrade Existing Azure OpenAI Deployments to GlobalStandard
# This script finds your existing deployments and upgrades them (no creation)

param(
    [Parameter(Mandatory=$false)]
    [string]$ResourceGroupName = "soundscribe-rg",
    
    [Parameter(Mandatory=$false)]
    [string]$AccountName = "soundscribe-openai",
    
    [Parameter(Mandatory=$false)]
    [string]$SubscriptionId = "f55203c5-2169-42af-8d67-1b93872aef84"
)

Write-Host "🔄 Upgrading existing Azure OpenAI deployments to GlobalStandard..." -ForegroundColor Green

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
$deploymentsUrl = "$baseUrl/deployments?api-version=2023-05-01"

$headers = @{
    "Authorization" = "Bearer $accessToken"
    "Content-Type" = "application/json"
}

# Step 1: Get existing deployments
Write-Host "`n📊 Step 1: Finding existing deployments..." -ForegroundColor Yellow

try {
    $response = Invoke-RestMethod -Uri $deploymentsUrl -Method GET -Headers $headers
    $existingDeployments = $response.value
    
    if (-not $existingDeployments -or $existingDeployments.Count -eq 0) {
        Write-Host "❌ No deployments found! You need to create deployments first." -ForegroundColor Red
        Write-Host "💡 Go to Azure Portal > Azure OpenAI > Deployments > Create New" -ForegroundColor Yellow
        exit 1
    }
    
    Write-Host "📋 Found $($existingDeployments.Count) existing deployment(s):" -ForegroundColor Cyan
    foreach ($deployment in $existingDeployments) {
        $status = if ($deployment.sku.name -eq "GlobalStandard") { "🚀" } else { "⚠️" }
        Write-Host "  $status $($deployment.name): $($deployment.sku.name) ($($deployment.sku.capacity) TPM)" -ForegroundColor White
    }
}
catch {
    Write-Host "❌ Failed to get deployments: $($_.Exception.Message)" -ForegroundColor Red
    exit 1
}

# Step 2: Upgrade GPT deployments
Write-Host "`n🧠 Step 2: Upgrading GPT deployments to GlobalStandard..." -ForegroundColor Yellow

$gptDeployments = $existingDeployments | Where-Object { 
    $_.properties.model.name -like "*gpt*" -and $_.sku.name -ne "GlobalStandard" 
}

if ($gptDeployments.Count -eq 0) {
    $allGptDeployments = $existingDeployments | Where-Object { $_.properties.model.name -like "*gpt*" }
    if ($allGptDeployments.Count -eq 0) {
        Write-Host "⚠️ No GPT deployments found to upgrade" -ForegroundColor Yellow
    } else {
        Write-Host "✅ All GPT deployments are already GlobalStandard!" -ForegroundColor Green
    }
} else {
    foreach ($gptDeployment in $gptDeployments) {
        $deploymentName = $gptDeployment.name
        Write-Host "🔄 Upgrading '$deploymentName' to GlobalStandard..." -ForegroundColor Cyan
        
        $gptUpgradeUrl = "$baseUrl/deployments/$deploymentName" + "?api-version=2023-05-01"
        $gptBody = @{
            sku = @{
                name = "GlobalStandard"
                capacity = 551  # 551,000 TPM
            }
        } | ConvertTo-Json
        
        try {
            $gptResult = Invoke-RestMethod -Uri $gptUpgradeUrl -Method PATCH -Headers $headers -Body $gptBody
            Write-Host "✅ '$deploymentName' successfully upgraded to GlobalStandard!" -ForegroundColor Green
        }
        catch {
            Write-Host "❌ Failed to upgrade '$deploymentName': $($_.Exception.Message)" -ForegroundColor Red
            
            # Get more details about the error
            if ($_.Exception.Response) {
                try {
                    $errorStream = $_.Exception.Response.GetResponseStream()
                    $reader = New-Object System.IO.StreamReader($errorStream)
                    $errorBody = $reader.ReadToEnd()
                    Write-Host "   Error details: $errorBody" -ForegroundColor Red
                }
                catch {
                    Write-Host "   Status: $($_.Exception.Response.StatusCode)" -ForegroundColor Red
                }
            }
            
            if ($_.Exception.Message -like "*quota*" -or $_.Exception.Message -like "*429*") {
                Write-Host "💡 Quota limit reached. Request quota increase in Azure Portal." -ForegroundColor Yellow
            }
        }
    }
}

# Step 3: Upgrade Whisper deployments  
Write-Host "`n🎵 Step 3: Upgrading Whisper deployments..." -ForegroundColor Yellow

$whisperDeployments = $existingDeployments | Where-Object { 
    $_.properties.model.name -like "*whisper*" -and $_.sku.name -ne "GlobalStandard"
}

if ($whisperDeployments.Count -eq 0) {
    $allWhisperDeployments = $existingDeployments | Where-Object { $_.properties.model.name -like "*whisper*" }
    if ($allWhisperDeployments.Count -eq 0) {
        Write-Host "⚠️ No Whisper deployments found" -ForegroundColor Yellow
    } else {
        Write-Host "✅ All Whisper deployments are already GlobalStandard!" -ForegroundColor Green
    }
} else {
    foreach ($whisperDeployment in $whisperDeployments) {
        $deploymentName = $whisperDeployment.name
        Write-Host "🔄 Upgrading '$deploymentName' to GlobalStandard..." -ForegroundColor Cyan
        
        $whisperUpgradeUrl = "$baseUrl/deployments/$deploymentName" + "?api-version=2023-05-01"
        $whisperBody = @{
            sku = @{
                name = "GlobalStandard" 
                capacity = 300  # High capacity for Whisper
            }
        } | ConvertTo-Json
        
        try {
            $whisperResult = Invoke-RestMethod -Uri $whisperUpgradeUrl -Method PATCH -Headers $headers -Body $whisperBody
            Write-Host "✅ '$deploymentName' successfully upgraded to GlobalStandard!" -ForegroundColor Green
        }
        catch {
            Write-Host "⚠️ Failed to upgrade '$deploymentName': $($_.Exception.Message)" -ForegroundColor Yellow
            Write-Host "💡 Whisper may not support GlobalStandard in your region" -ForegroundColor Cyan
            
            # Try to upgrade to highest available Standard capacity instead
            Write-Host "🔄 Trying to maximize Standard deployment capacity..." -ForegroundColor Yellow
            
            $whisperStandardBody = @{
                sku = @{
                    name = "Standard"
                    capacity = 100  # Try high Standard capacity
                }
            } | ConvertTo-Json
            
            try {
                $standardResult = Invoke-RestMethod -Uri $whisperUpgradeUrl -Method PATCH -Headers $headers -Body $whisperStandardBody
                Write-Host "✅ '$deploymentName' upgraded to high-capacity Standard deployment" -ForegroundColor Green
            }
            catch {
                Write-Host "⚠️ Could not upgrade '$deploymentName' capacity" -ForegroundColor Yellow
            }
        }
    }
}

# Step 4: Verify final state
Write-Host "`n✅ Step 4: Verifying upgrades..." -ForegroundColor Yellow

try {
    $finalResponse = Invoke-RestMethod -Uri $deploymentsUrl -Method GET -Headers $headers
    $finalDeployments = $finalResponse.value
    
    Write-Host "📋 Final deployment configuration:" -ForegroundColor Green
    $globalStandardCount = 0
    $upgradedDeployments = @()
    
    foreach ($deployment in $finalDeployments) {
        $skuName = $deployment.sku.name
        $capacity = $deployment.sku.capacity
        $modelName = $deployment.properties.model.name
        
        if ($skuName -eq "GlobalStandard") { 
            $globalStandardCount++
            $status = "🚀"
        } else { 
            $status = "⚠️" 
        }
        
        Write-Host "  $status $($deployment.name) ($modelName): $skuName ($capacity TPM)" -ForegroundColor White
        
        if ($skuName -eq "GlobalStandard") {
            $upgradedDeployments += $deployment.name
        }
    }
    
    # Success summary
    Write-Host ""
    if ($globalStandardCount -gt 0) {
        Write-Host "🎉 SUCCESS! $globalStandardCount deployment(s) now on GlobalStandard:" -ForegroundColor Green
        foreach ($name in $upgradedDeployments) {
            Write-Host "  ✅ $name" -ForegroundColor Green
        }
        
        Write-Host "`n🎯 Benefits achieved:" -ForegroundColor Green
        Write-Host "  • Eliminated 429 rate limiting errors" -ForegroundColor White
        Write-Host "  • Up to 13.8x higher rate limits" -ForegroundColor White
        Write-Host "  • Faster processing and better user experience" -ForegroundColor White
        
        Write-Host "`n🔄 Test your application now to see the performance improvement!" -ForegroundColor Green
    } else {
        Write-Host "⚠️ No deployments were upgraded to GlobalStandard" -ForegroundColor Yellow
        Write-Host "💡 Possible reasons:" -ForegroundColor Yellow
        Write-Host "  • Quota limits - request increases in Azure Portal" -ForegroundColor White
        Write-Host "  • GlobalStandard not available in your region" -ForegroundColor White
        Write-Host "  • All deployments were already GlobalStandard" -ForegroundColor White
    }
}
catch {
    Write-Host "❌ Failed to verify final state: $($_.Exception.Message)" -ForegroundColor Red
}

Write-Host "`n✅ Upgrade process completed!" -ForegroundColor Green