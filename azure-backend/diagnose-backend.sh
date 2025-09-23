#!/bin/bash

# Bash equivalent of PowerShell diagnostics for Azure backend
# Tests endpoints and diagnoses DNS resolution issues

APP_SERVICE_NAME="soundscribe-backend"
BASE_URL="https://${APP_SERVICE_NAME}.azurewebsites.net"

echo "🔍 DIAGNOSING AZURE BACKEND"
echo "Testing with extended timeouts and detailed analysis"
echo ""

# Test 1: Basic connectivity with extended timeout
echo "📊 Test 1: Basic connectivity (60s timeout)..."
if response=$(curl -s -w "HTTP_CODE:%{http_code}\nTIME_TOTAL:%{time_total}\n" --max-time 60 "${BASE_URL}/"); then
    http_code=$(echo "$response" | grep "HTTP_CODE:" | cut -d: -f2)
    time_total=$(echo "$response" | grep "TIME_TOTAL:" | cut -d: -f2)
    content=$(echo "$response" | head -n -2)
    
    if [ "$http_code" = "200" ]; then
        echo "✅ Basic connectivity: $http_code (${time_total}s)"
        echo "📄 Response length: $(echo "$content" | wc -c) characters"
    else
        echo "❌ Basic connectivity failed: HTTP $http_code"
        echo "$content"
    fi
else
    echo "❌ Basic connectivity failed: Connection timeout or error"
fi

echo ""

# Test 2: Health endpoint with extended timeout
echo "📊 Test 2: Health endpoint (60s timeout)..."
if health_response=$(curl -s -w "HTTP_CODE:%{http_code}\n" --max-time 60 "${BASE_URL}/health"); then
    http_code=$(echo "$health_response" | tail -n1 | cut -d: -f2)
    health_data=$(echo "$health_response" | head -n -1)
    
    if [ "$http_code" = "200" ]; then
        echo "✅ Health endpoint working!"
        echo "📊 Status: $http_code"
        
        # Parse JSON response
        if command -v jq >/dev/null 2>&1; then
            version=$(echo "$health_data" | jq -r '.version // "unknown"')
            api_version=$(echo "$health_data" | jq -r '.apiVersion // "unknown"')
            deployment=$(echo "$health_data" | jq -r '.deployment // "unknown"')
            uptime=$(echo "$health_data" | jq -r '.uptime // "unknown"')
            
            echo "📊 Version: $version"
            echo "📊 API Version: $api_version"
            echo "📊 Deployment: $deployment"
            echo "📊 Uptime: ${uptime} seconds"
            
            if [ "$api_version" = "2024-10-01-preview" ]; then
                echo "🎉 API VERSION IS FIXED!"
            else
                echo "❌ API version still wrong: $api_version"
            fi
        else
            echo "📄 Raw response: $health_data"
            echo "ℹ️ Install 'jq' for better JSON parsing"
        fi
    else
        echo "❌ Health endpoint failed: HTTP $http_code"
        echo "$health_data"
    fi
else
    echo "❌ Health endpoint failed: Connection timeout or error"
fi

echo ""

# Test 3: Debug configuration endpoint
echo "📊 Test 3: Debug configuration..."
if debug_response=$(curl -s -w "HTTP_CODE:%{http_code}\n" --max-time 60 "${BASE_URL}/api/debug-config"); then
    http_code=$(echo "$debug_response" | tail -n1 | cut -d: -f2)
    debug_data=$(echo "$debug_response" | head -n -1)
    
    if [ "$http_code" = "200" ]; then
        echo "✅ Debug endpoint available!"
        
        if command -v jq >/dev/null 2>&1; then
            constructed_url=$(echo "$debug_data" | jq -r '.constructedUrl // "unknown"')
            has_double_slash=$(echo "$debug_data" | jq -r '.urlValidation.hasDoubleSlash // false')
            api_version_correct=$(echo "$debug_data" | jq -r '.urlValidation.apiVersionCorrect // false')
            
            echo "📊 Constructed URL: $constructed_url"
            
            if [ "$has_double_slash" = "true" ]; then
                echo "❌ Double slash detected in URL!"
            else
                echo "✅ URL format is correct (no double slashes)"
            fi
            
            if [ "$api_version_correct" = "true" ]; then
                echo "✅ API version validation passed"
            else
                echo "❌ API version validation failed"
            fi
            
            echo ""
            echo "📋 Environment Variables from server:"
            echo "$debug_data" | jq -r '.environment | to_entries[] | "   \(.key): \(.value // "[NOT SET]")"'
        else
            echo "📄 Raw debug response:"
            echo "$debug_data"
        fi
    else
        echo "❌ Debug endpoint failed: HTTP $http_code"
        echo "$debug_data"
    fi
else
    echo "❌ Debug endpoint failed: Connection timeout or error"
fi

echo ""

# Test 4: DNS Resolution Test
echo "📊 Test 4: DNS Resolution Test..."
AZURE_HOSTNAME="soundscribe-openai.openai.azure.com"

echo "🔍 Testing DNS resolution for: $AZURE_HOSTNAME"

# Test with nslookup
if command -v nslookup >/dev/null 2>&1; then
    echo "📡 nslookup results:"
    if nslookup_result=$(nslookup "$AZURE_HOSTNAME" 2>&1); then
        if echo "$nslookup_result" | grep -q "can't find\|NXDOMAIN\|No answer"; then
            echo "❌ DNS lookup failed - domain not found"
            echo "$nslookup_result"
        else
            echo "✅ DNS lookup successful"
            echo "$nslookup_result" | grep -E "Address:|Name:"
        fi
    else
        echo "❌ nslookup command failed"
    fi
else
    echo "⚠️ nslookup not available"
fi

# Test with dig
if command -v dig >/dev/null 2>&1; then
    echo ""
    echo "📡 dig results:"
    if dig_result=$(dig +short "$AZURE_HOSTNAME" 2>&1); then
        if [ -n "$dig_result" ]; then
            echo "✅ dig lookup successful: $dig_result"
        else
            echo "❌ dig lookup failed - no results"
        fi
    else
        echo "❌ dig command failed"
    fi
else
    echo "⚠️ dig not available"
fi

# Test with getent
if command -v getent >/dev/null 2>&1; then
    echo ""
    echo "📡 getent results:"
    if getent_result=$(getent hosts "$AZURE_HOSTNAME" 2>&1); then
        if [ -n "$getent_result" ]; then
            echo "✅ getent lookup successful: $getent_result"
        else
            echo "❌ getent lookup failed - no results"
        fi
    else
        echo "❌ getent command failed"
    fi
else
    echo "⚠️ getent not available"
fi

echo ""

# Test 5: Process audio endpoint (basic test)
echo "📊 Test 5: Process audio endpoint..."
test_payload='{"recording_id":"diagnostic-test-'$(date +%Y%m%d%H%M%S)'","file_url":"https://example.com/test.wav","file_size":1024000}'

if process_response=$(curl -s -w "HTTP_CODE:%{http_code}\n" --max-time 60 \
    -H "Content-Type: application/json" \
    -d "$test_payload" \
    "${BASE_URL}/api/process-audio"); then
    
    http_code=$(echo "$process_response" | tail -n1 | cut -d: -f2)
    process_data=$(echo "$process_response" | head -n -1)
    
    if [ "$http_code" = "200" ]; then
        echo "✅ Process endpoint working!"
        if command -v jq >/dev/null 2>&1; then
            message=$(echo "$process_data" | jq -r '.message // "unknown"')
            transcription_enabled=$(echo "$process_data" | jq -r '.transcription_enabled // false')
            echo "📊 Response: $message"
            echo "📊 Transcription enabled: $transcription_enabled"
        else
            echo "📄 Raw response: $process_data"
        fi
    else
        echo "❌ Process endpoint failed: HTTP $http_code"
        echo "$process_data"
    fi
else
    echo "❌ Process endpoint failed: Connection timeout or error"
fi

echo ""
echo "📋 DIAGNOSIS SUMMARY:"
echo "• Basic connectivity test completed"
echo "• Health endpoint test completed"
echo "• Debug configuration test completed"
echo "• DNS resolution test completed"
echo "• Process endpoint test completed"
echo ""
echo "🔍 Next Steps:"
echo "1. If health and debug endpoints work - backend is running correctly"
echo "2. If DNS resolution fails - need to check Azure OpenAI resource name"
echo "3. If all tests pass - ready to test WAV file upload"
echo ""
echo "📊 Troubleshooting URLs:"
echo "• Kudu Console: https://${APP_SERVICE_NAME}.scm.azurewebsites.net"
echo "• Log Stream: https://${APP_SERVICE_NAME}.scm.azurewebsites.net/api/logstream"
echo "• Environment: https://${APP_SERVICE_NAME}.scm.azurewebsites.net/Env"