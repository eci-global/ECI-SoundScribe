#!/bin/bash

# Supabase Credentials Setup Script
# This script sets up your Supabase credentials for testing migrations

echo "🔧 Setting up Supabase credentials for migration testing..."

# Your existing Supabase credentials
export VITE_SUPABASE_URL="https://qinkldgvejheppheykfl.supabase.co"
export VITE_SUPABASE_ANON_KEY="eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6InFpbmtsZGd2ZWpoZXBwaGV5a2ZsIiwicm9sZSI6ImFub24iLCJpYXQiOjE3NDk1OTA0NDcsImV4cCI6MjA2NTE2NjQ0N30.xn9c-6Sr_kEbETzafRrlaWMHgbUIoqifsCQBrqYT7u4"

echo "✅ Supabase credentials set!"
echo ""
echo "Now you can run:"
echo "  node test-migrations.js"
echo ""
echo "Or test the migrations manually in your Supabase dashboard."
