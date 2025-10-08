#!/bin/bash

# Azure OpenAI Tier Upgrade Script
# This script upgrades both Whisper and GPT-4o-mini to GlobalStandard tier

echo "🚀 Starting Azure OpenAI tier upgrade..."

# Step 1: Login to Azure (this will open browser)
echo "Step 1: Logging into Azure..."
az login

# Step 2: Set the correct subscription
echo "Step 2: Setting subscription..."
az account set --subscription "f55203c5-2169-42af-8d67-1b93872aef84"

# Step 3: Verify current deployments
echo "Step 3: Checking current deployments..."
az cognitiveservices account deployment list \
  --name "soundscribe-openai" \
  --resource-group "soundscribe-rg" \
  --output table

# Step 4: Upgrade Whisper to GlobalStandard
echo "Step 4: Upgrading Whisper to GlobalStandard (300K TPM)..."
az cognitiveservices account deployment update \
  --name "soundscribe-openai" \
  --resource-group "soundscribe-rg" \
  --deployment-name "whisper-1" \
  --sku-name "GlobalStandard" \
  --sku-capacity 300

# Step 5: Upgrade GPT-4o-mini to GlobalStandard  
echo "Step 5: Upgrading GPT-4o-mini to GlobalStandard (500K TPM)..."
az cognitiveservices account deployment update \
  --name "soundscribe-openai" \
  --resource-group "soundscribe-rg" \
  --deployment-name "gpt-4o-mini-V2" \
  --sku-name "GlobalStandard" \
  --sku-capacity 500

# Step 6: Verify upgrades
echo "Step 6: Verifying upgrades..."
az cognitiveservices account deployment list \
  --name "soundscribe-openai" \
  --resource-group "soundscribe-rg" \
  --output table

echo "✅ Upgrade complete! Your Azure OpenAI is now on GlobalStandard tier."
echo "🎯 This should eliminate 429 rate limiting errors."
echo "🔄 Test with a new recording upload to see real-time sentiment analysis!"