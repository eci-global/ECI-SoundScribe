import React, { useState } from 'react';
import { HelpCircle, Book, Video, MessageCircle, Search, ExternalLink, ChevronRight } from 'lucide-react';
import { cn } from '@/lib/utils';
import StandardLayout from '@/components/layout/StandardLayout';

const docSections = [
  {
    id: 'getting-started',
    title: 'Getting Started',
    articles: [
      { title: 'Quick Start Guide', slug: 'quick-start' },
      { title: 'Uploading Your First Recording', slug: 'first-upload' },
      { title: 'Understanding the Dashboard', slug: 'dashboard-overview' }
    ]
  },
  {
    id: 'features',
    title: 'Features',
    articles: [
      { title: 'AI-Powered Summaries', slug: 'ai-summaries' },
      { title: 'Q&A Assistant', slug: 'qa-assistant' },
      { title: 'Coaching Analytics', slug: 'coaching-analytics' },
      { title: 'Processing Queue', slug: 'processing-queue' }
    ]
  },
  {
    id: 'integrations',
    title: 'Integrations',
    articles: [
      { title: 'Outreach.io Integration', slug: 'outreach-integration' },
      { title: 'Salesforce Import', slug: 'salesforce-import' },
      { title: 'API Access', slug: 'api-access' }
    ]
  },
  {
    id: 'troubleshooting',
    title: 'Troubleshooting',
    articles: [
      { title: 'Upload Issues', slug: 'upload-issues' },
      { title: 'Processing Failures', slug: 'processing-failures' },
      { title: 'Audio Quality Problems', slug: 'audio-quality' }
    ]
  }
];

const sampleArticle = `
# Quick Start Guide

Welcome to SoundScribe! This guide will help you get started with uploading and analyzing your recordings.

## Step 1: Upload Your First Recording

1. Navigate to **Uploads & Import** from the main navigation
2. Click on "Upload Audio/Video Files"
3. Select your recording file (MP3, WAV, MP4, etc.)
4. Add a title and description (optional)
5. Click "Upload"

## Step 2: Monitor Processing

Your recording will appear in the **Processing Queue** where you can monitor its status:
- **Uploading**: File is being uploaded
- **Processing**: AI is analyzing your recording
- **Completed**: Ready for review

## Step 3: Review Results

Once processing is complete, you can:
- View AI-generated summaries in **Summaries Library**
- Ask questions about the recording using the **Q&A Assistant**
- Review coaching analytics in **Trend Analytics**

## Need Help?

If you encounter any issues, check our [Troubleshooting](#troubleshooting) section or contact support.
`;

export default function HelpDocs() {
  const [selectedArticle, setSelectedArticle] = useState('quick-start');
  const [searchQuery, setSearchQuery] = useState('');

  const filteredSections = docSections.map(section => ({
    ...section,
    articles: section.articles.filter(article =>
      article.title.toLowerCase().includes(searchQuery.toLowerCase())
    )
  })).filter(section => section.articles.length > 0);

  return (
    <StandardLayout activeSection="help">
      <div className="min-h-screen bg-eci-light-gray">
        <div className="max-w-7xl mx-auto px-6 py-8">
          <div className="mb-8">
            <h1 className="text-display text-eci-gray-800 mb-2 flex items-center space-x-3">
              <Book className="w-8 h-8 text-eci-red" />
              <span>Help & Documentation</span>
            </h1>
            <p className="text-body-large text-eci-gray-600">
              Everything you need to know about using SoundScribe
            </p>
          </div>

          <div className="grid grid-cols-1 lg:grid-cols-4 gap-8">
            {/* Sidebar */}
            <div className="lg:col-span-1">
              <div className="bg-white rounded-lg shadow-sm border border-eci-gray-200 p-6 sticky top-8">
                {/* Search */}
                <div className="relative mb-6">
                  <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 w-4 h-4 text-eci-gray-400" />
                  <input
                    type="text"
                    placeholder="Search documentation..."
                    value={searchQuery}
                    onChange={(e) => setSearchQuery(e.target.value)}
                    className="w-full pl-10 pr-4 py-2 border border-eci-gray-200 rounded-lg focus:outline-none focus:ring-2 focus:ring-eci-red/20 focus:border-eci-red text-body-small"
                  />
                </div>

                {/* Navigation */}
                <nav className="space-y-4">
                  {filteredSections.map((section) => (
                    <div key={section.id}>
                      <h3 className="text-caption text-eci-gray-600 mb-2">{section.title}</h3>
                      <ul className="space-y-1">
                        {section.articles.map((article) => (
                          <li key={article.slug}>
                            <button
                              onClick={() => setSelectedArticle(article.slug)}
                              className={cn(
                                "w-full text-left px-3 py-2 rounded-lg text-body-small transition-colors",
                                selectedArticle === article.slug
                                  ? "bg-eci-red/10 text-eci-red font-medium"
                                  : "text-eci-gray-700 hover:bg-eci-gray-100"
                              )}
                            >
                              {article.title}
                            </button>
                          </li>
                        ))}
                      </ul>
                    </div>
                  ))}
                </nav>

                {/* Contact Support */}
                <div className="mt-8 pt-6 border-t border-eci-gray-200">
                  <button className="w-full flex items-center space-x-3 px-4 py-3 bg-eci-red/10 text-eci-red rounded-lg hover:bg-eci-red/20 transition-colors">
                    <MessageCircle className="w-4 h-4" />
                    <span className="text-body-small font-medium">Contact Support</span>
                  </button>
                </div>
              </div>
            </div>

            {/* Content */}
            <div className="lg:col-span-3">
              <div className="bg-white rounded-lg shadow-sm border border-eci-gray-200 p-8">
                {/* Breadcrumb */}
                <div className="flex items-center space-x-2 text-body-small text-eci-gray-500 mb-6">
                  <span>Help</span>
                  <ChevronRight className="w-4 h-4" />
                  <span>Getting Started</span>
                  <ChevronRight className="w-4 h-4" />
                  <span className="text-eci-gray-700">Quick Start Guide</span>
                </div>

                {/* Article Content */}
                <div className="prose prose-lg max-w-none">
                  {selectedArticle === 'outreach-integration' ? (
                    <div className="space-y-6">
                      <div className="bg-blue-50 border border-blue-200 rounded-lg p-6">
                        <h2 className="text-xl font-semibold text-blue-800 mb-3 flex items-center gap-2">
                          <ExternalLink className="h-5 w-5" />
                          Outreach.io Integration
                        </h2>
                        <p className="text-blue-700 mb-4">
                          The Outreach.io integration offers two setup options: organization-wide configuration by IT admins 
                          or individual user connections. Both automatically sync call recordings to create detailed activity records.
                        </p>
                        <button 
                          onClick={() => window.open('/help/outreach-integration', '_blank')}
                          className="inline-flex items-center gap-2 px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 transition-colors"
                        >
                          <Book className="h-4 w-4" />
                          View Complete Integration Guide
                          <ExternalLink className="h-3 w-3" />
                        </button>
                      </div>
                      
                      <div className="grid md:grid-cols-2 gap-6">
                        <div className="space-y-4">
                          <h3 className="font-semibold text-gray-800">Organization Setup (Recommended)</h3>
                          <ol className="list-decimal list-inside space-y-2 text-sm text-gray-600">
                            <li>IT admin configures organization connection</li>
                            <li>Users automatically see calls in profiles</li>
                            <li>Zero individual setup required</li>
                          </ol>
                          <button 
                            onClick={() => window.open('/admin/organization-outreach', '_blank')}
                            className="text-sm text-green-600 hover:text-green-700 font-medium"
                          >
                            Admin Setup Panel →
                          </button>
                        </div>
                        
                        <div className="space-y-4">
                          <h3 className="font-semibold text-gray-800">Individual Setup</h3>
                          <ul className="space-y-2 text-sm text-gray-600">
                            <li>• Personal Outreach connection</li>
                            <li>• Manual prospect mapping</li>
                            <li>• Recording-level sync control</li>
                            <li>• Bulk sync operations</li>
                          </ul>
                          <button 
                            onClick={() => window.open('/integrations/outreach/connect', '_blank')}
                            className="text-sm text-blue-600 hover:text-blue-700 font-medium"
                          >
                            Connect Personal Account →
                          </button>
                        </div>
                      </div>
                    </div>
                  ) : (
                    <div className="text-eci-gray-700 leading-relaxed whitespace-pre-line">
                      {sampleArticle}
                    </div>
                  )}
                </div>

                {/* Article Footer */}
                <div className="mt-12 pt-6 border-t border-eci-gray-200">
                  <div className="flex items-center justify-between">
                    <div className="text-body-small text-eci-gray-500">
                      Last updated: December 20, 2024
                    </div>
                    <div className="flex items-center space-x-4">
                      <button className="text-body-small text-eci-red hover:text-eci-red-dark">
                        Was this helpful?
                      </button>
                      <button className="inline-flex items-center space-x-2 text-body-small text-eci-gray-600 hover:text-eci-gray-800">
                        <ExternalLink className="w-3 h-3" />
                        <span>Edit on GitHub</span>
                      </button>
                    </div>
                  </div>
                </div>
              </div>

              {/* Related Articles */}
              <div className="mt-8 bg-white rounded-lg shadow-sm border border-eci-gray-200 p-6">
                <h3 className="text-title-small text-eci-gray-800 mb-4">Related Articles</h3>
                <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                  <button className="text-left p-4 border border-eci-gray-200 rounded-lg hover:border-eci-red/20 hover:bg-eci-red/5 transition-colors">
                    <h4 className="text-body font-medium text-eci-gray-800 mb-1">Understanding the Dashboard</h4>
                    <p className="text-body-small text-eci-gray-600">Learn about all the features available on your dashboard</p>
                  </button>
                  <button className="text-left p-4 border border-eci-gray-200 rounded-lg hover:border-eci-red/20 hover:bg-eci-red/5 transition-colors">
                    <h4 className="text-body font-medium text-eci-gray-800 mb-1">AI-Powered Summaries</h4>
                    <p className="text-body-small text-eci-gray-600">How our AI creates detailed summaries of your recordings</p>
                  </button>
                </div>
              </div>
            </div>
          </div>
        </div>
      </div>
    </StandardLayout>
  );
}
