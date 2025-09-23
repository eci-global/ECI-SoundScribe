# Create Azure OpenAI Whisper Deployment - Fixed Version
# Based on research findings about correct Whisper model format

param(
    [Parameter(Mandatory=$false)]
    [string]$ResourceGroupName = "soundscribe-rg",
    
    [Parameter(Mandatory=$false)]
    [string]$AccountName = "soundscribe-openai",
    
    [Parameter(Mandatory=$false)]
    [string]$SubscriptionId = "f55203c5-2169-42af-8d67-1b93872aef84"
)

Write-Host "🎵 Creating Azure OpenAI Whisper deployment with correct format..." -ForegroundColor Green

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

# Step 1: Get available models to see correct Whisper format
Write-Host "`n🔍 Step 1: Checking available models..." -ForegroundColor Yellow

$modelsUrl = "$baseUrl/models?api-version=2023-05-01"

try {
    $modelsResponse = Invoke-RestMethod -Uri $modelsUrl -Method GET -Headers $headers
    
    Write-Host "📋 Available models:" -ForegroundColor Cyan
    $whisperModels = @()
    
    foreach ($model in $modelsResponse.value) {
        $modelId = $model.model.id
        $version = $model.model.version
        
        Write-Host "  • $modelId (v$version)" -ForegroundColor White
        
        if ($modelId -like "*whisper*") {
            $whisperModels += $model
            Write-Host "    🎵 Found Whisper model!" -ForegroundColor Green
        }
    }
    
    if ($whisperModels.Count -eq 0) {
        Write-Host "⚠️ No Whisper models found. Whisper may not be available in your region." -ForegroundColor Yellow
        Write-Host "💡 Available regions: East US 2, India South, North Central, Norway East, Sweden Central, Switzerland North, West Europe" -ForegroundColor Cyan
        exit 1
    }
    
    # Use the first available Whisper model
    $selectedWhisperModel = $whisperModels[0]
    $whisperModelName = $selectedWhisperModel.model.id
    $whisperModelVersion = $selectedWhisperModel.model.version
    
    Write-Host "✅ Selected model: $whisperModelName (v$whisperModelVersion)" -ForegroundColor Green
}
catch {
    Write-Host "❌ Failed to get models: $($_.Exception.Message)" -ForegroundColor Red
    
    # Fallback to standard Whisper format
    Write-Host "🔄 Using fallback Whisper model format..." -ForegroundColor Yellow
    $whisperModelName = "whisper-1"
    $whisperModelVersion = "001"
}

# Step 2: Create Whisper deployment with correct format
Write-Host "`n🎵 Step 2: Creating Whisper deployment..." -ForegroundColor Yellow

$whisperDeploymentUrl = "$baseUrl/deployments/whisper-1?api-version=2024-06-01"

# Try different Whisper model formats based on research
$whisperPayloads = @(
    # Format 1: Standard whisper-1 format
    @{
        properties = @{
            model = @{
                name = "whisper-1"
                version = "001"
                format = "OpenAI"
            }
        }
        sku = @{
            name = "Standard"
            capacity = 100
        }
    },
    
    # Format 2: Simple whisper format
    @{
        properties = @{
            model = @{
                name = "whisper"
                version = "1"
                format = "OpenAI"
            }
        }
        sku = @{
            name = "Standard"
            capacity = 100
        }
    },
    
    # Format 3: Discovered model format (if available)
    @{
        properties = @{
            model = @{
                name = $whisperModelName
                version = $whisperModelVersion
                format = "OpenAI"
            }
        }
        sku = @{
            name = "Standard"
            capacity = 100
        }
    }
)

$whisperCreated = $false

foreach ($i in 0..($whisperPayloads.Count - 1)) {
    $payload = $whisperPayloads[$i] | ConvertTo-Json -Depth 5
    $formatName = switch ($i) {
        0 { "whisper-1 format" }
        1 { "whisper format" } 
        2 { "discovered model format ($whisperModelName)" }
    }
    
    Write-Host "🔄 Trying format $($i + 1): $formatName" -ForegroundColor Cyan
    
    try {
        $whisperResponse = Invoke-RestMethod -Uri $whisperDeploymentUrl -Method PUT -Headers $headers -Body $payload
        Write-Host "✅ Whisper deployment created successfully with $formatName!" -ForegroundColor Green
        Write-Host "📊 Deployment: $($whisperResponse.name)" -ForegroundColor Cyan
        Write-Host "📊 SKU: $($whisperResponse.sku.name) ($($whisperResponse.sku.capacity) TPM)" -ForegroundColor Cyan
        Write-Host "📊 Status: $($whisperResponse.properties.provisioningState)" -ForegroundColor Cyan
        $whisperCreated = $true
        break
    }
    catch {
        Write-Host "❌ Format $($i + 1) failed: $($_.Exception.Message)" -ForegroundColor Red
        
        # Get detailed error for debugging
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

if (-not $whisperCreated) {
    Write-Host "❌ All Whisper deployment formats failed" -ForegroundColor Red
    Write-Host "`n💡 Common solutions:" -ForegroundColor Yellow
    Write-Host "  1. Whisper may not be available in your region" -ForegroundColor White
    Write-Host "  2. Try creating deployment manually in Azure Portal" -ForegroundColor White
    Write-Host "  3. Check if you have proper permissions" -ForegroundColor White
    Write-Host "  4. Request Whisper quota if needed" -ForegroundColor White
    
    Write-Host "`n📋 Manual creation steps:" -ForegroundColor Cyan
    Write-Host "  1. Go to Azure Portal > Azure OpenAI > Deployments" -ForegroundColor White
    Write-Host "  2. Click 'Create new deployment'" -ForegroundColor White
    Write-Host "  3. Select 'whisper' model" -ForegroundColor White
    Write-Host "  4. Name it 'whisper-1'" -ForegroundColor White
    Write-Host "  5. Choose Standard deployment type" -ForegroundColor White
}

# Step 3: Verify all deployments
Write-Host "`n✅ Step 3: Checking all deployments..." -ForegroundColor Yellow

$deploymentsUrl = "$baseUrl/deployments?api-version=2023-05-01"

try {
    $allDeploymentsResponse = Invoke-RestMethod -Uri $deploymentsUrl -Method GET -Headers $headers
    $allDeployments = $allDeploymentsResponse.value
    
    Write-Host "📋 Current deployments:" -ForegroundColor Green
    
    $gptFound = $false
    $whisperFound = $false
    
    foreach ($deployment in $allDeployments) {
        $skuName = $deployment.sku.name
        $capacity = $deployment.sku.capacity
        $modelName = $deployment.properties.model.name
        $status = $deployment.properties.provisioningState
        
        $icon = if ($skuName -eq "GlobalStandard") { "🚀" } else { "⚠️" }
        
        Write-Host "  $icon $($deployment.name) ($modelName):" -ForegroundColor White
        Write-Host "    SKU: $skuName ($capacity TPM)" -ForegroundColor Gray
        Write-Host "    Status: $status" -ForegroundColor Gray
        
        if ($modelName -like "*gpt*") { $gptFound = $true }
        if ($modelName -like "*whisper*") { $whisperFound = $true }
    }
    
    Write-Host "`n🎯 Deployment Status:" -ForegroundColor Cyan
    Write-Host "  • GPT deployment: $(if ($gptFound) { '✅ Found' } else { '❌ Missing' })" -ForegroundColor White
    Write-Host "  • Whisper deployment: $(if ($whisperFound) { '✅ Found' } else { '❌ Missing' })" -ForegroundColor White
    
    if ($gptFound -and $whisperFound) {
        Write-Host "`n🎉 SUCCESS! You now have both GPT and Whisper deployments!" -ForegroundColor Green
        Write-Host "🔧 Update your environment variables:" -ForegroundColor Cyan
        Write-Host "   AZURE_OPENAI_GPT4O_MINI_DEPLOYMENT=gpt-4o-mini" -ForegroundColor White
        Write-Host "   AZURE_OPENAI_WHISPER_DEPLOYMENT=whisper-1" -ForegroundColor White
        
        Write-Host "`n🧪 Test your deployments:" -ForegroundColor Cyan
        Write-Host "   .\test-azure-globalstandard.ps1" -ForegroundColor White
    }
}
catch {
    Write-Host "❌ Failed to verify deployments: $($_.Exception.Message)" -ForegroundColor Red
}

Write-Host "`n✅ Whisper deployment script completed!" -ForegroundColor Green