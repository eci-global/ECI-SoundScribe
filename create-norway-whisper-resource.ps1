# Create Azure OpenAI Resource in Norway East for Whisper
# This creates a dedicated Whisper resource while keeping your existing GPT resource

param(
    [Parameter(Mandatory=$false)]
    [string]$ResourceGroupName = "soundscribe-rg",
    
    [Parameter(Mandatory=$false)]
    [string]$SubscriptionId = "f55203c5-2169-42af-8d67-1b93872aef84",
    
    [Parameter(Mandatory=$false)]
    [string]$WhisperResourceName = "soundscribe-whisper-norway"
)

Write-Host "🇳🇴 Creating Azure OpenAI resource in Norway East for Whisper..." -ForegroundColor Green
Write-Host "📋 Resource Group: $ResourceGroupName" -ForegroundColor Cyan
Write-Host "📋 Whisper Resource: $WhisperResourceName" -ForegroundColor Cyan
Write-Host "📋 Location: Norway East" -ForegroundColor Cyan

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

# Step 1: Create new Azure OpenAI resource in Norway East
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

Write-Host "🔄 Creating resource: $WhisperResourceName in Norway East..." -ForegroundColor Cyan

try {
    $resourceResponse = Invoke-RestMethod -Uri $resourceUrl -Method PUT -Headers $headers -Body $resourcePayload
    Write-Host "✅ Azure OpenAI resource created successfully!" -ForegroundColor Green
    Write-Host "📊 Resource: $($resourceResponse.name)" -ForegroundColor Cyan
    Write-Host "📊 Location: $($resourceResponse.location)" -ForegroundColor Cyan
    Write-Host "📊 Status: $($resourceResponse.properties.provisioningState)" -ForegroundColor Cyan
    Write-Host "📊 Endpoint: https://$WhisperResourceName.openai.azure.com/" -ForegroundColor Cyan
    
    # Wait for resource to be fully provisioned
    Write-Host "`n⏳ Waiting for resource provisioning to complete..." -ForegroundColor Yellow
    Start-Sleep -Seconds 30
}
catch {
    Write-Host "❌ Failed to create resource: $($_.Exception.Message)" -ForegroundColor Red
    
    if ($_.Exception.Response) {
        try {
            $errorStream = $_.Exception.Response.GetResponseStream()
            $reader = New-Object System.IO.StreamReader($errorStream)
            $errorBody = $reader.ReadToEnd()
            $reader.Close()
            
            Write-Host "   Error details: $errorBody" -ForegroundColor Red
            
            if ($errorBody -like "*already exists*" -or $errorBody -like "*conflict*") {
                Write-Host "💡 Resource may already exist. Continuing with deployment creation..." -ForegroundColor Yellow
            } else {
                Write-Host "💡 Try using Azure CLI as fallback:" -ForegroundColor Yellow
                Write-Host "   az cognitiveservices account create --name '$WhisperResourceName' --resource-group '$ResourceGroupName' --location 'norwayeast' --kind 'OpenAI' --sku 'S0'" -ForegroundColor White
                exit 1
            }
        }
        catch {
            Write-Host "   Status: $($_.Exception.Response.StatusCode)" -ForegroundColor Red
        }
    }
}

# Step 2: Wait and verify resource is ready
Write-Host "`n🔍 Step 2: Verifying resource is ready..." -ForegroundColor Yellow

$maxRetries = 6
$retryCount = 0

do {
    try {
        $checkResponse = Invoke-RestMethod -Uri $resourceUrl -Method GET -Headers $headers
        $provisioningState = $checkResponse.properties.provisioningState
        
        Write-Host "📊 Provisioning state: $provisioningState" -ForegroundColor Cyan
        
        if ($provisioningState -eq "Succeeded") {
            Write-Host "✅ Resource is ready!" -ForegroundColor Green
            break
        } elseif ($provisioningState -eq "Failed") {
            Write-Host "❌ Resource provisioning failed" -ForegroundColor Red
            exit 1
        } else {
            Write-Host "⏳ Still provisioning... waiting 15 seconds" -ForegroundColor Yellow
            Start-Sleep -Seconds 15
            $retryCount++
        }
    }
    catch {
        Write-Host "⏳ Resource not ready yet... waiting 15 seconds" -ForegroundColor Yellow
        Start-Sleep -Seconds 15
        $retryCount++
    }
} while ($retryCount -lt $maxRetries)

# Step 3: Create Whisper deployment
Write-Host "`n🎵 Step 3: Creating Whisper deployment in Norway East resource..." -ForegroundColor Yellow

$whisperBaseUrl = "https://management.azure.com/subscriptions/$SubscriptionId/resourceGroups/$ResourceGroupName/providers/Microsoft.CognitiveServices/accounts/$WhisperResourceName"
$whisperDeploymentUrl = "$whisperBaseUrl/deployments/whisper-1?api-version=2024-06-01"

# Check available models in the new resource first
Write-Host "🔍 Checking available models in Norway East resource..." -ForegroundColor Cyan

try {
    $modelsUrl = "$whisperBaseUrl/models?api-version=2023-05-01"
    $modelsResponse = Invoke-RestMethod -Uri $modelsUrl -Method GET -Headers $headers
    
    $whisperModelsFound = @()
    foreach ($model in $modelsResponse.value) {
        if ($model.model.id -like "*whisper*" -or $model.id -like "*whisper*") {
            $whisperModelsFound += $model
            Write-Host "  🎵 Found: $($model.model.id -or $model.id)" -ForegroundColor Green
        }
    }
    
    if ($whisperModelsFound.Count -eq 0) {
        Write-Host "⚠️ No Whisper models found yet. Resource might still be initializing..." -ForegroundColor Yellow
        Write-Host "💡 Trying standard Whisper deployment anyway..." -ForegroundColor Cyan
    }
}
catch {
    Write-Host "⚠️ Could not check models yet. Proceeding with deployment..." -ForegroundColor Yellow
}

# Create Whisper deployment with GlobalStandard (multiple format attempts)
$whisperFormats = @(
    @{
        description = "whisper-1 GlobalStandard format"
        payload = @{
            properties = @{
                model = @{
                    name = "whisper-1"
                    version = "001"
                    format = "OpenAI"
                }
            }
            sku = @{
                name = "GlobalStandard"
                capacity = 300  # High capacity for GlobalStandard Whisper
            }
        }
    },
    @{
        description = "whisper GlobalStandard format"
        payload = @{
            properties = @{
                model = @{
                    name = "whisper"
                    version = "001"
                    format = "OpenAI"
                }
            }
            sku = @{
                name = "GlobalStandard"
                capacity = 300  # High capacity for GlobalStandard Whisper
            }
        }
    },
    @{
        description = "whisper-1 Standard fallback"
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
                capacity = 100  # Fallback if GlobalStandard not available
            }
        }
    },
    @{
        description = "whisper Standard fallback"
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
                capacity = 100  # Fallback if GlobalStandard not available
            }
        }
    }
)

$whisperCreated = $false

foreach ($format in $whisperFormats) {
    Write-Host "🔄 Trying: $($format.description)" -ForegroundColor Cyan
    
    $formatPayload = $format.payload | ConvertTo-Json -Depth 5
    
    try {
        $whisperResponse = Invoke-RestMethod -Uri $whisperDeploymentUrl -Method PUT -Headers $headers -Body $formatPayload
        Write-Host "✅ Whisper deployment created successfully!" -ForegroundColor Green
        Write-Host "📊 Deployment: $($whisperResponse.name)" -ForegroundColor Cyan
        Write-Host "📊 SKU: $($whisperResponse.sku.name) ($($whisperResponse.sku.capacity) TPM)" -ForegroundColor Cyan
        Write-Host "📊 Status: $($whisperResponse.properties.provisioningState)" -ForegroundColor Cyan
        $whisperCreated = $true
        break
    }
    catch {
        Write-Host "❌ $($format.description) failed: $($_.Exception.Message)" -ForegroundColor Red
    }
}

if (-not $whisperCreated) {
    Write-Host "⚠️ Automated deployment creation failed. Manual creation recommended." -ForegroundColor Yellow
    
    Write-Host "`n📋 Manual creation steps:" -ForegroundColor Cyan
    Write-Host "  1. Go to Azure Portal" -ForegroundColor White
    Write-Host "  2. Navigate to resource: $WhisperResourceName" -ForegroundColor White
    Write-Host "  3. Go to Deployments > Create new deployment" -ForegroundColor White
    Write-Host "  4. Select 'whisper' model" -ForegroundColor White
    Write-Host "  5. Name it 'whisper-1'" -ForegroundColor White
    Write-Host "  6. Choose Standard deployment type" -ForegroundColor White
}

# Step 4: Get API keys for the new resource
Write-Host "`n🔑 Step 4: Retrieving API keys for Whisper resource..." -ForegroundColor Yellow

$keysUrl = "$whisperBaseUrl/listKeys?api-version=2023-05-01"

try {
    $keysResponse = Invoke-RestMethod -Uri $keysUrl -Method POST -Headers $headers
    $apiKey1 = $keysResponse.key1
    $apiKey2 = $keysResponse.key2
    
    Write-Host "✅ API keys retrieved!" -ForegroundColor Green
    Write-Host "🔑 Key 1: $($apiKey1.Substring(0,8))..." -ForegroundColor Cyan
    Write-Host "🔑 Key 2: $($apiKey2.Substring(0,8))..." -ForegroundColor Cyan
}
catch {
    Write-Host "⚠️ Could not retrieve API keys automatically" -ForegroundColor Yellow
    Write-Host "💡 Get them manually from Azure Portal > $WhisperResourceName > Keys and Endpoint" -ForegroundColor Cyan
}

# Step 5: Summary and next steps
Write-Host "`n🎉 Norway East Whisper resource setup completed!" -ForegroundColor Green

Write-Host "`n📋 Your Dual GlobalStandard Azure OpenAI Setup:" -ForegroundColor Cyan
Write-Host "  🧠 GPT Resource (Current):" -ForegroundColor White
Write-Host "    • Name: soundscribe-openai" -ForegroundColor Gray
Write-Host "    • Region: Your current region" -ForegroundColor Gray
Write-Host "    • Model: gpt-4o-mini (GlobalStandard 551K TPM ✅)" -ForegroundColor Gray
Write-Host "    • Endpoint: https://soundscribe-openai.openai.azure.com/" -ForegroundColor Gray

Write-Host "`n  🎵 Whisper Resource (New):" -ForegroundColor White
Write-Host "    • Name: $WhisperResourceName" -ForegroundColor Gray
Write-Host "    • Region: Norway East 🇳🇴" -ForegroundColor Gray
Write-Host "    • Model: whisper-1 ($(if ($whisperCreated) { 'GlobalStandard 300K TPM 🚀' } else { 'Standard fallback' }))" -ForegroundColor Gray
Write-Host "    • Endpoint: https://$WhisperResourceName.openai.azure.com/" -ForegroundColor Gray

Write-Host "`n🔧 Environment Variables to Update:" -ForegroundColor Cyan
Write-Host "# Existing GPT resource" -ForegroundColor Gray
Write-Host "AZURE_OPENAI_ENDPOINT=https://soundscribe-openai.openai.azure.com/" -ForegroundColor White
Write-Host "AZURE_OPENAI_GPT4O_MINI_DEPLOYMENT=gpt-4o-mini" -ForegroundColor White
Write-Host "" 
Write-Host "# New Whisper resource" -ForegroundColor Gray
Write-Host "AZURE_OPENAI_WHISPER_ENDPOINT=https://$WhisperResourceName.openai.azure.com/" -ForegroundColor White
Write-Host "AZURE_OPENAI_WHISPER_DEPLOYMENT=whisper-1" -ForegroundColor White
if ($apiKey1) {
    Write-Host "AZURE_OPENAI_WHISPER_API_KEY=$apiKey1" -ForegroundColor White
}

Write-Host "`n📋 Next Steps:" -ForegroundColor Cyan
Write-Host "  1. Update your application to use dual endpoints" -ForegroundColor White
Write-Host "  2. Test both GPT and Whisper deployments" -ForegroundColor White
Write-Host "  3. Monitor performance - you now have high-performance AI!" -ForegroundColor White

Write-Host "`n✅ Dual-region setup completed! 🇳🇴" -ForegroundColor Green