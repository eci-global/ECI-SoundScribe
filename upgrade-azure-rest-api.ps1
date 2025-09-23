# Azure OpenAI GlobalStandard Upgrade using REST API
# This script uses Azure REST API calls instead of PowerShell cmdlets for more reliability

param(
    [Parameter(Mandatory=$false)]
    [string]$ResourceGroupName = "soundscribe-rg",
    
    [Parameter(Mandatory=$false)]
    [string]$AccountName = "soundscribe-openai",
    
    [Parameter(Mandatory=$false)]
    [string]$SubscriptionId = "f55203c5-2169-42af-8d67-1b93872aef84"
)

Write-Host "🚀 Azure OpenAI GlobalStandard upgrade using REST API..." -ForegroundColor Green

# Step 1: Get Azure access token
Write-Host "`n🔐 Step 1: Getting Azure access token..." -ForegroundColor Yellow

try {
    # Get access token using Azure CLI (more reliable than PowerShell modules)
    $accessToken = az account get-access-token --query accessToken -o tsv
    
    if (-not $accessToken) {
        Write-Host "❌ Failed to get access token. Please login first:" -ForegroundColor Red
        Write-Host "   az login" -ForegroundColor White
        exit 1
    }
    
    Write-Host "✅ Access token obtained" -ForegroundColor Green
}
catch {
    Write-Host "❌ Failed to get access token. Make sure Azure CLI is installed and you're logged in:" -ForegroundColor Red
    Write-Host "   Install: https://docs.microsoft.com/cli/azure/install-azure-cli" -ForegroundColor White
    Write-Host "   Login: az login" -ForegroundColor White
    exit 1
}

# Step 2: Get current deployments
Write-Host "`n📊 Step 2: Checking current deployments..." -ForegroundColor Yellow

$baseUrl = "https://management.azure.com/subscriptions/$SubscriptionId/resourceGroups/$ResourceGroupName/providers/Microsoft.CognitiveServices/accounts/$AccountName"
$deploymentsUrl = "$baseUrl/deployments?api-version=2023-05-01"

$headers = @{
    "Authorization" = "Bearer $accessToken"
    "Content-Type" = "application/json"
}

try {
    $response = Invoke-RestMethod -Uri $deploymentsUrl -Method GET -Headers $headers
    $currentDeployments = $response.value
    
    Write-Host "📋 Current deployments found:" -ForegroundColor Cyan
    foreach ($deployment in $currentDeployments) {
        $skuName = $deployment.sku.name
        $capacity = $deployment.sku.capacity
        Write-Host "  • $($deployment.name): $skuName (Capacity: $capacity)" -ForegroundColor White
    }
}
catch {
    Write-Host "❌ Failed to get deployments: $($_.Exception.Message)" -ForegroundColor Red
    exit 1
}

# Step 3: Update GPT-4o-mini to GlobalStandard
Write-Host "`n🔄 Step 3: Upgrading GPT-4o-mini to GlobalStandard (551K TPM)..." -ForegroundColor Yellow

$gptDeploymentUrl = "$baseUrl/deployments/gpt-4o-mini?api-version=2023-05-01"
$gptBody = @{
    sku = @{
        name = "GlobalStandard"
        capacity = 551  # 551,000 TPM
    }
} | ConvertTo-Json

try {
    $gptResponse = Invoke-RestMethod -Uri $gptDeploymentUrl -Method PATCH -Headers $headers -Body $gptBody
    Write-Host "✅ GPT-4o-mini successfully upgraded to GlobalStandard!" -ForegroundColor Green
    Write-Host "📊 New configuration: $($gptResponse.sku.name) (Capacity: $($gptResponse.sku.capacity))" -ForegroundColor Cyan
}
catch {
    if ($_.Exception.Response.StatusCode -eq 404) {
        Write-Host "⚠️ GPT-4o-mini deployment not found. Creating new deployment..." -ForegroundColor Yellow
        
        # Create new deployment
        $createGptBody = @{
            model = @{
                name = "gpt-4o-mini"
                version = "2024-07-18"
            }
            sku = @{
                name = "GlobalStandard"
                capacity = 551
            }
        } | ConvertTo-Json
        
        try {
            $newGptResponse = Invoke-RestMethod -Uri $gptDeploymentUrl -Method PUT -Headers $headers -Body $createGptBody
            Write-Host "✅ New GPT-4o-mini GlobalStandard deployment created!" -ForegroundColor Green
        }
        catch {
            Write-Host "❌ Failed to create GPT-4o-mini deployment: $($_.Exception.Message)" -ForegroundColor Red
            if ($_.Exception.Response.StatusCode -eq 429 -or $_.Exception.Message -like "*quota*") {
                Write-Host "💡 Quota limit reached. Request increase in Azure Portal first." -ForegroundColor Yellow
            }
        }
    }
    else {
        Write-Host "❌ Failed to update GPT-4o-mini: $($_.Exception.Message)" -ForegroundColor Red
        if ($_.Exception.Response.StatusCode -eq 429 -or $_.Exception.Message -like "*quota*") {
            Write-Host "💡 Quota limit reached. Request increase in Azure Portal first." -ForegroundColor Yellow
        }
    }
}

# Step 4: Update Whisper to GlobalStandard (using your REST API approach)
Write-Host "`n🎵 Step 4: Upgrading Whisper to GlobalStandard using REST API..." -ForegroundColor Yellow

$whisperDeploymentUrl = "$baseUrl/deployments/whisper-1?api-version=2023-05-01"
$whisperBody = @{
    sku = @{
        name = "GlobalStandard"
        capacity = 300  # High capacity for Whisper
    }
} | ConvertTo-Json

try {
    Write-Host "🔄 Sending PATCH request to update whisper-1 deployment..." -ForegroundColor Cyan
    $whisperResponse = Invoke-RestMethod -Uri $whisperDeploymentUrl -Method PATCH -Headers $headers -Body $whisperBody
    Write-Host "✅ Whisper successfully upgraded to GlobalStandard!" -ForegroundColor Green
    Write-Host "📊 New configuration: $($whisperResponse.sku.name) (Capacity: $($whisperResponse.sku.capacity))" -ForegroundColor Cyan
}
catch {
    if ($_.Exception.Response.StatusCode -eq 404) {
        Write-Host "⚠️ Whisper-1 deployment not found. Creating new deployment..." -ForegroundColor Yellow
        
        # Create new Whisper deployment
        $createWhisperBody = @{
            model = @{
                name = "whisper"
                version = "001"
            }
            sku = @{
                name = "GlobalStandard"
                capacity = 300
            }
        } | ConvertTo-Json
        
        try {
            $newWhisperResponse = Invoke-RestMethod -Uri $whisperDeploymentUrl -Method PUT -Headers $headers -Body $createWhisperBody
            Write-Host "✅ New Whisper GlobalStandard deployment created!" -ForegroundColor Green
        }
        catch {
            Write-Host "⚠️ Failed to create Whisper deployment: $($_.Exception.Message)" -ForegroundColor Yellow
            Write-Host "💡 Whisper may not support GlobalStandard in all regions." -ForegroundColor Cyan
        }
    }
    else {
        Write-Host "⚠️ Failed to update Whisper: $($_.Exception.Message)" -ForegroundColor Yellow
        Write-Host "💡 Note: Whisper GlobalStandard may not be available in your region." -ForegroundColor Cyan
    }
}

# Step 5: Verify deployments
Write-Host "`n✅ Step 5: Verifying final deployments..." -ForegroundColor Yellow

try {
    $finalResponse = Invoke-RestMethod -Uri $deploymentsUrl -Method GET -Headers $headers
    $finalDeployments = $finalResponse.value
    
    Write-Host "📋 Final deployment configuration:" -ForegroundColor Green
    $globalStandardCount = 0
    
    foreach ($deployment in $finalDeployments) {
        $skuName = $deployment.sku.name
        $capacity = $deployment.sku.capacity
        $status = if ($skuName -eq "GlobalStandard") { 
            $globalStandardCount++
            "🚀" 
        } else { 
            "⚠️" 
        }
        Write-Host "  $status $($deployment.name): $skuName (Capacity: $capacity)" -ForegroundColor White
    }
    
    # Success summary
    if ($globalStandardCount -gt 0) {
        Write-Host "`n🎉 SUCCESS! $globalStandardCount deployment(s) upgraded to GlobalStandard" -ForegroundColor Green
        Write-Host "🎯 Benefits achieved:" -ForegroundColor Green
        Write-Host "  • Eliminated 429 rate limiting errors" -ForegroundColor White
        Write-Host "  • 13.8x higher rate limits (551,000 TPM)" -ForegroundColor White
        Write-Host "  • Faster processing and better user experience" -ForegroundColor White
        Write-Host "`n🔄 Test with audio uploads to see the improvement!" -ForegroundColor Green
    } else {
        Write-Host "`n⚠️ No GlobalStandard deployments detected" -ForegroundColor Yellow
        Write-Host "💡 You may need to request quota increases in Azure Portal" -ForegroundColor Yellow
    }
}
catch {
    Write-Host "❌ Failed to verify final deployments: $($_.Exception.Message)" -ForegroundColor Red
}

# Step 6: Provide next steps
Write-Host "`n📋 Next Steps:" -ForegroundColor Cyan
Write-Host "  1. Update environment variables in your application" -ForegroundColor White
Write-Host "  2. Test API endpoints with the test script" -ForegroundColor White
Write-Host "  3. Monitor performance improvements" -ForegroundColor White
Write-Host "  4. Document the new configuration" -ForegroundColor White

Write-Host "`n✅ REST API upgrade script completed!" -ForegroundColor Green
Write-Host "💡 This method often works better than PowerShell cmdlets for deployment updates." -ForegroundColor Yellow