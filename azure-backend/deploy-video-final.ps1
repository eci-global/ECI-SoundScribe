# deploy-video-final.ps1
param(
    [Parameter(Mandatory=$false)]
    [string]$ResourceGroup = "soundscribe-rg",

    [Parameter(Mandatory=$false)]
    [string]$AppServiceName = "soundscribe-backend"
)

Write-Host "🎬 FINAL VIDEO-ENABLED BACKEND DEPLOYMENT" -ForegroundColor Green
Write-Host "Completing video processing capabilities deployment" -ForegroundColor White
Write-Host ""

# Step 1: Set the startup command explicitly
Write-Host "⚙️ Step 1: Setting startup command to video-enabled server..." -ForegroundColor Yellow

try {
    $startupResult = az webapp config set `
        --name $AppServiceName `
        --resource-group $ResourceGroup `
        --startup-file "node server-with-video-support.js" `
        --output none

    if ($LASTEXITCODE -eq 0) {
        Write-Host "✅ Startup command set to: node server-with-video-support.js" -ForegroundColor Green
    } else {
        Write-Host "❌ Failed to set startup command!" -ForegroundColor Red
        exit 1
    }
} catch {
    Write-Host "❌ Startup command error: $($_.Exception.Message)" -ForegroundColor Red
    exit 1
}

# Step 2: Create deployment package
Write-Host "📦 Step 2: Creating deployment package..." -ForegroundColor Yellow

if (Test-Path "video-final-deployment.zip") {
    Remove-Item "video-final-deployment.zip" -Force
}

# Include all necessary files for video processing
$filesToInclude = @(
    "server-with-video-support.js",
    "processor.js",
    "package.json",
    "web.config",
    "supabase.js",
    "utils"
)

Compress-Archive -Path $filesToInclude -DestinationPath "video-final-deployment.zip" -Force

Write-Host "✅ Deployment package created: video-final-deployment.zip" -ForegroundColor Green

# Step 3: Deploy using modern deploy command
Write-Host "🚀 Step 3: Deploying to Azure with modern deploy command..." -ForegroundColor Yellow

try {
    $deployResult = az webapp deploy `
        --resource-group $ResourceGroup `
        --name $AppServiceName `
        --src-path video-final-deployment.zip `
        --type zip `
        --clean true `
        --restart true `
        --timeout 600

    if ($LASTEXITCODE -eq 0) {
        Write-Host "✅ Modern deployment successful!" -ForegroundColor Green
    } else {
        Write-Host "⚠️ Modern deploy failed, trying legacy method..." -ForegroundColor Yellow
        
        $legacyResult = az webapp deployment source config-zip `
            --resource-group $ResourceGroup `
            --name $AppServiceName `
            --src video-final-deployment.zip

        if ($LASTEXITCODE -eq 0) {
            Write-Host "✅ Legacy deployment successful!" -ForegroundColor Green
        } else {
            Write-Host "❌ Both deployment methods failed!" -ForegroundColor Red
            exit 1
        }
    }
} catch {
    Write-Host "❌ Deployment error: $($_.Exception.Message)" -ForegroundColor Red
    exit 1
}

# Step 4: Restart the app service to ensure new startup command takes effect
Write-Host "🔄 Step 4: Restarting App Service..." -ForegroundColor Yellow

try {
    az webapp restart --resource-group $ResourceGroup --name $AppServiceName
    Write-Host "✅ App Service restarted" -ForegroundColor Green
} catch {
    Write-Host "⚠️ Failed to restart app service: $($_.Exception.Message)" -ForegroundColor Yellow
}

# Step 5: Wait for startup
Write-Host "⏰ Step 5: Waiting 60 seconds for startup..." -ForegroundColor Yellow
Start-Sleep -Seconds 60

# Step 6: Test deployment
Write-Host "🧪 Step 6: Testing deployment..." -ForegroundColor Yellow

try {
    $healthCheck = Invoke-WebRequest -Uri "https://$AppServiceName.azurewebsites.net/health" -Method GET -TimeoutSec 15

    if ($healthCheck.StatusCode -eq 200) {
        $response = $healthCheck.Content | ConvertFrom-Json
        Write-Host "✅ Health check passed!" -ForegroundColor Green
        Write-Host "📊 Version: $($response.version)" -ForegroundColor Cyan
        Write-Host "🎬 Features: $($response.features -join ', ')" -ForegroundColor Cyan
    } else {
        Write-Host "❌ Health check failed: Status $($healthCheck.StatusCode)" -ForegroundColor Red
    }
} catch {
    Write-Host "❌ Health check error: $($_.Exception.Message)" -ForegroundColor Red
}

# Step 7: Test root endpoint
Write-Host "🌐 Step 7: Testing root endpoint..." -ForegroundColor Yellow

try {
    $rootCheck = Invoke-WebRequest -Uri "https://$AppServiceName.azurewebsites.net/" -Method GET -TimeoutSec 15

    if ($rootCheck.StatusCode -eq 200) {
        $rootResponse = $rootCheck.Content | ConvertFrom-Json
        Write-Host "✅ Root endpoint working!" -ForegroundColor Green
        Write-Host "📊 Message: $($rootResponse.message)" -ForegroundColor Cyan
        Write-Host "🎬 Features: $($rootResponse.features -join ', ')" -ForegroundColor Cyan
    } else {
        Write-Host "❌ Root endpoint failed: Status $($rootCheck.StatusCode)" -ForegroundColor Red
    }
} catch {
    Write-Host "❌ Root endpoint error: $($_.Exception.Message)" -ForegroundColor Red
}

Write-Host ""
Write-Host "🎉 VIDEO-ENABLED BACKEND DEPLOYMENT COMPLETED!" -ForegroundColor Green
Write-Host "📋 Summary:" -ForegroundColor Cyan
Write-Host "• Startup command set to: node server-with-video-support.js" -ForegroundColor White
Write-Host "• ES modules enabled with video processing" -ForegroundColor White
Write-Host "• FFmpeg dependencies included" -ForegroundColor White
Write-Host "• Video-to-audio extraction enabled" -ForegroundColor White
Write-Host "• Audio chunking and compression enabled" -ForegroundColor White

Write-Host ""
Write-Host "🔗 URLs:" -ForegroundColor Cyan
Write-Host "• Main: https://$AppServiceName.azurewebsites.net" -ForegroundColor White
Write-Host "• Health: https://$AppServiceName.azurewebsites.net/health" -ForegroundColor White
Write-Host "• Process: https://$AppServiceName.azurewebsites.net/api/process-audio" -ForegroundColor White

Write-Host ""
Write-Host "🎬 Video Processing Features:" -ForegroundColor Cyan
Write-Host "• Automatic audio extraction from video files (MP4, MOV, AVI)" -ForegroundColor White
Write-Host "• Audio compression and optimization" -ForegroundColor White
Write-Host "• Large file chunking for API limits" -ForegroundColor White
Write-Host "• Full transcription pipeline" -ForegroundColor White

Write-Host ""
Write-Host "🔍 Troubleshooting:" -ForegroundColor Cyan
Write-Host "• Logs: https://$AppServiceName.scm.azurewebsites.net/api/logs/docker" -ForegroundColor White
Write-Host "• Kudu: https://$AppServiceName.scm.azurewebsites.net" -ForegroundColor White
Write-Host "• Test with video file upload" -ForegroundColor White 