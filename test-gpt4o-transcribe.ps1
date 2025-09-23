# Test Azure OpenAI gpt-4o-transcribe Deployment
# This script tests the upgraded gpt-4o-transcribe deployment

param(
    [Parameter(Mandatory=$false)]
    [string]$ResourceGroupName = "soundscribe-rg",
    
    [Parameter(Mandatory=$false)]
    [string]$AccountName = "soundscribe-openai"
)

Write-Host "🧪 Testing Azure OpenAI gpt-4o-transcribe deployment..." -ForegroundColor Green

# Step 1: Check deployment status
Write-Host "`n📊 Step 1: Checking deployment status..." -ForegroundColor Yellow

try {
    $deployments = Get-AzCognitiveServicesAccountDeployment -ResourceGroupName $ResourceGroupName -AccountName $AccountName
    
    Write-Host "📋 Found deployments:" -ForegroundColor Cyan
    foreach ($deployment in $deployments) {
        $skuName = if ($deployment.Sku) { $deployment.Sku.Name } else { "Unknown" }
        $capacity = if ($deployment.Sku) { $deployment.Sku.Capacity } else { "Unknown" }
        $status = if ($skuName -eq "GlobalStandard") { "🚀" } else { "⚠️" }
        Write-Host "  $status $($deployment.Name): $skuName (Capacity: $capacity)" -ForegroundColor White
    }
    
    # Check for gpt-4o-transcribe deployment
    $transcribeDeployment = $deployments | Where-Object { $_.Name -eq "gpt-4o-transcribe" }
    if ($transcribeDeployment) {
        Write-Host "✅ gpt-4o-transcribe deployment found!" -ForegroundColor Green
    } else {
        Write-Host "❌ gpt-4o-transcribe deployment not found" -ForegroundColor Red
        Write-Host "💡 Run the upgrade script first: .\upgrade-azure-gpt4o-transcribe.ps1" -ForegroundColor Yellow
        exit 1
    }
} catch {
    Write-Host "❌ Failed to check deployments: $($_.Exception.Message)" -ForegroundColor Red
    exit 1
}

# Step 2: Test API connectivity
Write-Host "`n🔗 Step 2: Testing API connectivity..." -ForegroundColor Yellow

# Check if environment variables are set
$transcribeEndpoint = $env:AZURE_OPENAI_TRANSCRIBE_ENDPOINT
$transcribeApiKey = $env:AZURE_OPENAI_TRANSCRIBE_API_KEY
$transcribeDeployment = $env:AZURE_OPENAI_TRANSCRIBE_DEPLOYMENT

if (!$transcribeEndpoint -or !$transcribeApiKey) {
    Write-Host "⚠️ Environment variables not set. Please set:" -ForegroundColor Yellow
    Write-Host "   AZURE_OPENAI_TRANSCRIBE_ENDPOINT" -ForegroundColor White
    Write-Host "   AZURE_OPENAI_TRANSCRIBE_API_KEY" -ForegroundColor White
    Write-Host "   AZURE_OPENAI_TRANSCRIBE_DEPLOYMENT" -ForegroundColor White
    Write-Host "`n�� Example values:" -ForegroundColor Cyan
    Write-Host "   AZURE_OPENAI_TRANSCRIBE_ENDPOINT=https://$AccountName.openai.azure.com/" -ForegroundColor White
    Write-Host "   AZURE_OPENAI_TRANSCRIBE_DEPLOYMENT=gpt-4o-transcribe" -ForegroundColor White
    exit 1
}

Write-Host "✅ Environment variables configured:" -ForegroundColor Green
Write-Host "   Endpoint: $transcribeEndpoint" -ForegroundColor White
Write-Host "   Deployment: $transcribeDeployment" -ForegroundColor White
Write-Host "   API Key: $($transcribeApiKey.Substring(0,8))..." -ForegroundColor White

# Step 3: Test with curl (if available)
Write-Host "`n🌐 Step 3: Testing API endpoint..." -ForegroundColor Yellow

try {
    # Test the endpoint with a simple request
    $testUrl = "$transcribeEndpoint/openai/deployments/$transcribeDeployment/audio/transcriptions?api-versio 