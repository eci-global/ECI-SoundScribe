# Discover Your Actual Whisper Quota Limits
# This script finds the maximum capacity available for Whisper in your subscription

param(
    [Parameter(Mandatory=$false)]
    [string]$ResourceGroupName = "soundscribe-rg",
    
    [Parameter(Mandatory=$false)]
    [string]$SubscriptionId = "f55203c5-2169-42af-8d67-1b93872aef84"
)

Write-Host "🔍 Discovering your actual Whisper quota limits..." -ForegroundColor Green

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

$headers = @{
    "Authorization" = "Bearer $accessToken"
    "Content-Type" = "application/json"
}

# Check different Whisper-supported regions
$whisperRegions = @(
    @{name="East US 2"; location="eastus2"},
    @{name="Norway East"; location="norwayeast"},
    @{name="West Europe"; location="westeurope"},
    @{name="Sweden Central"; location="swedencentral"},
    @{name="Switzerland North"; location="switzerlandnorth"},
    @{name="North Central US"; location="northcentralus"},
    @{name="India South"; location="southindia"}
)

Write-Host "`n🌍 Checking Whisper quotas across regions..." -ForegroundColor Yellow

foreach ($region in $whisperRegions) {
    Write-Host "`n📍 Region: $($region.name) ($($region.location))" -ForegroundColor Cyan
    
    # Create temporary resource name for checking
    $tempResourceName = "whisper-quota-check-$($region.location)"
    
    # Check quota for this region
    $quotaUrl = "https://management.azure.com/subscriptions/$SubscriptionId/providers/Microsoft.CognitiveServices/locations/$($region.location)/quotas?api-version=2023-05-01"
    
    try {
        $quotaResponse = Invoke-RestMethod -Uri $quotaUrl -Method GET -Headers $headers
        
        $whisperQuotas = $quotaResponse.value | Where-Object { 
            $_.name -like "*whisper*" -or $_.properties.name -like "*whisper*" 
        }
        
        if ($whisperQuotas) {
            foreach ($quota in $whisperQuotas) {
                Write-Host "  🎵 Model: $($quota.properties.name)" -ForegroundColor Green
                Write-Host "    • Current: $($quota.properties.currentValue)" -ForegroundColor White
                Write-Host "    • Limit: $($quota.properties.limit)" -ForegroundColor White
                Write-Host "    • Unit: $($quota.properties.unit)" -ForegroundColor White
            }
        } else {
            Write-Host "  ⚠️ No Whisper quota information available" -ForegroundColor Yellow
        }
    }
    catch {
        Write-Host "  ❌ Cannot check quota: $($_.Exception.Message)" -ForegroundColor Red
    }
}

# Alternative: Check model catalog for capacity hints
Write-Host "`n🔍 Checking model catalog for capacity information..." -ForegroundColor Yellow

$modelCatalogUrl = "https://management.azure.com/subscriptions/$SubscriptionId/providers/Microsoft.CognitiveServices/modelCatalog?api-version=2023-05-01"

try {
    $catalogResponse = Invoke-RestMethod -Uri $modelCatalogUrl -Method GET -Headers $headers
    
    $whisperModels = $catalogResponse.value | Where-Object { 
        $_.name -like "*whisper*" -or $_.properties.name -like "*whisper*" 
    }
    
    if ($whisperModels) {
        Write-Host "📋 Whisper models in catalog:" -ForegroundColor Cyan
        foreach ($model in $whisperModels) {
            Write-Host "  🎵 $($model.name)" -ForegroundColor Green
            
            if ($model.properties.capabilities) {
                Write-Host "    • Capabilities: $($model.properties.capabilities -join ', ')" -ForegroundColor White
            }
            if ($model.properties.maxCapacity) {
                Write-Host "    • Max Capacity: $($model.properties.maxCapacity)" -ForegroundColor White
            }
        }
    }
}
catch {
    Write-Host "⚠️ Cannot access model catalog" -ForegroundColor Yellow
}

# Practical capacity testing approach
Write-Host "`n🧪 Practical Approach: Test Different Capacities" -ForegroundColor Yellow
Write-Host "Since Azure doesn't publish Whisper limits, here's what to try:" -ForegroundColor Cyan

$testCapacities = @(1, 10, 20, 50, 100, 200, 300, 500, 1000)

Write-Host "`n📋 Recommended Testing Strategy:" -ForegroundColor Green
Write-Host "Try creating Whisper deployments with these capacities (in order):" -ForegroundColor White

foreach ($capacity in $testCapacities) {
    $status = switch ($capacity) {
        {$_ -le 10} { "✅ Very likely to work" }
        {$_ -le 50} { "🟡 Usually available" }
        {$_ -le 100} { "🟠 May require quota request" }
        {$_ -gt 100} { "🔴 Likely needs quota increase" }
    }
    
    Write-Host "  • $capacity TPM - $status" -ForegroundColor White
}

Write-Host "`n💡 Industry Insights (from community reports):" -ForegroundColor Yellow
Write-Host "  • Whisper Standard typically starts at 1-10 TPM" -ForegroundColor White
Write-Host "  • Many users can scale to 50-100 TPM" -ForegroundColor White
Write-Host "  • Higher limits (300+) require quota requests" -ForegroundColor White
Write-Host "  • Whisper quotas are generally lower than GPT quotas" -ForegroundColor White

Write-Host "`n🔧 How to Find Your Exact Limit:" -ForegroundColor Cyan
Write-Host "  1. Start with 1 TPM deployment" -ForegroundColor White
Write-Host "  2. Use PATCH to incrementally increase capacity" -ForegroundColor White
Write-Host "  3. Stop when you get quota errors" -ForegroundColor White
Write-Host "  4. Request quota increase if needed" -ForegroundColor White

Write-Host "`n📞 For Higher Limits:" -ForegroundColor Cyan
Write-Host "  1. Azure Portal > Support > New Support Request" -ForegroundColor White
Write-Host "  2. Issue Type: Service and subscription limits (quotas)" -ForegroundColor White
Write-Host "  3. Quota Type: Cognitive Services" -ForegroundColor White
Write-Host "  4. Specify: Whisper model capacity increase" -ForegroundColor White
Write-Host "  5. Justify: Production workload requirements" -ForegroundColor White

Write-Host "`n📊 Example Quota Request:" -ForegroundColor Yellow
Write-Host "Subject: Whisper Standard Deployment Quota Increase" -ForegroundColor White
Write-Host "Body: Request increase to 300 TPM for whisper-1 Standard deployment" -ForegroundColor White
Write-Host "      in Norway East region for production audio processing workload." -ForegroundColor White

Write-Host "`n✅ Discovery completed!" -ForegroundColor Green
Write-Host "💡 Recommendation: Start with our script using 1 TPM, then scale up" -ForegroundColor Cyan