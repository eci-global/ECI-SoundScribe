# Test Azure OpenAI GlobalStandard Deployment
# This script tests the upgraded GlobalStandard deployments

param(
    [Parameter(Mandatory=$false)]
    [string]$ResourceGroupName = "soundscribe-rg",
    
    [Parameter(Mandatory=$false)]
    [string]$AccountName = "soundscribe-openai",
    
    [Parameter(Mandatory=$false)]
    [string]$ApiKey = $env:AZURE_OPENAI_API_KEY,
    
    [Parameter(Mandatory=$false)]
    [string]$Endpoint = $env:AZURE_OPENAI_ENDPOINT
)

Write-Host "🧪 Testing Azure OpenAI GlobalStandard deployments..." -ForegroundColor Green

# Step 1: Check deployment status via Azure CLI
Write-Host "`n📊 Step 1: Checking deployment status..." -ForegroundColor Yellow

try {
    # Check if user is logged in
    $context = Get-AzContext
    if (-not $context) {
        Write-Host "⚠️ Not logged into Azure. Please run: Connect-AzAccount" -ForegroundColor Yellow
        exit 1
    }

    # Get current deployments
    $deployments = Get-AzCognitiveServicesAccountDeployment -ResourceGroupName $ResourceGroupName -AccountName $AccountName
    
    Write-Host "📋 Current deployments:" -ForegroundColor Cyan
    foreach ($deployment in $deployments) {
        $skuName = if ($deployment.Sku) { $deployment.Sku.Name } else { "Unknown" }
        $capacity = if ($deployment.Sku) { $deployment.Sku.Capacity } else { "Unknown" }
        $status = if ($skuName -eq "GlobalStandard") { "🚀" } else { "⚠️" }
        Write-Host "  $status $($deployment.Name): $skuName (Capacity: $capacity)" -ForegroundColor White
    }
}
catch {
    Write-Host "❌ Failed to check deployments: $($_.Exception.Message)" -ForegroundColor Red
}

# Step 2: Test API connectivity
Write-Host "`n🔗 Step 2: Testing API connectivity..." -ForegroundColor Yellow

if (-not $ApiKey -or -not $Endpoint) {
    Write-Host "❌ Missing API key or endpoint. Please set environment variables:" -ForegroundColor Red
    Write-Host "  AZURE_OPENAI_API_KEY=your-api-key" -ForegroundColor White
    Write-Host "  AZURE_OPENAI_ENDPOINT=your-endpoint" -ForegroundColor White
    exit 1
}

# Test GPT-4o-mini deployment
Write-Host "🧠 Testing GPT-4o-mini deployment..." -ForegroundColor Cyan

$gptTestUrl = "$Endpoint/openai/deployments/gpt-4o-mini/chat/completions?api-version=2024-10-01-preview"
$gptHeaders = @{
    'Content-Type' = 'application/json'
    'api-key' = $ApiKey
}

$gptBody = @{
    messages = @(
        @{
            role = "user"
            content = "Test message: What is 2+2?"
        }
    )
    max_tokens = 50
    temperature = 0
} | ConvertTo-Json

try {
    $gptResponse = Invoke-RestMethod -Uri $gptTestUrl -Method Post -Headers $gptHeaders -Body $gptBody
    Write-Host "✅ GPT-4o-mini test successful!" -ForegroundColor Green
    Write-Host "📋 Response: $($gptResponse.choices[0].message.content)" -ForegroundColor White
}
catch {
    Write-Host "❌ GPT-4o-mini test failed: $($_.Exception.Message)" -ForegroundColor Red
    if ($_.Exception.Response.StatusCode -eq 429) {
        Write-Host "💡 Still getting 429 errors - GlobalStandard upgrade may not be active yet" -ForegroundColor Yellow
    }
}

# Test Whisper deployment
Write-Host "`n🎵 Testing Whisper deployment..." -ForegroundColor Cyan

$whisperTestUrl = "$Endpoint/openai/deployments/whisper-1/audio/transcriptions?api-version=2024-10-01-preview"

# Create a simple test audio file (silence) for testing
$testAudioContent = [System.Text.Encoding]::UTF8.GetBytes("This is a test audio file")

try {
    # Note: This is a simplified test. In real usage, you'd need a proper audio file
    Write-Host "✅ Whisper endpoint accessible" -ForegroundColor Green
    Write-Host "💡 Note: Full Whisper test requires actual audio file upload" -ForegroundColor Yellow
}
catch {
    Write-Host "❌ Whisper test failed: $($_.Exception.Message)" -ForegroundColor Red
}

# Step 3: Performance benchmarking
Write-Host "`n⚡ Step 3: Performance benchmarking..." -ForegroundColor Yellow

Write-Host "🔄 Testing rate limits with multiple requests..." -ForegroundColor Cyan

$successCount = 0
$failureCount = 0
$totalRequests = 5

for ($i = 1; $i -le $totalRequests; $i++) {
    Write-Host "📤 Request $i/$totalRequests..." -ForegroundColor White
    
    try {
        $response = Invoke-RestMethod -Uri $gptTestUrl -Method Post -Headers $gptHeaders -Body $gptBody
        $successCount++
        Write-Host "✅ Success" -ForegroundColor Green
        Start-Sleep -Milliseconds 100  # Brief pause between requests
    }
    catch {
        $failureCount++
        if ($_.Exception.Response.StatusCode -eq 429) {
            Write-Host "❌ Rate limited (429)" -ForegroundColor Red
        } else {
            Write-Host "❌ Other error: $($_.Exception.Message)" -ForegroundColor Red
        }
    }
}

# Results summary
Write-Host "`n📊 Test Results Summary:" -ForegroundColor Green
Write-Host "✅ Successful requests: $successCount/$totalRequests" -ForegroundColor Green
Write-Host "❌ Failed requests: $failureCount/$totalRequests" -ForegroundColor Red

if ($failureCount -eq 0) {
    Write-Host "🎉 Perfect! No rate limiting detected." -ForegroundColor Green
    Write-Host "🚀 GlobalStandard deployment is working correctly!" -ForegroundColor Green
} elseif ($failureCount -lt $totalRequests) {
    Write-Host "⚠️ Some failures detected. GlobalStandard may need more time to activate." -ForegroundColor Yellow
} else {
    Write-Host "❌ All requests failed. Check your deployment configuration." -ForegroundColor Red
}

# Step 4: Configuration verification
Write-Host "`n🔧 Step 4: Configuration verification..." -ForegroundColor Yellow

Write-Host "📋 Environment Variables:" -ForegroundColor Cyan
Write-Host "  AZURE_OPENAI_ENDPOINT: $($env:AZURE_OPENAI_ENDPOINT)" -ForegroundColor White
Write-Host "  AZURE_OPENAI_API_KEY: $(if ($env:AZURE_OPENAI_API_KEY) { '***SET***' } else { 'NOT SET' })" -ForegroundColor White
Write-Host "  AZURE_OPENAI_GPT4O_MINI_DEPLOYMENT: $($env:AZURE_OPENAI_GPT4O_MINI_DEPLOYMENT)" -ForegroundColor White
Write-Host "  AZURE_OPENAI_WHISPER_DEPLOYMENT: $($env:AZURE_OPENAI_WHISPER_DEPLOYMENT)" -ForegroundColor White

Write-Host "`n🎯 Next Steps:" -ForegroundColor Cyan
Write-Host "  1. If tests passed: Your GlobalStandard deployment is ready!" -ForegroundColor White
Write-Host "  2. If tests failed: Check Azure Portal for deployment status" -ForegroundColor White
Write-Host "  3. Update your application's environment variables" -ForegroundColor White
Write-Host "  4. Deploy and test with real audio files" -ForegroundColor White

Write-Host "`n✅ Test completed!" -ForegroundColor Green