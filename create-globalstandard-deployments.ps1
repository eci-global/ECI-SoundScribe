# Create Azure OpenAI Deployments with GlobalStandard SKU
# This script creates deployments directly with GlobalStandard tier

param(
    [Parameter(Mandatory=$false)]
    [string]$ResourceGroupName = "soundscribe-rg",
    
    [Parameter(Mandatory=$false)]
    [string]$AccountName = "soundscribe-openai",
    
    [Parameter(Mandatory=$false)]
    [string]$SubscriptionId = "f55203c5-2169-42af-8d67-1b93872aef84"
)

Write-Host "🚀 Creating Azure OpenAI deployments with GlobalStandard SKU..." -ForegroundColor Green

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

# Step 1: Create GPT-4o-mini GlobalStandard deployment
Write-Host "`n🧠 Step 1: Creating GPT-4o-mini with GlobalStandard (551K TPM)..." -ForegroundColor Yellow

$gptDeploymentUrl = "$baseUrl/deployments/gpt-4o-mini?api-version=2023-05-01"

# Updated payload with correct structure
$gptPayload = @{
    properties = @{
        model = @{
            name = "gpt-4o-mini"
            version = "2024-07-18"
            format = "OpenAI"
        }
    }
    sku = @{
        name = "GlobalStandard"
        capacity = 551  # 551,000 TPM
    }
} | ConvertTo-Json -Depth 5

Write-Host "🔄 Creating gpt-4o-mini deployment..." -ForegroundColor Cyan
Write-Host "📋 Request URL: $gptDeploymentUrl" -ForegroundColor Gray

try {
    $gptResponse = Invoke-RestMethod -Uri $gptDeploymentUrl -Method PUT -Headers $headers -Body $gptPayload
    Write-Host "✅ GPT-4o-mini GlobalStandard deployment created successfully!" -ForegroundColor Green
    Write-Host "📊 Deployment: $($gptResponse.name)" -ForegroundColor Cyan
    Write-Host "📊 SKU: $($gptResponse.sku.name) ($($gptResponse.sku.capacity) TPM)" -ForegroundColor Cyan
    Write-Host "📊 Status: $($gptResponse.properties.provisioningState)" -ForegroundColor Cyan
}
catch {
    Write-Host "❌ Failed to create GPT-4o-mini deployment" -ForegroundColor Red
    Write-Host "   Error: $($_.Exception.Message)" -ForegroundColor Red
    
    # Try to get detailed error info
    if ($_.Exception.Response) {
        try {
            $errorStream = $_.Exception.Response.GetResponseStream()
            $reader = New-Object System.IO.StreamReader($errorStream)
            $errorBody = $reader.ReadToEnd()
            $reader.Close()
            
            Write-Host "   Detailed error: $errorBody" -ForegroundColor Red
            
            # Parse common error scenarios
            if ($errorBody -like "*quota*" -or $errorBody -like "*capacity*") {
                Write-Host "💡 Solution: Request quota increase in Azure Portal" -ForegroundColor Yellow
                Write-Host "   Go to: Azure Portal > Azure OpenAI > Quotas > Request Increase" -ForegroundColor White
                Write-Host "   Request: 551,000 TPM for gpt-4o-mini GlobalStandard" -ForegroundColor White
            }
            elseif ($errorBody -like "*region*" -or $errorBody -like "*location*") {
                Write-Host "💡 GlobalStandard may not be available in your region" -ForegroundColor Yellow
                Write-Host "   Try creating Standard deployment with high capacity instead" -ForegroundColor White
            }
        }
        catch {
            Write-Host "   Status: $($_.Exception.Response.StatusCode)" -ForegroundColor Red
        }
    }
    
    # Try fallback to Standard with high capacity
    Write-Host "`n🔄 Trying fallback: Standard deployment with maximum capacity..." -ForegroundColor Yellow
    
    $gptFallbackPayload = @{
        properties = @{
            model = @{
                name = "gpt-4o-mini"
                version = "2024-07-18"
                format = "OpenAI"
            }
        }
        sku = @{
            name = "Standard"
            capacity = 100  # High Standard capacity
        }
    } | ConvertTo-Json -Depth 5
    
    try {
        $gptFallbackResponse = Invoke-RestMethod -Uri $gptDeploymentUrl -Method PUT -Headers $headers -Body $gptFallbackPayload
        Write-Host "✅ GPT-4o-mini Standard deployment created as fallback!" -ForegroundColor Green
        Write-Host "📊 SKU: $($gptFallbackResponse.sku.name) ($($gptFallbackResponse.sku.capacity) TPM)" -ForegroundColor Cyan
    }
    catch {
        Write-Host "❌ Fallback also failed: $($_.Exception.Message)" -ForegroundColor Red
    }
}

# Step 2: Create Whisper deployment
Write-Host "`n🎵 Step 2: Creating Whisper deployment..." -ForegroundColor Yellow

$whisperDeploymentUrl = "$baseUrl/deployments/whisper-1?api-version=2023-05-01"

# Try GlobalStandard first, then fallback to Standard
$whisperPayload = @{
    properties = @{
        model = @{
            name = "whisper"
            version = "001"
            format = "OpenAI"
        }
    }
    sku = @{
        name = "GlobalStandard"
        capacity = 300
    }
} | ConvertTo-Json -Depth 5

Write-Host "🔄 Creating whisper-1 deployment with GlobalStandard..." -ForegroundColor Cyan

try {
    $whisperResponse = Invoke-RestMethod -Uri $whisperDeploymentUrl -Method PUT -Headers $headers -Body $whisperPayload
    Write-Host "✅ Whisper GlobalStandard deployment created successfully!" -ForegroundColor Green
    Write-Host "📊 SKU: $($whisperResponse.sku.name) ($($whisperResponse.sku.capacity) TPM)" -ForegroundColor Cyan
}
catch {
    Write-Host "⚠️ GlobalStandard failed for Whisper: $($_.Exception.Message)" -ForegroundColor Yellow
    Write-Host "🔄 Trying Standard deployment with high capacity..." -ForegroundColor Yellow
    
    # Fallback to Standard
    $whisperStandardPayload = @{
        properties = @{
            model = @{
                name = "whisper"
                version = "001"
                format = "OpenAI"
            }
        }
        sku = @{
            name = "Standard"
            capacity = 100  # High capacity
        }
    } | ConvertTo-Json -Depth 5
    
    try {
        $whisperStandardResponse = Invoke-RestMethod -Uri $whisperDeploymentUrl -Method PUT -Headers $headers -Body $whisperStandardPayload
        Write-Host "✅ Whisper Standard deployment created!" -ForegroundColor Green
        Write-Host "📊 SKU: $($whisperStandardResponse.sku.name) ($($whisperStandardResponse.sku.capacity) TPM)" -ForegroundColor Cyan
    }
    catch {
        Write-Host "❌ Both GlobalStandard and Standard failed for Whisper" -ForegroundColor Red
        Write-Host "   Error: $($_.Exception.Message)" -ForegroundColor Red
        Write-Host "💡 You may need to create Whisper deployment manually in Azure Portal" -ForegroundColor Yellow
    }
}

# Step 3: Verify deployments
Write-Host "`n✅ Step 3: Verifying created deployments..." -ForegroundColor Yellow

$deploymentsUrl = "$baseUrl/deployments?api-version=2023-05-01"

try {
    Start-Sleep -Seconds 10  # Give Azure time to process
    
    $verifyResponse = Invoke-RestMethod -Uri $deploymentsUrl -Method GET -Headers $headers
    $createdDeployments = $verifyResponse.value
    
    if ($createdDeployments -and $createdDeployments.Count -gt 0) {
        Write-Host "📋 Successfully created $($createdDeployments.Count) deployment(s):" -ForegroundColor Green
        
        $globalStandardCount = 0
        
        foreach ($deployment in $createdDeployments) {
            $skuName = $deployment.sku.name
            $capacity = $deployment.sku.capacity
            $modelName = $deployment.properties.model.name
            $status = $deployment.properties.provisioningState
            
            if ($skuName -eq "GlobalStandard") { 
                $globalStandardCount++
                $icon = "🚀"
            } else { 
                $icon = "⚠️" 
            }
            
            Write-Host "  $icon $($deployment.name) ($modelName):" -ForegroundColor White
            Write-Host "    SKU: $skuName ($capacity TPM)" -ForegroundColor Gray
            Write-Host "    Status: $status" -ForegroundColor Gray
        }
        
        # Success summary
        Write-Host ""
        if ($globalStandardCount -gt 0) {
            Write-Host "🎉 SUCCESS! $globalStandardCount GlobalStandard deployment(s) created!" -ForegroundColor Green
            Write-Host "🎯 You now have high-performance Azure OpenAI deployments!" -ForegroundColor Green
            
            Write-Host "`n🔧 Update your environment variables:" -ForegroundColor Cyan
            Write-Host "   AZURE_OPENAI_GPT4O_MINI_DEPLOYMENT=gpt-4o-mini" -ForegroundColor White
            Write-Host "   AZURE_OPENAI_WHISPER_DEPLOYMENT=whisper-1" -ForegroundColor White
            
            Write-Host "`n🧪 Test your deployments:" -ForegroundColor Cyan
            Write-Host "   .\test-azure-globalstandard.ps1" -ForegroundColor White
            
        } else {
            Write-Host "⚠️ No GlobalStandard deployments created" -ForegroundColor Yellow
            Write-Host "💡 Standard deployments created - these should still work well" -ForegroundColor Yellow
            Write-Host "💡 Request quota increases to upgrade to GlobalStandard later" -ForegroundColor Yellow
        }
        
    } else {
        Write-Host "❌ No deployments found after creation attempts" -ForegroundColor Red
        Write-Host "💡 Check Azure Portal manually for deployment status" -ForegroundColor Yellow
    }
}
catch {
    Write-Host "❌ Failed to verify deployments: $($_.Exception.Message)" -ForegroundColor Red
}

# Step 4: Next steps
Write-Host "`n📋 Next Steps:" -ForegroundColor Cyan
Write-Host "  1. Wait 5-10 minutes for deployments to fully provision" -ForegroundColor White
Write-Host "  2. Test API endpoints to verify functionality" -ForegroundColor White
Write-Host "  3. Update your application's environment variables" -ForegroundColor White
Write-Host "  4. If Standard deployments: Request quota increase for GlobalStandard" -ForegroundColor White

Write-Host "`n✅ Deployment creation completed!" -ForegroundColor Green