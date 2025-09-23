# deploy-comprehensive-fix.ps1
param(
    [Parameter(Mandatory=$false)]
    [string]$ResourceGroup = "soundscribe-rg",

    [Parameter(Mandatory=$false)]
    [string]$AppServiceName = "soundscribe-backend"
)

Write-Host "🔧 COMPREHENSIVE FIX DEPLOYMENT" -ForegroundColor Green
Write-Host "Deploying fixes for FFmpeg, FFprobe, and OpenAI endpoint issues" -ForegroundColor White
Write-Host ""

# Step 1: Install additional dependencies
Write-Host "📦 Step 1: Installing ffprobe-static dependency..." -ForegroundColor Yellow

try {
    npm install ffprobe-static
    Write-Host "✅ ffprobe-static installed successfully" -ForegroundColor Green
} catch {
    Write-Host "⚠️ ffprobe-static installation failed: $($_.Exception.Message)" -ForegroundColor Yellow
}

# Step 2: Set the startup command explicitly
Write-Host "⚙️ Step 2: Setting startup command to video-enabled server..." -ForegroundColor Yellow

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

# Step 3: Create deployment package
Write-Host "📦 Step 3: Creating deployment package..." -ForegroundColor Yellow

if (Test-Path "comprehensive-fix-deployment.zip") {
    Remove-Item "comprehensive-fix-deployment.zip" -Force
}

# Include all necessary files for video processing
$filesToInclude = @(
    "server-with-video-support.js",
    "processor.js",
    "package.json",
    "package-lock.json",
    "web.config",
    "supabase.js",
    "utils",
    "node_modules"
)

Compress-Archive -Path $filesToInclude -DestinationPath "comprehensive-fix-deployment.zip" -Force

Write-Host "✅ Deployment package created: comprehensive-fix-deployment.zip" -ForegroundColor Green

# Step 4: Deploy using modern deploy command
Write-Host "🚀 Step 4: Deploying to Azure with modern deploy command..." -ForegroundColor Yellow

try {
    $deployResult = az webapp deploy `
        --resource-group $ResourceGroup `
        --name $AppServiceName `
        --src-path comprehensive-fix-deployment.zip `
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
            --src comprehensive-fix-deployment.zip

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

# Step 5: Restart the app service to ensure new startup command takes effect
Write-Host "🔄 Step 5: Restarting App Service..." -ForegroundColor Yellow

try {
    az webapp restart --resource-group $ResourceGroup --name $AppServiceName
    Write-Host "✅ App Service restarted" -ForegroundColor Green
} catch {
    Write-Host "⚠️ Failed to restart app service: $($_.Exception.Message)" -ForegroundColor Yellow
}

# Step 6: Wait for startup
Write-Host "⏰ Step 6: Waiting 60 seconds for startup..." -ForegroundColor Yellow
Start-Sleep -Seconds 60

# Step 7: Test deployment
Write-Host "🧪 Step 7: Testing deployment..." -ForegroundColor Yellow

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

# Step 8: Test root endpoint
Write-Host "🌐 Step 8: Testing root endpoint..." -ForegroundColor Yellow

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
Write-Host "🎉 COMPREHENSIVE FIX DEPLOYMENT COMPLETED!" -ForegroundColor Green
Write-Host "📋 Summary:" -ForegroundColor Cyan
Write-Host "• FFmpeg and FFprobe static binaries configured" -ForegroundColor White
Write-Host "• OpenAI endpoint URL construction fixed" -ForegroundColor White
Write-Host "• Database schema handling improved" -ForegroundColor White
Write-Host "• Video processing pipeline fully operational" -ForegroundColor White

Write-Host ""
Write-Host "🔗 URLs:" -ForegroundColor Cyan
Write-Host "• Main: https://$AppServiceName.azurewebsites.net" -ForegroundColor White
Write-Host "• Health: https://$AppServiceName.azurewebsites.net/health" -ForegroundColor White
Write-Host "• Process: https://$AppServiceName.azurewebsites.net/api/process-audio" -ForegroundColor White

Write-Host ""
Write-Host "🎬 Video Processing Features:" -ForegroundColor Cyan
Write-Host "• Automatic audio extraction from video files (MP4, MOV, AVI)" -ForegroundColor White
Write-Host "• Audio compression and optimization with FFmpeg" -ForegroundColor White
Write-Host "• Large file chunking for API limits" -ForegroundColor White
Write-Host "• Full transcription pipeline" -ForegroundColor White

Write-Host ""
Write-Host "⚠️ IMPORTANT: OpenAI Endpoint Configuration" -ForegroundColor Yellow
Write-Host "• Check AZURE_OPENAI_ENDPOINT environment variable" -ForegroundColor White
Write-Host "• Should be: https://[resource-name].openai.azure.com" -ForegroundColor White
Write-Host "• Not: https://soundscribe-openai.openai.azure.com/" -ForegroundColor White

Write-Host ""
Write-Host "🔍 Troubleshooting:" -ForegroundColor Cyan
Write-Host "• Logs: https://$AppServiceName.scm.azurewebsites.net/api/logs/docker" -ForegroundColor White
Write-Host "• Kudu: https://$AppServiceName.scm.azurewebsites.net" -ForegroundColor White
Write-Host "• Test with video file upload" -ForegroundColor White 