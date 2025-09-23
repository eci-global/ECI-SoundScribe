# Check Your Existing Whisper Setup
# This script checks if you already have a working Whisper deployment

Write-Host "🔍 Checking your existing Whisper configuration..." -ForegroundColor Green

# Check environment variables
Write-Host "`n📋 Environment Variables Check:" -ForegroundColor Yellow

$mainEndpoint = $env:AZURE_OPENAI_ENDPOINT
$mainApiKey = $env:AZURE_OPENAI_API_KEY
$whisperEndpoint = $env:AZURE_OPENAI_WHISPER_ENDPOINT
$whisperApiKey = $env:AZURE_OPENAI_WHISPER_API_KEY
$whisperDeployment = $env:AZURE_OPENAI_WHISPER_DEPLOYMENT

Write-Host "🧠 Main Azure OpenAI:" -ForegroundColor Cyan
Write-Host "   AZURE_OPENAI_ENDPOINT: $(if ($mainEndpoint) { $mainEndpoint } else { '❌ NOT SET' })" -ForegroundColor White
Write-Host "   AZURE_OPENAI_API_KEY: $(if ($mainApiKey) { '✅ SET (' + $mainApiKey.Substring(0,8) + '...)' } else { '❌ NOT SET' })" -ForegroundColor White

Write-Host "`n🎵 Whisper Configuration:" -ForegroundColor Cyan
Write-Host "   AZURE_OPENAI_WHISPER_ENDPOINT: $(if ($whisperEndpoint) { '✅ ' + $whisperEndpoint } else { '⚠️ Not set (will use main endpoint)' })" -ForegroundColor White
Write-Host "   AZURE_OPENAI_WHISPER_API_KEY: $(if ($whisperApiKey) { '✅ SET (' + $whisperApiKey.Substring(0,8) + '...)' } else { '⚠️ Not set (will use main API key)' })" -ForegroundColor White
Write-Host "   AZURE_OPENAI_WHISPER_DEPLOYMENT: $(if ($whisperDeployment) { '✅ ' + $whisperDeployment } else { '⚠️ Not set (will use whisper-1)' })" -ForegroundColor White

# Determine active Whisper endpoint and key
$activeWhisperEndpoint = if ($whisperEndpoint) { $whisperEndpoint } else { $mainEndpoint }
$activeWhisperApiKey = if ($whisperApiKey) { $whisperApiKey } else { $mainApiKey }
$activeWhisperDeployment = if ($whisperDeployment) { $whisperDeployment } else { "whisper-1" }

Write-Host "`n🎯 Active Whisper Configuration:" -ForegroundColor Green
Write-Host "   Endpoint: $activeWhisperEndpoint" -ForegroundColor White
Write-Host "   Deployment: $activeWhisperDeployment" -ForegroundColor White
Write-Host "   API Key: $(if ($activeWhisperApiKey) { 'Available (' + $activeWhisperApiKey.Substring(0,8) + '...)' } else { 'Missing' })" -ForegroundColor White

# Test Whisper endpoint if we have the necessary info
if ($activeWhisperEndpoint -and $activeWhisperApiKey) {
    Write-Host "`n🧪 Testing Whisper endpoint accessibility..." -ForegroundColor Yellow
    
    $whisperTestUrl = "$activeWhisperEndpoint/openai/deployments/$activeWhisperDeployment/audio/transcriptions?api-version=2024-02-01"
    
    $headers = @{
        'api-key' = $activeWhisperApiKey
    }
    
    try {
        # Test endpoint accessibility (will return 400/405 without audio file, but that's expected)
        $response = Invoke-WebRequest -Uri $whisperTestUrl -Method Get -Headers $headers -ErrorAction SilentlyContinue
        Write-Host "✅ Whisper endpoint is accessible" -ForegroundColor Green
    }
    catch {
        $statusCode = $_.Exception.Response.StatusCode.value__
        
        if ($statusCode -eq 405 -or $statusCode -eq 400) {
            Write-Host "✅ Whisper endpoint is active (405/400 expected without audio)" -ForegroundColor Green
            Write-Host "   Status: $statusCode - This is normal for GET request to transcription endpoint" -ForegroundColor Gray
        } elseif ($statusCode -eq 404) {
            Write-Host "❌ Whisper deployment not found" -ForegroundColor Red
            Write-Host "   This suggests the deployment '$activeWhisperDeployment' doesn't exist" -ForegroundColor Gray
        } elseif ($statusCode -eq 401) {
            Write-Host "❌ Authentication failed" -ForegroundColor Red
            Write-Host "   Check your API key configuration" -ForegroundColor Gray
        } else {
            Write-Host "⚠️ Unexpected response: $statusCode" -ForegroundColor Yellow
            Write-Host "   Error: $($_.Exception.Message)" -ForegroundColor Gray
        }
    }
} else {
    Write-Host "⚠️ Cannot test endpoint - missing configuration" -ForegroundColor Yellow
}

# Analysis and recommendations
Write-Host "`n📊 Configuration Analysis:" -ForegroundColor Green

if ($whisperEndpoint -and $whisperApiKey) {
    Write-Host "🎉 You have a DUAL-ENDPOINT setup configured!" -ForegroundColor Green
    Write-Host "   • Separate Whisper resource: $whisperEndpoint" -ForegroundColor White
    Write-Host "   • Main GPT resource: $mainEndpoint" -ForegroundColor White
    
    if ($whisperEndpoint -ne $mainEndpoint) {
        Write-Host "✅ PERFECT: You're using separate Azure regions/resources for optimal performance!" -ForegroundColor Green
    } else {
        Write-Host "ℹ️ You're using the same endpoint for both GPT and Whisper" -ForegroundColor Cyan
    }
} else {
    Write-Host "🤔 You're using a SINGLE-ENDPOINT setup:" -ForegroundColor Yellow
    Write-Host "   • Both GPT and Whisper use: $mainEndpoint" -ForegroundColor White
    Write-Host "   • This works but may have limitations if Whisper isn't available in your region" -ForegroundColor White
}

# Test current setup status
Write-Host "`n🎯 Next Steps Based on Your Setup:" -ForegroundColor Cyan

if ($whisperEndpoint -and $whisperEndpoint -ne $mainEndpoint) {
    Write-Host "✅ Your backend is already configured for dual-region setup!" -ForegroundColor Green
    Write-Host "   Recommendation: Test your existing setup before creating new resources" -ForegroundColor White
    Write-Host "   Command: Upload an audio file and check if transcription works" -ForegroundColor Gray
} else {
    Write-Host "💡 You could benefit from our North Central US Whisper resource:" -ForegroundColor Yellow
    Write-Host "   1. Your current setup uses one endpoint for both GPT and Whisper" -ForegroundColor White
    Write-Host "   2. Adding a dedicated Whisper resource could improve reliability" -ForegroundColor White
    Write-Host "   3. Run: .\create-whisper-northcentral.ps1" -ForegroundColor Gray
}

Write-Host "`n🔧 How to Test Your Current Setup:" -ForegroundColor Cyan
Write-Host "1. Upload an audio file to your SoundScribe app" -ForegroundColor White
Write-Host "2. Check if transcription completes successfully" -ForegroundColor White
Write-Host "3. Look for any 429 rate limiting errors in logs" -ForegroundColor White
Write-Host "4. If it works well, you might not need changes!" -ForegroundColor White

Write-Host "`n✅ Analysis completed!" -ForegroundColor Green