#!/bin/bash

# SoundScribe Coaching Environment Setup Script
# This script helps configure the backend environment variables for AI coaching

set -e

echo "🎯 SoundScribe AI Coaching Environment Setup"
echo "============================================"
echo ""

# Colors for output
RED='\033[0;31m'
GREEN='\033[0;32m'
YELLOW='\033[1;33m'
BLUE='\033[0;34m'
NC='\033[0m' # No Color

# Check if Supabase CLI is available
if ! command -v npx &> /dev/null; then
    echo -e "${RED}❌ npx is not available. Please install Node.js first.${NC}"
    exit 1
fi

echo -e "${BLUE}🔍 Checking Supabase CLI...${NC}"
if ! npx supabase --version &> /dev/null; then
    echo -e "${RED}❌ Supabase CLI is not available. Please install it first.${NC}"
    exit 1
fi

echo -e "${GREEN}✅ Supabase CLI is available${NC}"
echo ""

# Check if user is logged in
echo -e "${BLUE}🔐 Checking Supabase authentication...${NC}"
if ! npx supabase projects list &> /dev/null; then
    echo -e "${YELLOW}⚠️  You need to login to Supabase first.${NC}"
    echo "Please run: npx supabase login"
    echo ""
    echo "If you're in a non-interactive environment, set SUPABASE_ACCESS_TOKEN:"
    echo "export SUPABASE_ACCESS_TOKEN=your_access_token"
    echo ""
    read -p "Do you want to try logging in now? (y/n): " -n 1 -r
    echo ""
    if [[ $REPLY =~ ^[Yy]$ ]]; then
        npx supabase login
    else
        echo -e "${RED}❌ Cannot proceed without authentication${NC}"
        exit 1
    fi
fi

echo -e "${GREEN}✅ Successfully authenticated with Supabase${NC}"
echo ""

# Get OpenAI API Key from .env file
OPENAI_KEY=""
if [ -f ".env" ]; then
    OPENAI_KEY=$(grep "VITE_OPENAI_API_KEY" .env | cut -d '=' -f2)
    if [ -n "$OPENAI_KEY" ]; then
        echo -e "${GREEN}✅ Found OpenAI API key in .env file${NC}"
    fi
fi

if [ -z "$OPENAI_KEY" ]; then
    echo -e "${YELLOW}⚠️  OpenAI API key not found in .env file${NC}"
    read -p "Please enter your OpenAI API key: " OPENAI_KEY
fi

# Validate OpenAI API key format
if [[ ! $OPENAI_KEY =~ ^sk-[a-zA-Z0-9_-]+$ ]]; then
    echo -e "${RED}❌ Invalid OpenAI API key format. Should start with 'sk-'${NC}"
    exit 1
fi

# Ask for Service Role Key
echo ""
echo -e "${BLUE}🔑 Service Role Key Required${NC}"
echo "You need to get the service_role key from your Supabase dashboard:"
echo "1. Go to: https://supabase.com/dashboard/projects"
echo "2. Select your project"
echo "3. Go to Settings → API"
echo "4. Copy the 'service_role' key (not the anon key)"
echo ""
read -p "Please enter your Supabase service role key: " SERVICE_ROLE_KEY

if [ -z "$SERVICE_ROLE_KEY" ]; then
    echo -e "${RED}❌ Service role key is required${NC}"
    exit 1
fi

# Set environment variables
echo ""
echo -e "${BLUE}🚀 Setting up environment variables...${NC}"

echo "Setting OPENAI_API_KEY..."
if npx supabase secrets set OPENAI_API_KEY="$OPENAI_KEY"; then
    echo -e "${GREEN}✅ OPENAI_API_KEY set successfully${NC}"
else
    echo -e "${RED}❌ Failed to set OPENAI_API_KEY${NC}"
    exit 1
fi

echo "Setting SUPABASE_SERVICE_ROLE_KEY..."
if npx supabase secrets set SUPABASE_SERVICE_ROLE_KEY="$SERVICE_ROLE_KEY"; then
    echo -e "${GREEN}✅ SUPABASE_SERVICE_ROLE_KEY set successfully${NC}"
else
    echo -e "${RED}❌ Failed to set SUPABASE_SERVICE_ROLE_KEY${NC}"
    exit 1
fi

# Deploy functions
echo ""
echo -e "${BLUE}📦 Deploying Edge Functions...${NC}"

functions=("process-recording" "chat-with-recording" "generate-embeddings")

for func in "${functions[@]}"; do
    echo "Deploying $func..."
    if npx supabase functions deploy "$func"; then
        echo -e "${GREEN}✅ $func deployed successfully${NC}"
    else
        echo -e "${YELLOW}⚠️  Failed to deploy $func (may not exist)${NC}"
    fi
done

# Final verification
echo ""
echo -e "${BLUE}🔍 Verifying setup...${NC}"

if npx supabase secrets list | grep -q "OPENAI_API_KEY"; then
    echo -e "${GREEN}✅ OPENAI_API_KEY is configured${NC}"
else
    echo -e "${RED}❌ OPENAI_API_KEY not found${NC}"
fi

if npx supabase secrets list | grep -q "SUPABASE_SERVICE_ROLE_KEY"; then
    echo -e "${GREEN}✅ SUPABASE_SERVICE_ROLE_KEY is configured${NC}"
else
    echo -e "${RED}❌ SUPABASE_SERVICE_ROLE_KEY not found${NC}"
fi

echo ""
echo -e "${GREEN}🎉 Setup Complete!${NC}"
echo ""
echo -e "${BLUE}Next Steps:${NC}"
echo "1. Upload a new recording to test the coaching analysis"
echo "2. Check that the CoachingCanvas shows real coaching data"
echo "3. If you still see 'No Coaching Data', check the function logs:"
echo "   npx supabase functions logs process-recording"
echo ""
echo -e "${YELLOW}Note: Existing recordings without coaching data will need to be reprocessed${NC}"
echo "or you can implement a reprocessing feature in the admin panel."
echo ""
echo "Happy coaching! 🚀"