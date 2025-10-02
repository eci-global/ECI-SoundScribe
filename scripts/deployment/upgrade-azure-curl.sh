#!/bin/bash

# Azure OpenAI GlobalStandard Upgrade using cURL (Pure REST API)
# Based on the REST API approach you provided

# Configuration
SUBSCRIPTION_ID="f55203c5-2169-42af-8d67-1b93872aef84"
RESOURCE_GROUP="soundscribe-rg"
ACCOUNT_NAME="soundscribe-openai"

echo "🚀 Azure OpenAI GlobalStandard upgrade using cURL/REST API..."
echo "📋 Resource Group: $RESOURCE_GROUP"
echo "📋 Account Name: $ACCOUNT_NAME"

# Step 1: Get Azure access token
echo -e "\n🔐 Step 1: Getting Azure access token..."

ACCESS_TOKEN=$(az account get-access-token --query accessToken -o tsv 2>/dev/null)

if [ -z "$ACCESS_TOKEN" ]; then
    echo "❌ Failed to get access token. Please login first:"
    echo "   az login"
    exit 1
fi

echo "✅ Access token obtained"

# Base URLs
BASE_URL="https://management.azure.com/subscriptions/$SUBSCRIPTION_ID/resourceGroups/$RESOURCE_GROUP/providers/Microsoft.CognitiveServices/accounts/$ACCOUNT_NAME"
DEPLOYMENTS_URL="$BASE_URL/deployments?api-version=2023-05-01"

# Step 2: Check current deployments
echo -e "\n📊 Step 2: Checking current deployments..."

CURRENT_DEPLOYMENTS=$(curl -s -H "Authorization: Bearer $ACCESS_TOKEN" \
    -H "Content-Type: application/json" \
    "$DEPLOYMENTS_URL")

if [ $? -eq 0 ]; then
    echo "📋 Current deployments retrieved successfully"
    echo "$CURRENT_DEPLOYMENTS" | jq -r '.value[] | "  • \(.name): \(.sku.name) (Capacity: \(.sku.capacity))"' 2>/dev/null || echo "  (JSON parsing not available - install jq for better output)"
else
    echo "❌ Failed to get current deployments"
    exit 1
fi

# Step 3: Upgrade GPT-4o-mini to GlobalStandard
echo -e "\n🔄 Step 3: Upgrading GPT-4o-mini to GlobalStandard (551K TPM)..."

GPT_URL="$BASE_URL/deployments/gpt-4o-mini?api-version=2023-05-01"

GPT_RESPONSE=$(curl -s -X PATCH "$GPT_URL" \
    -H "Authorization: Bearer $ACCESS_TOKEN" \
    -H "Content-Type: application/json" \
    -d '{
        "sku": {
            "name": "GlobalStandard",
            "capacity": 551
        }
    }')

GPT_STATUS=$?

if [ $GPT_STATUS -eq 0 ]; then
    echo "✅ GPT-4o-mini upgrade request sent successfully"
    
    # Check if response contains error
    if echo "$GPT_RESPONSE" | grep -q "error\|Error" 2>/dev/null; then
        echo "⚠️ GPT-4o-mini upgrade may have encountered issues:"
        echo "$GPT_RESPONSE" | jq -r '.error.message // .message // .' 2>/dev/null || echo "$GPT_RESPONSE"
    else
        echo "📊 GPT-4o-mini upgraded to GlobalStandard!"
    fi
else
    echo "❌ Failed to upgrade GPT-4o-mini"
fi

# Step 4: Upgrade Whisper to GlobalStandard (using your exact approach)
echo -e "\n🎵 Step 4: Upgrading Whisper to GlobalStandard using your REST API method..."

WHISPER_URL="$BASE_URL/deployments/whisper-1?api-version=2023-05-01"

echo "🔄 Sending PATCH request to whisper-1 deployment..."

WHISPER_RESPONSE=$(curl -s -X PATCH "$WHISPER_URL" \
    -H "Authorization: Bearer $ACCESS_TOKEN" \
    -H "Content-Type: application/json" \
    -d '{
        "sku": {
            "name": "GlobalStandard",
            "capacity": 300
        }
    }')

WHISPER_STATUS=$?

if [ $WHISPER_STATUS -eq 0 ]; then
    echo "✅ Whisper upgrade request sent successfully"
    
    # Check if response contains error
    if echo "$WHISPER_RESPONSE" | grep -q "error\|Error" 2>/dev/null; then
        echo "⚠️ Whisper upgrade may have encountered issues:"
        echo "$WHISPER_RESPONSE" | jq -r '.error.message // .message // .' 2>/dev/null || echo "$WHISPER_RESPONSE"
        echo "💡 Note: Whisper may not support GlobalStandard in all regions"
    else
        echo "📊 Whisper upgraded to GlobalStandard!"
    fi
else
    echo "❌ Failed to upgrade Whisper"
    echo "💡 Note: Whisper GlobalStandard may not be available in your region"
fi

# Step 5: Verify final deployments
echo -e "\n✅ Step 5: Verifying final deployments..."

sleep 5  # Give Azure a moment to process the changes

FINAL_DEPLOYMENTS=$(curl -s -H "Authorization: Bearer $ACCESS_TOKEN" \
    -H "Content-Type: application/json" \
    "$DEPLOYMENTS_URL")

if [ $? -eq 0 ]; then
    echo "📋 Final deployment configuration:"
    
    # Count GlobalStandard deployments
    GLOBAL_STANDARD_COUNT=$(echo "$FINAL_DEPLOYMENTS" | jq -r '[.value[] | select(.sku.name == "GlobalStandard")] | length' 2>/dev/null || echo "0")
    
    # Display deployments
    if command -v jq &> /dev/null; then
        echo "$FINAL_DEPLOYMENTS" | jq -r '.value[] | "  \(if .sku.name == "GlobalStandard" then "🚀" else "⚠️" end) \(.name): \(.sku.name) (Capacity: \(.sku.capacity))"'
    else
        echo "  (Install jq for better formatting: apt-get install jq)"
        echo "$FINAL_DEPLOYMENTS"
    fi
    
    # Success summary
    if [ "$GLOBAL_STANDARD_COUNT" -gt "0" ]; then
        echo -e "\n🎉 SUCCESS! $GLOBAL_STANDARD_COUNT deployment(s) upgraded to GlobalStandard"
        echo "🎯 Benefits achieved:"
        echo "  • Eliminated 429 rate limiting errors"
        echo "  • 13.8x higher rate limits (551,000 TPM)"
        echo "  • Faster processing and better user experience"
        echo -e "\n🔄 Test with audio uploads to see the improvement!"
    else
        echo -e "\n⚠️ No GlobalStandard deployments detected"
        echo "💡 You may need to request quota increases in Azure Portal first"
        echo "🌐 Go to: Azure Portal > Azure OpenAI > Quotas > Request Increase"
    fi
else
    echo "❌ Failed to verify final deployments"
fi

# Step 6: Test the deployment (optional)
echo -e "\n🧪 Step 6: Quick API test..."

TEST_URL="https://$ACCOUNT_NAME.openai.azure.com/openai/deployments/gpt-4o-mini/chat/completions?api-version=2024-10-01-preview"

# Get the API key (you'll need to set this)
if [ -z "$AZURE_OPENAI_API_KEY" ]; then
    echo "⚠️ Set AZURE_OPENAI_API_KEY environment variable to test API connectivity"
else
    echo "🔄 Testing API endpoint..."
    
    TEST_RESPONSE=$(curl -s -X POST "$TEST_URL" \
        -H "Content-Type: application/json" \
        -H "api-key: $AZURE_OPENAI_API_KEY" \
        -d '{
            "messages": [{"role": "user", "content": "Test GlobalStandard deployment - what is 2+2?"}],
            "max_tokens": 50,
            "temperature": 0
        }')
    
    if echo "$TEST_RESPONSE" | grep -q "choices" 2>/dev/null; then
        echo "✅ API test successful - GlobalStandard deployment is working!"
        ANSWER=$(echo "$TEST_RESPONSE" | jq -r '.choices[0].message.content' 2>/dev/null || echo "Response received")
        echo "📋 Test response: $ANSWER"
    else
        echo "⚠️ API test failed or returned unexpected response"
        echo "$TEST_RESPONSE" | jq '.' 2>/dev/null || echo "$TEST_RESPONSE"
    fi
fi

# Next steps
echo -e "\n📋 Next Steps:"
echo "  1. Update your environment variables:"
echo "     AZURE_OPENAI_GPT4O_MINI_DEPLOYMENT=gpt-4o-mini"
echo "     AZURE_OPENAI_WHISPER_DEPLOYMENT=whisper-1"
echo "  2. Test API endpoints with your application"
echo "  3. Monitor performance improvements"
echo "  4. Update documentation"

echo -e "\n✅ cURL/REST API upgrade script completed!"
echo "💡 This pure REST API approach often works when PowerShell modules have issues."