# deploy-video-enabled.ps1
param(
    [Parameter(Mandatory=$false)]
    [string]$ResourceGroup = "soundscribe-rg",

    [Parameter(Mandatory=$false)]
    [string]$AppServiceName = "soundscribe-backend"
)

Write-Host "🎬 VIDEO-ENABLED BACKEND DEPLOYMENT" -ForegroundColor Green
Write-Host "Deploying video processing capabilities to Azure" -ForegroundColor White
Write-Host ""

# Step 1: Create deployment package
Write-Host "📦 Step 1: Creating deployment package..." -ForegroundColor Yellow

if (Test-Path "video-enabled-deployment.zip") {
    Remove-Item "video-enabled-deployment.zip" -Force
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

Compress-Archive -Path $filesToInclude -DestinationPath "video-enabled-deployment.zip" -Force

Write-Host "✅ Deployment package created: video-enabled-deployment.zip" -ForegroundColor Green

# Step 2: Deploy to Azure
Write-Host "🚀 Step 2: Deploying to Azure..." -ForegroundColor Yellow

try {
    $deployResult = az webapp deployment source config-zip --resource-group $ResourceGroup --name $AppServiceName --src video-enabled-deployment.zip

    if ($LASTEXITCODE -eq 0) {
        Write-Host "✅ Deployment successful!" -ForegroundColor Green
    } else {
        Write-Host "❌ Deployment failed!" -ForegroundColor Red
        exit 1
    }
} catch {
    Write-Host "❌ Deployment error: $($_.Exception.Message)" -ForegroundColor Red
    exit 1
}

# Step 3: Test deployment
Write-Host "🧪 Step 3: Testing deployment..." -ForegroundColor Yellow

Start-Sleep -Seconds 30

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

Write-Host ""
Write-Host "🎉 Video-enabled backend deployment completed!" -ForegroundColor Green
Write-Host "🔗 URL: https://$AppServiceName.azurewebsites.net" -ForegroundColor Cyan
Write-Host "📋 Health: https://$AppServiceName.azurewebsites.net/health" -ForegroundColor Cyan 