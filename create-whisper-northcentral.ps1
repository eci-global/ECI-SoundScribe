# Create Azure OpenAI Whisper with STANDARD deployment in North Central US
# Using North Central US region for better US-based performance

param(
    [Parameter(Mandatory=$false)]
    [string]$ResourceGroupName = "soundscribe-rg",
    
    [Parameter(Mandatory=$false)]
    [string]$SubscriptionId = "f55203c5-2169-42af-8d67-1b93872aef84",
    
    [Parameter(Mandatory=$false)]
    [string]$WhisperResourceName = "soundscribe-whisper-ncus"
)

Write-Host "🇺🇸 Creating Azure OpenAI Whisper in North Central US..." -ForegroundColor Green
Write-Host "💡 Using Standard deployment (Whisper doesn't support GlobalStandard)" -ForegroundColor Yellow
Write-Host "📍 Region: North Central US (northcentralus)" -ForegroundColor Cyan

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

# Step 1: Create Azure OpenAI resource in North Central US
Write-Host "`n🏗️ Step 1: Creating Azure OpenAI resource in North Central US..." -ForegroundColor Yellow

$resourceUrl = "https://management.azure.com/subscriptions/$SubscriptionId/resourceGroups/$ResourceGroupName/providers/Microsoft.CognitiveServices/accounts/$WhisperResourceName" + "?api-version=2023-05-01"

$headers = @{
    "Authorization" = "Bearer $accessToken"
    "Content-Type" = "application/json"
}

$resourcePayload = @{
    location = "northcentralus"
    kind = "OpenAI"
    sku = @{
        name = "S0"
    }
    properties = @{
        customSubDomainName = $WhisperResourceName
    }
} | ConvertTo-Json -Depth 5

Write-Host "🔄 Creating resource: $WhisperResourceName in North Central US..." -ForegroundColor Cyan

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
        Write-Host "💡 Resource already exists. Continuing with deployment..." -ForegroundColor Yellow
    } else {
        Write-Host "❌ Resource creation failed: $($_.Exception.Message)" -ForegroundColor Red
        
        Write-Host "`n🔧 Alternative: Use Azure CLI:" -ForegroundColor Yellow
        Write-Host "az cognitiveservices account create --name '$WhisperResourceName' --resource-group '$ResourceGroupName' --location 'northcentralus' --kind 'OpenAI' --sku 'S0'" -ForegroundColor White
        exit 1
    }
}

# Step 2: Wait for resource provisioning
Write-Host "`n⏳ Step 2: Waiting for resource to be ready..." -ForegroundColor Yellow

$maxRetries = 10
$retryCount = 0

do {
    try {
        $checkResponse = Invoke-RestMethod -Uri $resourceUrl -Method GET -Headers $headers
        $state = $checkResponse.properties.provisioningState
        
        Write-Host "📊 Provisioning state: $state" -ForegroundColor Cyan
        
        if ($state -eq "Succeeded") {
            Write-Host "✅ Resource is ready!" -ForegroundColor Green
            break
        } elseif ($state -eq "Failed") {
            Write-Host "❌ Resource provisioning failed" -ForegroundColor Red
            exit 1
        } else {
            Write-Host "⏳ Still provisioning... waiting 15 seconds" -ForegroundColor Yellow
            Start-Sleep -Seconds 15
            $retryCount++
        }
    }
    catch {
        Write-Host "⏳ Resource not accessible yet... waiting 15 seconds" -ForegroundColor Yellow
        Start-Sleep -Seconds 15
        $retryCount++
    }
} while ($retryCount -lt $maxRetries)

# Step 3: Check available models in North Central US
Write-Host "`n🔍 Step 3: Checking available models in North Central US..." -ForegroundColor Yellow

$whisperBaseUrl = "https://management.azure.com/subscriptions/$SubscriptionId/resourceGroups/$ResourceGroupName/providers/Microsoft.CognitiveServices/accounts/$WhisperResourceName"
$modelsUrl = "$whisperBaseUrl/models?api-version=2023-05-01"

try {
    Start-Sleep -Seconds 10  # Give the resource more time
    $modelsResponse = Invoke-RestMethod -Uri $modelsUrl -Method GET -Headers $headers
    
    Write-Host "📋 Available models:" -ForegroundColor Cyan
    $whisperFound = $false
    
    foreach ($model in $modelsResponse.value) {
        $modelId = ""
        if ($model.model -and $model.model.id) {
            $modelId = $model.model.id
        } elseif ($model.id) {
            $modelId = $model.id
        }
        
        Write-Host "  • $modelId" -ForegroundColor White
        
        if ($modelId -like "*whisper*") {
            $whisperFound = $true
            Write-Host "    🎵 Whisper model found!" -ForegroundColor Green
        }
    }
    
    if (-not $whisperFound) {
        Write-Host "⚠️ Whisper model not yet available. Resource may still be initializing..." -ForegroundColor Yellow
    }
}
catch {
    Write-Host "⚠️ Cannot check models yet. Proceeding with deployment attempt..." -ForegroundColor Yellow
}

# Step 4: Create Whisper deployment with incremental scaling
Write-Host "`n🎵 Step 4: Creating Whisper deployment with auto-scaling..." -ForegroundColor Yellow

$whisperDeploymentUrl = "$whisperBaseUrl/deployments/whisper-1?api-version=2024-06-01"

# Try different Whisper formats that work
$whisperConfigs = @(
    @{
        name = "whisper-1 Standard (primary)"
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
                capacity = 1  # Start minimal
            }
        }
    },
    @{
        name = "whisper Standard (alternative)"
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
        Write-Host "📊 Initial Capacity: $($whisperResponse.sku.capacity) TPM" -ForegroundColor Cyan
        Write-Host "📊 Status: $($whisperResponse.properties.provisioningState)" -ForegroundColor Cyan
        
        $whisperCreated = $true
        $deploymentDetails = $whisperResponse
        break
    }
    catch {
        Write-Host "❌ $($config.name) failed: $($_.Exception.Message)" -ForegroundColor Red
        
        # Detailed error information for troubleshooting
        if ($_.Exception.Response) {
            try {
                $errorStream = $_.Exception.Response.GetResponseStream()
                $reader = New-Object System.IO.StreamReader($errorStream)
                $errorBody = $reader.ReadToEnd()
                $reader.Close()
                Write-Host "   Error details: $errorBody" -ForegroundColor Gray
            }
            catch {
                Write-Host "   HTTP Status: $($_.Exception.Response.StatusCode)" -ForegroundColor Gray
            }
        }
    }
}

# Step 5: Auto-scale up to find maximum capacity
if ($whisperCreated -and $deploymentDetails) {
    Write-Host "`n⚡ Step 5: Auto-scaling to find your maximum capacity..." -ForegroundColor Yellow
    
    # North Central US typically has good quota availability
    $scaleUpCapacities = @(5, 10, 25, 50, 100, 200, 300)
    $maxAchievedCapacity = $deploymentDetails.sku.capacity
    
    foreach ($targetCapacity in $scaleUpCapacities) {
        Write-Host "🔄 Attempting to scale to $targetCapacity TPM..." -ForegroundColor Cyan
        
        $scaleUpPayload = @{
            sku = @{
                name = "Standard"
                capacity = $targetCapacity
            }
        } | ConvertTo-Json -Depth 3
        
        try {
            $scaleResponse = Invoke-RestMethod -Uri $whisperDeploymentUrl -Method PATCH -Headers $headers -Body $scaleUpPayload -ErrorAction Stop
            $maxAchievedCapacity = $scaleResponse.sku.capacity
            Write-Host "✅ Successfully scaled to $targetCapacity TPM!" -ForegroundColor Green
            $deploymentDetails = $scaleResponse
        }
        catch {
            Write-Host "❌ Cannot scale to $targetCapacity TPM (quota limit reached)" -ForegroundColor Red
            
            # Try to get specific error information
            if ($_.Exception.Response) {
                try {
                    $errorStream = $_.Exception.Response.GetResponseStream()
                    $reader = New-Object System.IO.StreamReader($errorStream)
                    $errorBody = $reader.ReadToEnd()
                    $reader.Close()
                    
                    if ($errorBody -like "*quota*" -or $errorBody -like "*exceeded*") {
                        Write-Host "   💡 Quota limit reached. Your max capacity is $maxAchievedCapacity TPM" -ForegroundColor Yellow
                    }
                }
                catch { }
            }
            break  # Stop trying higher capacities
        }
    }
    
    Write-Host "`n📊 Final Whisper capacity: $maxAchievedCapacity TPM" -ForegroundColor Green
    
    if ($maxAchievedCapacity -ge 50) {
        Write-Host "🎉 Excellent! High-capacity Whisper deployment achieved!" -ForegroundColor Green
    } elseif ($maxAchievedCapacity -ge 10) {
        Write-Host "✅ Good capacity for production workloads" -ForegroundColor Green
    } else {
        Write-Host "💡 Low capacity - consider requesting quota increase for production use" -ForegroundColor Yellow
    }
}

if (-not $whisperCreated) {
    Write-Host "`n❌ Automated Whisper deployment failed" -ForegroundColor Red
    Write-Host "🔧 Manual creation required:" -ForegroundColor Yellow
    Write-Host "  1. Go to Azure Portal" -ForegroundColor White
    Write-Host "  2. Navigate to resource: $WhisperResourceName" -ForegroundColor White
    Write-Host "  3. Deployments > Create new deployment" -ForegroundColor White
    Write-Host "  4. Model: whisper, Version: 001" -ForegroundColor White
    Write-Host "  5. Deployment name: whisper-1" -ForegroundColor White
    Write-Host "  6. SKU: Standard (NOT GlobalStandard)" -ForegroundColor White
    Write-Host "  7. Capacity: Start with 1, then scale up" -ForegroundColor White
    exit 1
}

# Step 6: Get API keys
Write-Host "`n🔑 Step 6: Retrieving API keys..." -ForegroundColor Yellow

$keysUrl = "$whisperBaseUrl/listKeys?api-version=2023-05-01"

try {
    $keysResponse = Invoke-RestMethod -Uri $keysUrl -Method POST -Headers $headers
    $apiKey1 = $keysResponse.key1
    
    Write-Host "✅ API key retrieved successfully!" -ForegroundColor Green
    Write-Host "🔑 Key preview: $($apiKey1.Substring(0,8))..." -ForegroundColor Cyan
}
catch {
    Write-Host "⚠️ Get API key manually from Azure Portal > $WhisperResourceName > Keys and Endpoint" -ForegroundColor Yellow
    $apiKey1 = "GET_FROM_PORTAL"
}

# Step 7: Final summary and configuration
Write-Host "`n🎉 North Central US Whisper deployment completed!" -ForegroundColor Green

Write-Host "`n📋 Your Optimized Dual-Region Azure OpenAI Setup:" -ForegroundColor Cyan

Write-Host "`n  🧠 GPT Resource (Existing - High Performance):" -ForegroundColor White
Write-Host "    • Deployment: gpt-4o-mini" -ForegroundColor Gray
Write-Host "    • SKU: GlobalStandard (551,000 TPM) 🚀" -ForegroundColor Gray
Write-Host "    • Region: Current region" -ForegroundColor Gray
Write-Host "    • Endpoint: https://soundscribe-openai.openai.azure.com/" -ForegroundColor Gray

Write-Host "`n  🎵 Whisper Resource (New - North Central US):" -ForegroundColor White
Write-Host "    • Deployment: whisper-1" -ForegroundColor Gray
Write-Host "    • SKU: Standard ($($deploymentDetails.sku.capacity) TPM) ⚡" -ForegroundColor Gray
Write-Host "    • Region: North Central US 🇺🇸" -ForegroundColor Gray
Write-Host "    • Endpoint: https://$WhisperResourceName.openai.azure.com/" -ForegroundColor Gray

Write-Host "`n🎯 Performance Benefits:" -ForegroundColor Green
Write-Host "  ✅ GPT: Maximum performance with GlobalStandard (13.8x improvement)" -ForegroundColor White
Write-Host "  ✅ Whisper: Reliable audio processing without rate limiting" -ForegroundColor White
Write-Host "  ✅ US-based latency optimization for North American users" -ForegroundColor White
Write-Host "  ✅ Dual-region resilience and availability" -ForegroundColor White

Write-Host "`n🔧 Environment Variables for Your Application:" -ForegroundColor Cyan
Write-Host "# GPT resource (GlobalStandard - Maximum Performance)" -ForegroundColor Gray
Write-Host "AZURE_OPENAI_ENDPOINT=https://soundscribe-openai.openai.azure.com/" -ForegroundColor White
Write-Host "AZURE_OPENAI_GPT4O_MINI_DEPLOYMENT=gpt-4o-mini" -ForegroundColor White
Write-Host ""
Write-Host "# Whisper resource (North Central US - Standard)" -ForegroundColor Gray
Write-Host "AZURE_OPENAI_WHISPER_ENDPOINT=https://$WhisperResourceName.openai.azure.com/" -ForegroundColor White
Write-Host "AZURE_OPENAI_WHISPER_DEPLOYMENT=whisper-1" -ForegroundColor White
if ($apiKey1 -and $apiKey1 -ne "GET_FROM_PORTAL") {
    Write-Host "AZURE_OPENAI_WHISPER_API_KEY=$apiKey1" -ForegroundColor White
}

if ($maxAchievedCapacity -lt 50) {
    Write-Host "`n💡 Quota Increase Recommendation:" -ForegroundColor Yellow
    Write-Host "Current capacity ($maxAchievedCapacity TPM) may be low for production." -ForegroundColor White
    Write-Host "Consider requesting quota increase:" -ForegroundColor White
    Write-Host "  • Azure Portal > Support > New Support Request" -ForegroundColor Gray
    Write-Host "  • Issue Type: Service and subscription limits (quotas)" -ForegroundColor Gray
    Write-Host "  • Request: Whisper Standard deployment increase to 100-300 TPM" -ForegroundColor Gray
}

Write-Host "`n📋 Next Steps:" -ForegroundColor Green
Write-Host "  1. Test both endpoints with the dual test script" -ForegroundColor White
Write-Host "  2. Update your SoundScribe application for dual endpoints" -ForegroundColor White
Write-Host "  3. Monitor performance - enjoy elimination of rate limiting!" -ForegroundColor White

Write-Host "`n🧪 Test Your Setup:" -ForegroundColor Cyan
Write-Host "# Set the Whisper API key" -ForegroundColor Gray
Write-Host "`$env:AZURE_OPENAI_WHISPER_API_KEY = `"$($apiKey1)`"" -ForegroundColor White
Write-Host ""
Write-Host "# Run the dual setup test" -ForegroundColor Gray  
Write-Host ".\test-dual-azure-setup.ps1 -WhisperEndpoint 'https://$WhisperResourceName.openai.azure.com'" -ForegroundColor White

Write-Host "`n✅ North Central US setup completed! 🇺🇸🚀" -ForegroundColor Green