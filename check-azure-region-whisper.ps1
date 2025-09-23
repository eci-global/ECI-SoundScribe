# Check Azure OpenAI Resource Region and Whisper Availability
# This script checks your current region and provides solutions for Whisper

param(
    [Parameter(Mandatory=$false)]
    [string]$ResourceGroupName = "soundscribe-rg",
    
    [Parameter(Mandatory=$false)]
    [string]$AccountName = "soundscribe-openai",
    
    [Parameter(Mandatory=$false)]
    [string]$SubscriptionId = "f55203c5-2169-42af-8d67-1b93872aef84"
)

Write-Host "🌍 Checking Azure OpenAI resource region and Whisper availability..." -ForegroundColor Green

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

# Check resource details
Write-Host "`n🔍 Step 1: Checking your Azure OpenAI resource..." -ForegroundColor Yellow

$resourceUrl = "https://management.azure.com/subscriptions/$SubscriptionId/resourceGroups/$ResourceGroupName/providers/Microsoft.CognitiveServices/accounts/$AccountName" + "?api-version=2023-05-01"

$headers = @{
    "Authorization" = "Bearer $accessToken"
    "Content-Type" = "application/json"
}

try {
    $resourceResponse = Invoke-RestMethod -Uri $resourceUrl -Method GET -Headers $headers
    
    $currentRegion = $resourceResponse.location
    $resourceName = $resourceResponse.name
    $kind = $resourceResponse.kind
    
    Write-Host "📋 Resource Details:" -ForegroundColor Cyan
    Write-Host "  • Name: $resourceName" -ForegroundColor White
    Write-Host "  • Region: $currentRegion" -ForegroundColor White  
    Write-Host "  • Type: $kind" -ForegroundColor White
    
    # Whisper-supported regions (as of 2024)
    $whisperRegions = @(
        "eastus2",
        "southindia", 
        "northcentralus",
        "norwayeast",
        "swedencentral",
        "switzerlandnorth",
        "westeurope"
    )
    
    $regionDisplayNames = @{
        "eastus2" = "East US 2"
        "southindia" = "India South"  
        "northcentralus" = "North Central US"
        "norwayeast" = "Norway East"
        "swedencentral" = "Sweden Central"
        "switzerlandnorth" = "Switzerland North"
        "westeurope" = "West Europe"
    }
    
    Write-Host "`n🎵 Whisper Availability Analysis:" -ForegroundColor Yellow
    
    if ($whisperRegions -contains $currentRegion.ToLower()) {
        Write-Host "✅ Your region ($currentRegion) SUPPORTS Whisper!" -ForegroundColor Green
        Write-Host "💡 The issue might be something else. Let's investigate further..." -ForegroundColor Yellow
        
        # Check quota/permissions
        Write-Host "`n🔍 Checking for other possible issues..." -ForegroundColor Cyan
        Write-Host "  • Check if Whisper quota is available" -ForegroundColor White
        Write-Host "  • Verify model catalog access" -ForegroundColor White
        Write-Host "  • Check subscription permissions" -ForegroundColor White
        
    } else {
        Write-Host "❌ Your region ($currentRegion) does NOT support Whisper" -ForegroundColor Red
        Write-Host "`n💡 Solutions:" -ForegroundColor Yellow
        
        Write-Host "`n🌍 Option 1: Create new Azure OpenAI resource in Whisper-supported region" -ForegroundColor Cyan
        Write-Host "   Recommended regions for Whisper:" -ForegroundColor White
        foreach ($region in $whisperRegions) {
            $displayName = if ($regionDisplayNames[$region]) { $regionDisplayNames[$region] } else { $region }
            Write-Host "     • $displayName ($region)" -ForegroundColor White
        }
        
        Write-Host "`n🔄 Option 2: Use external Whisper service" -ForegroundColor Cyan
        Write-Host "   • OpenAI Whisper API directly" -ForegroundColor White
        Write-Host "   • Azure Speech Service (different from OpenAI Whisper)" -ForegroundColor White  
        Write-Host "   • Local Whisper implementation" -ForegroundColor White
        
        Write-Host "`n📋 Recommended approach:" -ForegroundColor Green
        Write-Host "  1. Keep your current resource for GPT-4o-mini (already working!)" -ForegroundColor White
        Write-Host "  2. Create a second Azure OpenAI resource in East US 2 for Whisper" -ForegroundColor White
        Write-Host "  3. Use both resources in your application" -ForegroundColor White
    }
    
}
catch {
    Write-Host "❌ Failed to get resource details: $($_.Exception.Message)" -ForegroundColor Red
    
    # Fallback: Use Azure CLI to get region info
    Write-Host "`n🔄 Trying alternative method..." -ForegroundColor Yellow
    
    try {
        $azResourceInfo = az cognitiveservices account show --name $AccountName --resource-group $ResourceGroupName --query "{location:location, name:name}" -o json | ConvertFrom-Json
        
        if ($azResourceInfo) {
            $currentRegion = $azResourceInfo.location
            Write-Host "📋 Found resource location: $currentRegion" -ForegroundColor Cyan
            
            $whisperRegions = @("eastus2", "southindia", "northcentralus", "norwayeast", "swedencentral", "switzerlandnorth", "westeurope")
            
            if ($whisperRegions -contains $currentRegion.ToLower()) {
                Write-Host "✅ Your region supports Whisper - issue may be quota/permissions" -ForegroundColor Green
            } else {
                Write-Host "❌ Your region ($currentRegion) does not support Whisper" -ForegroundColor Red
            }
        }
    }
    catch {
        Write-Host "❌ Could not determine region. Please check manually in Azure Portal." -ForegroundColor Red
    }
}

# Step 2: Provide detailed next steps
Write-Host "`n📋 Next Steps Based on Your Situation:" -ForegroundColor Green

Write-Host "`n🎯 If your region SUPPORTS Whisper:" -ForegroundColor Cyan
Write-Host "  1. Check quota limits in Azure Portal > Quotas" -ForegroundColor White
Write-Host "  2. Try creating Whisper deployment manually in Azure Portal" -ForegroundColor White  
Write-Host "  3. Contact Azure support for model availability" -ForegroundColor White

Write-Host "`n🌍 If your region does NOT support Whisper:" -ForegroundColor Cyan  
Write-Host "  1. Create new Azure OpenAI resource in East US 2:" -ForegroundColor White
Write-Host "     az cognitiveservices account create \\" -ForegroundColor Gray
Write-Host "       --name 'soundscribe-openai-whisper' \\" -ForegroundColor Gray
Write-Host "       --resource-group '$ResourceGroupName' \\" -ForegroundColor Gray
Write-Host "       --location 'eastus2' \\" -ForegroundColor Gray
Write-Host "       --kind 'OpenAI' \\" -ForegroundColor Gray
Write-Host "       --sku 'S0'" -ForegroundColor Gray

Write-Host "`n  2. Update your application to use dual resources:" -ForegroundColor White
Write-Host "     • GPT-4o-mini: Current resource (GlobalStandard ✅)" -ForegroundColor Gray
Write-Host "     • Whisper: New East US 2 resource" -ForegroundColor Gray

Write-Host "`n🔧 Environment Variables for Dual Setup:" -ForegroundColor Cyan
Write-Host "# Current resource (GPT)" -ForegroundColor Gray
Write-Host "AZURE_OPENAI_ENDPOINT=https://$AccountName.openai.azure.com/" -ForegroundColor White
Write-Host "AZURE_OPENAI_GPT4O_MINI_DEPLOYMENT=gpt-4o-mini" -ForegroundColor White
Write-Host "" -ForegroundColor White
Write-Host "# New Whisper resource" -ForegroundColor Gray  
Write-Host "AZURE_OPENAI_WHISPER_ENDPOINT=https://soundscribe-openai-whisper.openai.azure.com/" -ForegroundColor White
Write-Host "AZURE_OPENAI_WHISPER_DEPLOYMENT=whisper-1" -ForegroundColor White

Write-Host "`n✅ Analysis completed!" -ForegroundColor Green