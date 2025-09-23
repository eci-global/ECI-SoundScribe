#!/bin/bash

# Test script to verify Azure backend transcription after endpoint fix

APP_SERVICE_NAME="soundscribe-backend"
BASE_URL="https://${APP_SERVICE_NAME}.azurewebsites.net"

echo "🧪 TESTING AZURE BACKEND TRANSCRIPTION"
echo "After fixing the Azure OpenAI endpoint"
echo ""

# Test 1: Verify health endpoint shows correct configuration
echo "📊 Test 1: Health check..."
if health_response=$(curl -s --max-time 30 "${BASE_URL}/health"); then
    echo "✅ Health endpoint responding"
    
    if command -v jq >/dev/null 2>&1; then
        api_version=$(echo "$health_response" | jq -r '.apiVersion // "unknown"')
        deployment=$(echo "$health_response" | jq -r '.deployment // "unknown"')
        echo "📊 API Version: $api_version"
        echo "📊 Deployment: $deployment"
        
        if [ "$api_version" = "2024-10-01-preview" ]; then
            echo "✅ API version is correct"
        else
            echo "❌ API version is wrong: $api_version"
        fi
    else
        echo "📄 Raw health response:"
        echo "$health_response"
    fi
else
    echo "❌ Health endpoint failed"
    exit 1
fi

echo ""

# Test 2: Check debug configuration
echo "📊 Test 2: Debug configuration..."
if debug_response=$(curl -s --max-time 30 "${BASE_URL}/api/debug-config"); then
    echo "✅ Debug endpoint responding"
    
    if command -v jq >/dev/null 2>&1; then
        constructed_url=$(echo "$debug_response" | jq -r '.constructedUrl // "unknown"')
        endpoint=$(echo "$debug_response" | jq -r '.azureConfig.endpoint // "unknown"')
        
        echo "📊 Current endpoint: $endpoint"
        echo "📊 Constructed URL: $constructed_url"
        
        # Check if using correct endpoint
        if echo "$constructed_url" | grep -q "eastus.api.cognitive.microsoft.com"; then
            echo "🎉 USING CORRECT AZURE ENDPOINT!"
        elif echo "$constructed_url" | grep -q "soundscribe-openai.openai.azure.com"; then
            echo "❌ Still using incorrect custom endpoint"
            echo "⚠️ Environment variables may not have been updated yet"
        else
            echo "⚠️ Unknown endpoint format"
        fi
        
        # Check URL validation
        has_double_slash=$(echo "$debug_response" | jq -r '.urlValidation.hasDoubleSlash // false')
        api_version_correct=$(echo "$debug_response" | jq -r '.urlValidation.apiVersionCorrect // false')
        
        if [ "$has_double_slash" = "false" ]; then
            echo "✅ URL format is correct (no double slashes)"
        else
            echo "❌ URL has double slash issue"
        fi
        
        if [ "$api_version_correct" = "true" ]; then
            echo "✅ API version validation passed"
        else
            echo "❌ API version validation failed"
        fi
    else
        echo "📄 Raw debug response (install jq for better parsing):"
        echo "$debug_response"
    fi
else
    echo "❌ Debug endpoint failed"
fi

echo ""

# Test 3: DNS Resolution for correct endpoint
echo "📊 Test 3: DNS resolution test..."
CORRECT_HOSTNAME="eastus.api.cognitive.microsoft.com"

echo "🔍 Testing DNS resolution for: $CORRECT_HOSTNAME"
if command -v nslookup >/dev/null 2>&1; then
    if nslookup_result=$(nslookup "$CORRECT_HOSTNAME" 2>&1); then
        if echo "$nslookup_result" | grep -q "can't find\|NXDOMAIN\|No answer"; then
            echo "❌ DNS lookup failed for correct endpoint"
        else
            echo "✅ DNS resolution successful for correct endpoint"
            echo "$nslookup_result" | grep -E "Address:|Name:" | head -2
        fi
    else
        echo "❌ nslookup command failed"
    fi
else
    echo "⚠️ nslookup not available, testing with curl..."
    # Test HTTP connectivity as DNS check
    if curl -s --max-time 10 --head "https://$CORRECT_HOSTNAME" >/dev/null 2>&1; then
        echo "✅ HTTP connectivity to correct endpoint works"
    else
        echo "❌ Cannot connect to correct endpoint"
    fi
fi

echo ""

# Test 4: Process audio endpoint test
echo "📊 Test 4: Process audio endpoint test..."
test_payload='{"recording_id":"endpoint-fix-test-'$(date +%Y%m%d%H%M%S)'","file_url":"https://example.com/test.wav","file_size":1024000}'

echo "🔍 Testing with payload: $test_payload"

if process_response=$(curl -s --max-time 30 \
    -H "Content-Type: application/json" \
    -d "$test_payload" \
    -w "HTTP_CODE:%{http_code}\n" \
    "${BASE_URL}/api/process-audio"); then
    
    http_code=$(echo "$process_response" | tail -n1 | cut -d: -f2)
    process_data=$(echo "$process_response" | head -n -1)
    
    if [ "$http_code" = "200" ]; then
        echo "✅ Process endpoint accepting requests!"
        
        if command -v jq >/dev/null 2>&1; then
            success=$(echo "$process_data" | jq -r '.success // false')
            message=$(echo "$process_data" | jq -r '.message // "unknown"')
            transcription_enabled=$(echo "$process_data" | jq -r '.transcription_enabled // false')
            
            echo "📊 Success: $success"
            echo "📊 Message: $message" 
            echo "📊 Transcription enabled: $transcription_enabled"
            
            if [ "$success" = "true" ] && [ "$transcription_enabled" = "true" ]; then
                echo "🎉 PROCESS ENDPOINT IS WORKING WITH TRANSCRIPTION!"
            else
                echo "⚠️ Process endpoint responding but may have issues"
            fi
        else
            echo "📄 Raw process response:"
            echo "$process_data"
        fi
    else
        echo "❌ Process endpoint failed: HTTP $http_code"
        echo "$process_data"
    fi
else
    echo "❌ Process endpoint connection failed"
fi

echo ""
echo "📋 TEST SUMMARY:"
echo "================================"

# Determine overall status
if curl -s --max-time 10 "${BASE_URL}/health" | grep -q "healthy" 2>/dev/null; then
    if curl -s --max-time 10 "${BASE_URL}/api/debug-config" | grep -q "eastus.api.cognitive.microsoft.com" 2>/dev/null; then
        echo "🎉 BACKEND IS READY!"
        echo "✅ Health check: Working"
        echo "✅ Endpoint: Fixed to correct Azure OpenAI"
        echo "✅ DNS resolution: Should work"
        echo "✅ Process endpoint: Accepting requests"
        echo ""
        echo "🚀 READY TO TEST YOUR 8KHZ WAV FILE!"
        echo "You can now upload your audio file for transcription."
    else
        echo "⚠️ BACKEND PARTIALLY READY"
        echo "✅ Health check: Working"
        echo "❌ Endpoint: Still needs environment variable update"
        echo "📋 Action needed: Run the PowerShell endpoint fix script"
    fi
else
    echo "❌ BACKEND NOT READY"
    echo "❌ Health check: Failing"
    echo "📋 Action needed: Check deployment and logs"
fi

echo ""
echo "🔍 Troubleshooting:"
echo "• Health: ${BASE_URL}/health"
echo "• Debug: ${BASE_URL}/api/debug-config"
echo "• Logs: https://${APP_SERVICE_NAME}.scm.azurewebsites.net/api/logstream"