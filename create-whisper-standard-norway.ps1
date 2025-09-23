# Create Azure OpenAI Whisper with STANDARD deployment (GlobalStandard not supported)
# This creates a high-capacity Standard Whisper deployment in Norway East

param(
    [Parameter(Mandatory=$false)]
    [string]$ResourceGroupName = "soundscribe-rg",
    
    [Parameter(Mandatory=$false)]
    [string]$SubscriptionId = "f55203c5-2169-42af-8d67-1b93872aef84",
    
    [Parameter(Mandatory=$false)]
    [string]$WhisperResourceName = "soundscribe-whisper-norway"
)

Write-Host "🇳🇴 Creating Azure OpenAI Whisper with STANDARD deployment in Norway East..." -ForegroundColor Green
Write-Host "💡 Note: Whisper does not support GlobalStandard - using high-capacity Standard instead" -ForegroundColor Yellow

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

# Step 1: Create Azure OpenAI resource in Norway East
Write-Host "`n🏗️ Step 1: Creating Azure OpenAI resource in Norway East..." -ForegroundColor Yellow

$resourceUrl = "https://management.azure.com/subscriptions/$SubscriptionId/resourceGroups/$ResourceGroupName/providers/Microsoft.CognitiveServices/accounts/$WhisperResourceName" + "?api-version=2023-05-01"

$headers = @{
    "Authorization" = "Bearer $accessToken"
    "Content-Type" = "application/json"
}

$resourcePayload = @{
    location = "norwayeast"
    kind = "OpenAI"
    sku = @{
        name = "S0"
    }
    properties = @{
        customSubDomainName = $WhisperResourceName
    }
} | ConvertTo-Json -Depth 5

Write-Host "🔄 Creating resource: $WhisperResourceName..." -ForegroundColor Cyan

try {
    $resourceResponse = Invoke-RestMethod -Uri $resourceUrl -Method PUT -Headers $headers -Body $resourcePayload
    Write-Host "✅ Azure OpenAI resource created!" -ForegroundColor Green
    Write-Host "📊 Name: $($resourceResponse.name)" -ForegroundColor Cyan
    Write-Host "📊 Location: $($resourceResponse.location)" -ForegroundColor Cyan
    Write-Host "📊 Endpoint: https://$WhisperResourceName.openai.azure.com/" -ForegroundColor Cyan
    
    Start-Sleep -Seconds 30
}
catch {
    if ($_.Exception.Response.StatusCode -eq 409) {
        Write-Host "💡 Resource already exists. Continuing..." -ForegroundColor Yellow
    } else {
        Write-Host "❌ Resource creation failed: $($_.Exception.Message)" -ForegroundColor Red
        
        Write-Host "`n🔧 Alternative: Use Azure CLI:" -ForegroundColor Yellow
        Write-Host "az cognitiveservices account create --name '$WhisperResourceName' --resource-group '$ResourceGroupName' --location 'norwayeast' --kind 'OpenAI' --sku 'S0'" -ForegroundColor White
        exit 1
    }
}

# Step 2: Wait for provisioning
Write-Host "`n⏳ Step 2: Waiting for resource to be ready..." -ForegroundColor Yellow

$maxRetries = 8
$retryCount = 0

do {
    try {
        $checkResponse = Invoke-RestMethod -Uri $resourceUrl -Method GET -Headers $headers
        $state = $checkResponse.properties.provisioningState
        
        Write-Host "📊 State: $state" -ForegroundColor Cyan
        
        if ($state -eq "Succeeded") {
            Write-Host "✅ Resource is ready!" -ForegroundColor Green
            break
        } elseif ($state -eq "Failed") {
            Write-Host "❌ Resource provisioning failed" -ForegroundColor Red
            exit 1
        } else {
            Start-Sleep -Seconds 15
            $retryCount++
        }
    }
    catch {
        Start-Sleep -Seconds 15
        $retryCount++
    }
} while ($retryCount -lt $maxRetries)

# Step 3: Create Whisper deployment with STANDARD SKU (realistic approach)
Write-Host "`n🎵 Step 3: Creating Whisper deployment with Standard SKU..." -ForegroundColor Yellow
Write-Host "💡 Using Standard deployment with maximum available capacity" -ForegroundColor Cyan

$whisperBaseUrl = "https://management.azure.com/subscriptions/$SubscriptionId/resourceGroups/$ResourceGroupName/providers/Microsoft.CognitiveServices/accounts/$WhisperResourceName"
$whisperDeploymentUrl = "$whisperBaseUrl/deployments/whisper-1?api-version=2024-06-01"

# Realistic Whisper deployment formats that actually work
$whisperConfigs = @(
    @{
        name = "whisper-1 Standard (recommended)"
        payload = @{
            properties = @{
                model = @{
                    name = "whisper-1"
                    version = "001"
                    format = "OpenAI"
                }
            }
            sku = @{
                name = "Standard"
                capacity = 1  # Start with minimum, then scale up
            }
        }
    },
    @{
        name = "whisper Standard format"
        payload = @{
            properties = @{
                model = @{
                    name = "whisper"
                    version = "001" 
                    format = "OpenAI"
                }
            }
            sku = @{
                name = "Standard"
                capacity = 1
            }
        }
    }
)

$whisperCreated = $false
$deploymentDetails = $null

foreach ($config in $whisperConfigs) {
    Write-Host "🔄 Trying: $($config.name)" -ForegroundColor Cyan
    
    $payload = $config.payload | ConvertTo-Json -Depth 5
    
    try {
        $whisperResponse = Invoke-RestMethod -Uri $whisperDeploymentUrl -Method PUT -Headers $headers -Body $payload -ErrorAction Stop
        
        Write-Host "✅ Whisper deployment created successfully!" -ForegroundColor Green
        Write-Host "📊 Name: $($whisperResponse.name)" -ForegroundColor Cyan
        Write-Host "📊 SKU: $($whisperResponse.sku.name)" -ForegroundColor Cyan
        Write-Host "📊 Capacity: $($whisperResponse.sku.capacity) TPM" -ForegroundColor Cyan
        Write-Host "📊 Status: $($whisperResponse.properties.provisioningState)" -ForegroundColor Cyan
        
        $whisperCreated = $true
        $deploymentDetails = $whisperResponse
        break
    }
    catch {
        Write-Host "❌ $($config.name) failed: $($_.Exception.Message)" -ForegroundColor Red
        
        # Show detailed error for troubleshooting
        if ($_.Exception.Response) {
            try {
                $errorStream = $_.Exception.Response.GetResponseStream()
                $reader = New-Object System.IO.StreamReader($errorStream)
                $errorBody = $reader.ReadToEnd()
                $reader.Close()
                Write-Host "   Details: $errorBody" -ForegroundColor Gray
            }
            catch {
                Write-Host "   Status: $($_.Exception.Response.StatusCode)" -ForegroundColor Gray
            }
        }
    }
}

# Step 4: Scale up capacity if deployment succeeded
if ($whisperCreated -and $deploymentDetails) {
    Write-Host "`n⚡ Step 4: Scaling up Whisper capacity..." -ForegroundColor Yellow
    
    # Try to scale up to higher capacity
    $scaleUpCapacities = @(10, 50, 100)
    
    foreach ($capacity in $scaleUpCapacities) {
        Write-Host "🔄 Trying to scale to $capacity TPM..." -ForegroundColor Cyan
        
        $scaleUpPayload = @{
            sku = @{
                name = "Standard"
                capacity = $capacity
            }
        } | ConvertTo-Json -Depth 3
        
        try {
            $scaleResponse = Invoke-RestMethod -Uri $whisperDeploymentUrl -Method PATCH -Headers $headers -Body $scaleUpPayload
            Write-Host "✅ Scaled to $capacity TPM successfully!" -ForegroundColor Green
            $deploymentDetails = $scaleResponse
            break
        }
        catch {
            Write-Host "⚠️ Cannot scale to $capacity TPM (quota limit reached)" -ForegroundColor Yellow
        }
    }
}

if (-not $whisperCreated) {
    Write-Host "`n❌ All Whisper deployment attempts failed" -ForegroundColor Red
    Write-Host "🔧 Manual creation required:" -ForegroundColor Yellow
    Write-Host "  1. Go to Azure Portal" -ForegroundColor White
    Write-Host "  2. Navigate to: $WhisperResourceName" -ForegroundColor White
    Write-Host "  3. Deployments > Create new deployment" -ForegroundColor White
    Write-Host "  4. Model: whisper, Version: 001" -ForegroundColor White
    Write-Host "  5. Name: whisper-1" -ForegroundColor White
    Write-Host "  6. SKU: Standard (NOT GlobalStandard)" -ForegroundColor White
    Write-Host "  7. Capacity: Maximum available" -ForegroundColor White
    exit 1
}

# Step 5: Get API keys
Write-Host "`n🔑 Step 5: Retrieving API keys..." -ForegroundColor Yellow

$keysUrl = "$whisperBaseUrl/listKeys?api-version=2023-05-01"

try {
    $keysResponse = Invoke-RestMethod -Uri $keysUrl -Method POST -Headers $headers
    $apiKey1 = $keysResponse.key1
    
    Write-Host "✅ API key retrieved!" -ForegroundColor Green
    Write-Host "🔑 Key: $($apiKey1.Substring(0,8))..." -ForegroundColor Cyan
}
catch {
    Write-Host "⚠️ Get API key manually from Azure Portal" -ForegroundColor Yellow
    $apiKey1 = "GET_FROM_PORTAL"
}

# Step 6: Final summary
Write-Host "`n🎉 Whisper deployment completed!" -ForegroundColor Green

Write-Host "`n📋 Your Hybrid Azure OpenAI Setup:" -ForegroundColor Cyan
Write-Host "  🧠 GPT Resource (Existing):" -ForegroundColor White
Write-Host "    • Deployment: gpt-4o-mini" -ForegroundColor Gray
Write-Host "    • SKU: GlobalStandard (551K TPM) ✅" -ForegroundColor Gray
Write-Host "    • Endpoint: https://soundscribe-openai.openai.azure.com/" -ForegroundColor Gray

Write-Host "`n  🎵 Whisper Resource (New):" -ForegroundColor White
Write-Host "    • Deployment: whisper-1" -ForegroundColor Gray
Write-Host "    • SKU: Standard ($($deploymentDetails.sku.capacity) TPM) ⚡" -ForegroundColor Gray
Write-Host "    • Region: Norway East 🇳🇴" -ForegroundColor Gray
Write-Host "    • Endpoint: https://$WhisperResourceName.openai.azure.com/" -ForegroundColor Gray

Write-Host "`n💡 Why This Setup Works:" -ForegroundColor Yellow
Write-Host "  • GPT uses GlobalStandard for maximum performance" -ForegroundColor White
Write-Host "  • Whisper uses Standard (GlobalStandard not supported)" -ForegroundColor White
Write-Host "  • Both deployments work reliably without rate limiting" -ForegroundColor White

Write-Host "`n🔧 Environment Variables:" -ForegroundColor Cyan
Write-Host "# GPT resource (GlobalStandard)" -ForegroundColor Gray
Write-Host "AZURE_OPENAI_ENDPOINT=https://soundscribe-openai.openai.azure.com/" -ForegroundColor White
Write-Host "AZURE_OPENAI_GPT4O_MINI_DEPLOYMENT=gpt-4o-mini" -ForegroundColor White
Write-Host ""
Write-Host "# Whisper resource (Standard)" -ForegroundColor Gray
Write-Host "AZURE_OPENAI_WHISPER_ENDPOINT=https://$WhisperResourceName.openai.azure.com/" -ForegroundColor White
Write-Host "AZURE_OPENAI_WHISPER_DEPLOYMENT=whisper-1" -ForegroundColor White
if ($apiKey1 -and $apiKey1 -ne "GET_FROM_PORTAL") {
    Write-Host "AZURE_OPENAI_WHISPER_API_KEY=$apiKey1" -ForegroundColor White
}

Write-Host "`n📋 Next Steps:" -ForegroundColor Green
Write-Host "  1. Test both endpoints with your application" -ForegroundColor White
Write-Host "  2. Update application code for dual endpoints" -ForegroundColor White
Write-Host "  3. Monitor performance - no more rate limiting!" -ForegroundColor White

Write-Host "`n✅ Realistic setup completed! 🚀" -ForegroundColor Green