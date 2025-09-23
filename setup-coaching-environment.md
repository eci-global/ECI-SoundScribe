# SoundScribe Coaching Environment Setup Guide

## Overview
This guide will help you configure the backend environment variables needed for the AI coaching evaluation feature to work properly.

## Issue: "No Coaching Data" in CoachingCanvas
If you see "No Coaching Data" in the coaching interface, it means the backend Edge Functions lack the required environment variables to generate coaching evaluations via OpenAI.

## Required Environment Variables

The following environment variables must be set in your Supabase project for Edge Functions:

1. **OPENAI_API_KEY** - For AI coaching analysis, transcription, and content classification
2. **SUPABASE_SERVICE_ROLE_KEY** - For database operations from Edge Functions

## Step-by-Step Setup

### Method 1: Using Supabase CLI (Recommended)

1. **Install Supabase CLI** (if not already installed):
   ```bash
   npm install -g @supabase/cli
   ```

2. **Login to Supabase**:
   ```bash
   npx supabase login
   ```

3. **Set Environment Variables**:
   ```bash
   # Set OpenAI API Key (use the one from your .env file)
   npx supabase secrets set OPENAI_API_KEY=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
   
   # Get service role key from Supabase dashboard and set it
   npx supabase secrets set SUPABASE_SERVICE_ROLE_KEY=your_service_role_key_here
   ```

4. **Deploy Functions** (to apply the new environment variables):
   ```bash
   npx supabase functions deploy process-recording
   npx supabase functions deploy chat-with-recording
   npx supabase functions deploy generate-embeddings
   ```

### Method 2: Using Supabase Dashboard

1. Go to your Supabase project dashboard: https://supabase.com/dashboard/projects
2. Select your project: `qinkldgvejheppheykfl`
3. Navigate to **Settings** → **Edge Functions**
4. Add the following environment variables:
   - `OPENAI_API_KEY`: `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`
   - `SUPABASE_SERVICE_ROLE_KEY`: (found in Settings → API → service_role key)

## Getting Your Service Role Key

1. Go to your Supabase project dashboard
2. Navigate to **Settings** → **API**
3. Under "Project API keys", copy the **service_role** key (not the anon key)
4. This key should start with `eyJ...` and be much longer than the anon key

## Verification

After setting up the environment variables:

1. **Test with a new recording**: Upload a new audio/video file
2. **Check processing**: The recording should go through the full processing pipeline
3. **Verify coaching data**: The CoachingCanvas should show real coaching metrics instead of "No Coaching Data"

## Troubleshooting

### Still seeing "No Coaching Data"?

1. **Check function logs**:
   ```bash
   npx supabase functions logs process-recording
   ```

2. **Verify environment variables are set**:
   ```bash
   npx supabase secrets list
   ```

3. **Test OpenAI API key**:
   ```bash
   curl -H "Authorization: Bearer YOUR_OPENAI_API_KEY" \
        -H "Content-Type: application/json" \
        https://api.openai.com/v1/models
   ```

### Common Issues

- **Invalid OpenAI API Key**: Make sure the key starts with `sk-` and is valid
- **Rate Limiting**: OpenAI API may be rate-limited; check your usage dashboard
- **Service Role Key**: Make sure you're using the service_role key, not the anon key
- **Content Type**: Only recordings with content_type other than 'other' get coaching analysis

## What Coaching Analysis Provides

Once properly configured, the system will generate:

- **Performance Scores**: Talk-time ratio, objection handling, discovery questions, etc.
- **Strengths**: What the speaker did well
- **Areas for Improvement**: Specific feedback for better performance
- **Suggested Responses**: Better ways to handle specific situations
- **Action Items**: Next steps for improvement

## Content Types Supported

- **Sales Calls**: Focus on closing techniques, discovery, objection handling
- **Customer Support**: Problem resolution, empathy, technical accuracy
- **Team Meetings**: Participation, decision making, communication clarity
- **Training Sessions**: Knowledge transfer, engagement, question handling

## Security Notes

- Environment variables are securely stored in Supabase
- Never commit API keys to version control
- The OpenAI API key in your .env file is for frontend chat features only
- The backend uses separate environment variables for processing