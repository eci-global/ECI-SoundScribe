import React from 'react';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { Alert, AlertDescription } from '@/components/ui/alert';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { 
  Zap,
  Users,
  CheckCircle,
  ExternalLink,
  Settings,
  Play,
  RefreshCw,
  AlertCircle,
  Info,
  ArrowRight,
  Shield,
  Clock,
  TrendingUp,
  FileAudio,
  Mail,
  Building
} from 'lucide-react';

export default function OutreachIntegrationHelp() {
  return (
    <div className="container max-w-6xl mx-auto p-6 space-y-8">
      {/* Header */}
      <div className="text-center space-y-4">
        <div className="flex items-center justify-center gap-3">
          <div className="p-3 bg-blue-50 rounded-xl">
            <Zap className="h-8 w-8 text-blue-600" />
          </div>
          <h1 className="text-3xl font-bold">Outreach.io Integration</h1>
        </div>
        <p className="text-lg text-gray-600 max-w-3xl mx-auto">
          Two integration options: Individual user connections or organization-wide setup by IT admins. 
          Automatically sync call recordings to create activity records with AI-powered summaries.
        </p>
      </div>

      {/* Integration Options */}
      <div className="grid md:grid-cols-2 gap-6">
        <Card className="border-green-200 bg-green-50/50">
          <CardHeader>
            <div className="flex items-center gap-2">
              <Building className="h-5 w-5 text-green-600" />
              <CardTitle className="text-xl">Organization-Wide</CardTitle>
            </div>
            <CardDescription>Recommended for companies</CardDescription>
          </CardHeader>
          <CardContent className="space-y-4">
            <div className="space-y-3">
              <div className="flex items-start gap-3">
                <div className="w-6 h-6 bg-green-100 rounded-full flex items-center justify-center text-green-600 font-semibold text-sm flex-shrink-0">
                  1
                </div>
                <div>
                  <h4 className="font-medium">IT Admin Setup</h4>
                  <p className="text-sm text-gray-600">Admin configures organization connection once</p>
                </div>
              </div>
              <div className="flex items-start gap-3">
                <div className="w-6 h-6 bg-green-100 rounded-full flex items-center justify-center text-green-600 font-semibold text-sm flex-shrink-0">
                  2
                </div>
                <div>
                  <h4 className="font-medium">Automatic Access</h4>
                  <p className="text-sm text-gray-600">All users instantly see their calls in profiles</p>
                </div>
              </div>
              <div className="flex items-start gap-3">
                <div className="w-6 h-6 bg-green-100 rounded-full flex items-center justify-center text-green-600 font-semibold text-sm flex-shrink-0">
                  3
                </div>
                <div>
                  <h4 className="font-medium">Zero User Setup</h4>
                  <p className="text-sm text-gray-600">No individual OAuth required</p>
                </div>
              </div>
            </div>
            <Button onClick={() => window.open('/admin/organization-outreach', '_blank')} className="w-full">
              <Building className="h-4 w-4 mr-2" />
              Admin Setup
            </Button>
          </CardContent>
        </Card>

        <Card className="border-blue-200 bg-blue-50/50">
          <CardHeader>
            <div className="flex items-center gap-2">
              <Users className="h-5 w-5 text-blue-600" />
              <CardTitle className="text-xl">Individual Setup</CardTitle>
            </div>
            <CardDescription>For personal use</CardDescription>
          </CardHeader>
          <CardContent className="space-y-4">
            <div className="space-y-3">
              <div className="flex items-start gap-3">
                <div className="w-6 h-6 bg-blue-100 rounded-full flex items-center justify-center text-blue-600 font-semibold text-sm flex-shrink-0">
                  1
                </div>
                <div>
                  <h4 className="font-medium">Connect Account</h4>
                  <p className="text-sm text-gray-600">Link your personal Outreach account</p>
                </div>
              </div>
              <div className="flex items-start gap-3">
                <div className="w-6 h-6 bg-blue-100 rounded-full flex items-center justify-center text-blue-600 font-semibold text-sm flex-shrink-0">
                  2
                </div>
                <div>
                  <h4 className="font-medium">Upload Recordings</h4>
                  <p className="text-sm text-gray-600">Add your sales call recordings</p>
                </div>
              </div>
              <div className="flex items-start gap-3">
                <div className="w-6 h-6 bg-blue-100 rounded-full flex items-center justify-center text-blue-600 font-semibold text-sm flex-shrink-0">
                  3
                </div>
                <div>
                  <h4 className="font-medium">Manual Sync</h4>
                  <p className="text-sm text-gray-600">Sync recordings to your prospects</p>
                </div>
              </div>
            </div>
            <Button variant="outline" onClick={() => window.open('/integrations/outreach/connect', '_blank')} className="w-full">
              <ExternalLink className="h-4 w-4 mr-2" />
              Connect Account
            </Button>
          </CardContent>
        </Card>
      </div>

      {/* Main Content Tabs */}
      <Tabs defaultValue="overview" className="w-full">
        <TabsList className="grid w-full grid-cols-6">
          <TabsTrigger value="overview">Overview</TabsTrigger>
          <TabsTrigger value="organization">Organization</TabsTrigger>
          <TabsTrigger value="individual">Individual</TabsTrigger>
          <TabsTrigger value="features">Features</TabsTrigger>
          <TabsTrigger value="workflow">Workflow</TabsTrigger>
          <TabsTrigger value="troubleshooting">Help</TabsTrigger>
        </TabsList>

        {/* Overview */}
        <TabsContent value="overview" className="space-y-6">
          <Card>
            <CardHeader>
              <CardTitle className="flex items-center gap-2">
                <Info className="h-5 w-5" />
                What is the Outreach Integration?
              </CardTitle>
            </CardHeader>
            <CardContent className="space-y-4">
              <p className="text-gray-700">
                Echo AI Scribe offers two ways to integrate with Outreach.io: organization-wide setup by IT admins 
                or individual user connections. Both create detailed activity records with AI insights.
              </p>
              
              <div className="grid md:grid-cols-2 gap-4">
                <div className="space-y-3">
                  <h4 className="font-semibold flex items-center gap-2">
                    <Building className="h-4 w-4 text-green-600" />
                    Organization-Wide (Recommended)
                  </h4>
                  <ul className="space-y-2 text-sm text-gray-600 ml-6">
                    <li>• IT admin configures once for everyone</li>
                    <li>• Users see calls automatically in profiles</li>
                    <li>• Zero individual setup required</li>
                    <li>• Centralized management and monitoring</li>
                    <li>• Automatic user-prospect mapping</li>
                  </ul>
                </div>
                
                <div className="space-y-3">
                  <h4 className="font-semibold flex items-center gap-2">
                    <Users className="h-4 w-4 text-blue-600" />
                    Individual Setup
                  </h4>
                  <ul className="space-y-2 text-sm text-gray-600 ml-6">
                    <li>• Personal OAuth connection</li>
                    <li>• Manual prospect mapping</li>
                    <li>• Individual sync controls</li>
                    <li>• Bulk sync operations</li>
                    <li>• Recording-level management</li>
                  </ul>
                </div>
              </div>
            </CardContent>
          </Card>

          <Card>
            <CardHeader>
              <CardTitle>What End Users Can Expect</CardTitle>
            </CardHeader>
            <CardContent className="space-y-4">
              <Alert>
                <TrendingUp className="h-4 w-4" />
                <AlertDescription>
                  <strong>Seamless Integration:</strong> Once connected, recordings automatically sync to Outreach 
                  with zero manual effort required for most calls.
                </AlertDescription>
              </Alert>

              <div className="grid md:grid-cols-3 gap-4">
                <div className="p-4 border rounded-lg">
                  <div className="flex items-center gap-2 mb-2">
                    <Clock className="h-4 w-4 text-green-600" />
                    <span className="font-semibold text-sm">Time Savings</span>
                  </div>
                  <p className="text-xs text-gray-600">
                    Save 10-15 minutes per call by eliminating manual note-taking and activity creation
                  </p>
                </div>
                
                <div className="p-4 border rounded-lg">
                  <div className="flex items-center gap-2 mb-2">
                    <CheckCircle className="h-4 w-4 text-blue-600" />
                    <span className="font-semibold text-sm">Accuracy</span>
                  </div>
                  <p className="text-xs text-gray-600">
                    AI-generated summaries capture details you might miss, ensuring complete activity records
                  </p>
                </div>
                
                <div className="p-4 border rounded-lg">
                  <div className="flex items-center gap-2 mb-2">
                    <TrendingUp className="h-4 w-4 text-purple-600" />
                    <span className="font-semibold text-sm">Insights</span>
                  </div>
                  <p className="text-xs text-gray-600">
                    Get coaching feedback and performance insights automatically added to prospect records
                  </p>
                </div>
              </div>
            </CardContent>
          </Card>
        </TabsContent>

        {/* Organization Setup */}
        <TabsContent value="organization" className="space-y-6">
          <Card>
            <CardHeader>
              <CardTitle>Organization-Wide Integration Setup</CardTitle>
              <CardDescription>
                For IT administrators setting up Outreach integration for the entire company
              </CardDescription>
            </CardHeader>
            <CardContent className="space-y-6">
              <Alert>
                <Building className="h-4 w-4" />
                <AlertDescription>
                  <strong>Admin Required:</strong> This setup requires administrator privileges 
                  and configures Outreach access for all users in your organization.
                </AlertDescription>
              </Alert>

              <div className="space-y-4">
                <div className="flex items-start gap-4 p-4 border-l-4 border-green-500 bg-green-50">
                  <div className="w-6 h-6 bg-green-500 rounded-full flex items-center justify-center text-white text-sm font-semibold flex-shrink-0">
                    1
                  </div>
                  <div className="space-y-2">
                    <h3 className="font-semibold">Access Admin Panel</h3>
                    <p className="text-sm text-gray-600">
                      Navigate to the organization Outreach settings in the admin panel.
                    </p>
                    <Button size="sm" onClick={() => window.open('/admin/organization-outreach', '_blank')}>
                      <Building className="h-3 w-3 mr-1" />
                      Open Admin Panel
                    </Button>
                  </div>
                </div>

                <div className="flex items-start gap-4 p-4 border-l-4 border-blue-500 bg-blue-50">
                  <div className="w-6 h-6 bg-blue-500 rounded-full flex items-center justify-center text-white text-sm font-semibold flex-shrink-0">
                    2
                  </div>
                  <div className="space-y-2">
                    <h3 className="font-semibold">Connect Organization Account</h3>
                    <p className="text-sm text-gray-600">
                      Enter your organization domain (e.g., company.com) and connect your Outreach organization account.
                    </p>
                    <div className="text-xs text-blue-600 bg-blue-100 p-2 rounded">
                      <strong>Required:</strong> Organization admin access to Outreach.io
                    </div>
                  </div>
                </div>

                <div className="flex items-start gap-4 p-4 border-l-4 border-purple-500 bg-purple-50">
                  <div className="w-6 h-6 bg-purple-500 rounded-full flex items-center justify-center text-white text-sm font-semibold flex-shrink-0">
                    3
                  </div>
                  <div className="space-y-2">
                    <h3 className="font-semibold">Discover Users</h3>
                    <p className="text-sm text-gray-600">
                      Run user discovery to automatically map internal users to Outreach prospects based on email domains.
                    </p>
                  </div>
                </div>

                <div className="flex items-start gap-4 p-4 border-l-4 border-orange-500 bg-orange-50">
                  <div className="w-6 h-6 bg-orange-500 rounded-full flex items-center justify-center text-white text-sm font-semibold flex-shrink-0">
                    4
                  </div>
                  <div className="space-y-2">
                    <h3 className="font-semibold">Sync Call History</h3>
                    <p className="text-sm text-gray-600">
                      Perform a full sync to import historical call data for all mapped users.
                    </p>
                  </div>
                </div>
              </div>

              <div className="bg-gray-50 p-4 rounded-lg">
                <h4 className="font-semibold mb-2">What Happens Next?</h4>
                <ul className="text-sm text-gray-600 space-y-1">
                  <li>• All users can immediately see their Outreach calls in their profiles</li>
                  <li>• No individual setup required from end users</li>
                  <li>• New calls automatically sync from Outreach</li>
                  <li>• Centralized monitoring and management for admins</li>
                </ul>
              </div>
            </CardContent>
          </Card>
        </TabsContent>

        {/* Individual Setup */}
        <TabsContent value="individual" className="space-y-6">
          <Card>
            <CardHeader>
              <CardTitle>Initial Setup</CardTitle>
              <CardDescription>Complete these steps to get started</CardDescription>
            </CardHeader>
            <CardContent className="space-y-6">
              <div className="space-y-4">
                <div className="flex items-start gap-4 p-4 border-l-4 border-blue-500 bg-blue-50">
                  <div className="w-6 h-6 bg-blue-500 rounded-full flex items-center justify-center text-white text-sm font-semibold flex-shrink-0">
                    1
                  </div>
                  <div className="space-y-2">
                    <h3 className="font-semibold">Connect Your Outreach Account</h3>
                    <p className="text-sm text-gray-600">
                      Click the "Connect Outreach Account" button and authorize Echo AI Scribe to access your Outreach data.
                    </p>
                    <Button size="sm" onClick={() => window.open('/integrations/outreach/connect', '_blank')}>
                      <ExternalLink className="h-3 w-3 mr-1" />
                      Connect Now
                    </Button>
                  </div>
                </div>

                <div className="flex items-start gap-4 p-4 border-l-4 border-green-500 bg-green-50">
                  <div className="w-6 h-6 bg-green-500 rounded-full flex items-center justify-center text-white text-sm font-semibold flex-shrink-0">
                    2
                  </div>
                  <div className="space-y-2">
                    <h3 className="font-semibold">Test the Connection</h3>
                    <p className="text-sm text-gray-600">
                      Verify everything is working by running the integration test suite.
                    </p>
                    <Button size="sm" variant="outline" onClick={() => window.open('/integrations/outreach/test', '_blank')}>
                      <Settings className="h-3 w-3 mr-1" />
                      Run Tests
                    </Button>
                  </div>
                </div>

                <div className="flex items-start gap-4 p-4 border-l-4 border-purple-500 bg-purple-50">
                  <div className="w-6 h-6 bg-purple-500 rounded-full flex items-center justify-center text-white text-sm font-semibold flex-shrink-0">
                    3
                  </div>
                  <div className="space-y-2">
                    <h3 className="font-semibold">Upload Your First Recording</h3>
                    <p className="text-sm text-gray-600">
                      Upload a sales call recording and watch it automatically sync to your prospects in Outreach.
                    </p>
                  </div>
                </div>
              </div>
            </CardContent>
          </Card>

          <Card>
            <CardHeader>
              <CardTitle>Permissions Required</CardTitle>
              <CardDescription>What access the integration needs</CardDescription>
            </CardHeader>
            <CardContent>
              <div className="grid md:grid-cols-2 gap-4">
                <div className="space-y-3">
                  <h4 className="font-semibold text-green-700">✅ Read Access</h4>
                  <ul className="text-sm text-gray-600 space-y-1">
                    <li>• View prospects and their details</li>
                    <li>• Search prospect database</li>
                    <li>• Read account information</li>
                    <li>• Access user profile</li>
                  </ul>
                </div>
                <div className="space-y-3">
                  <h4 className="font-semibold text-blue-700">📝 Write Access</h4>
                  <ul className="text-sm text-gray-600 space-y-1">
                    <li>• Create call activities</li>
                    <li>• Add notes to prospects</li>
                    <li>• Update activity records</li>
                    <li>• Log call outcomes</li>
                  </ul>
                </div>
              </div>
              
              <Alert className="mt-4">
                <Shield className="h-4 w-4" />
                <AlertDescription>
                  <strong>Security:</strong> Your Outreach credentials are encrypted and stored securely. 
                  You can disconnect at any time from the integration settings.
                </AlertDescription>
              </Alert>
            </CardContent>
          </Card>
        </TabsContent>

        {/* Features */}
        <TabsContent value="features" className="space-y-6">
          <div className="grid md:grid-cols-2 gap-6">
            <Card>
              <CardHeader>
                <CardTitle className="flex items-center gap-2">
                  <Zap className="h-5 w-5 text-blue-600" />
                  Automatic Sync
                </CardTitle>
              </CardHeader>
              <CardContent className="space-y-3">
                <p className="text-sm text-gray-600">
                  When you upload a recording, the system automatically:
                </p>
                <ul className="text-sm space-y-1 ml-4">
                  <li>• Extracts email addresses from the transcript</li>
                  <li>• Searches for matching prospects in Outreach</li>
                  <li>• Creates call activities with AI summaries</li>
                  <li>• Adds key insights and next steps</li>
                  <li>• Includes coaching scores if available</li>
                </ul>
                <Badge className="bg-green-100 text-green-800">Fully Automated</Badge>
              </CardContent>
            </Card>

            <Card>
              <CardHeader>
                <CardTitle className="flex items-center gap-2">
                  <Users className="h-5 w-5 text-purple-600" />
                  Manual Mapping
                </CardTitle>
              </CardHeader>
              <CardContent className="space-y-3">
                <p className="text-sm text-gray-600">
                  For more control, manually map call participants:
                </p>
                <ul className="text-sm space-y-1 ml-4">
                  <li>• Search for specific prospects</li>
                  <li>• Map multiple speakers to different prospects</li>
                  <li>• Handle calls with non-customers</li>
                  <li>• Override automatic prospect detection</li>
                  <li>• Ensure accuracy for complex calls</li>
                </ul>
                <Badge className="bg-purple-100 text-purple-800">User Controlled</Badge>
              </CardContent>
            </Card>

            <Card>
              <CardHeader>
                <CardTitle className="flex items-center gap-2">
                  <RefreshCw className="h-5 w-5 text-orange-600" />
                  Bulk Operations
                </CardTitle>
              </CardHeader>
              <CardContent className="space-y-3">
                <p className="text-sm text-gray-600">
                  Sync multiple recordings at once:
                </p>
                <ul className="text-sm space-y-1 ml-4">
                  <li>• Select multiple completed recordings</li>
                  <li>• Batch sync with progress tracking</li>
                  <li>• Pause and resume operations</li>
                  <li>• View detailed sync results</li>
                  <li>• Handle errors gracefully</li>
                </ul>
                <Badge className="bg-orange-100 text-orange-800">Batch Processing</Badge>
              </CardContent>
            </Card>

            <Card>
              <CardHeader>
                <CardTitle className="flex items-center gap-2">
                  <CheckCircle className="h-5 w-5 text-green-600" />
                  Sync Status
                </CardTitle>
              </CardHeader>
              <CardContent className="space-y-3">
                <p className="text-sm text-gray-600">
                  Always know what's happening:
                </p>
                <ul className="text-sm space-y-1 ml-4">
                  <li>• Visual sync status on recording cards</li>
                  <li>• Detailed sync history and logs</li>
                  <li>• Error messages with solutions</li>
                  <li>• Re-sync failed recordings</li>
                  <li>• View created activities in Outreach</li>
                </ul>
                <Badge className="bg-green-100 text-green-800">Full Visibility</Badge>
              </CardContent>
            </Card>
          </div>
        </TabsContent>

        {/* Workflow */}
        <TabsContent value="workflow" className="space-y-6">
          <Card>
            <CardHeader>
              <CardTitle>Typical User Workflow</CardTitle>
              <CardDescription>How the integration works in your daily routine</CardDescription>
            </CardHeader>
            <CardContent>
              <div className="space-y-6">
                {[
                  {
                    step: 1,
                    title: "Conduct Sales Call",
                    description: "Have your normal sales conversation with prospects",
                    icon: <FileAudio className="h-4 w-4" />,
                    color: "blue"
                  },
                  {
                    step: 2,
                    title: "Upload Recording",
                    description: "Upload the call recording to Echo AI Scribe for processing",
                    icon: <RefreshCw className="h-4 w-4" />,
                    color: "green"
                  },
                  {
                    step: 3,
                    title: "AI Processing",
                    description: "System transcribes, analyzes, and generates insights automatically",
                    icon: <Zap className="h-4 w-4" />,
                    color: "purple"
                  },
                  {
                    step: 4,
                    title: "Automatic Sync",
                    description: "Prospects are identified and activities created in Outreach",
                    icon: <CheckCircle className="h-4 w-4" />,
                    color: "orange"
                  },
                  {
                    step: 5,
                    title: "Review & Follow Up",
                    description: "Access detailed insights and take action on next steps",
                    icon: <ArrowRight className="h-4 w-4" />,
                    color: "red"
                  }
                ].map((item, index) => (
                  <div key={index} className="flex items-start gap-4">
                    <div className={`w-10 h-10 rounded-full flex items-center justify-center text-white bg-${item.color}-500`}>
                      {item.icon}
                    </div>
                    <div className="flex-1 space-y-1">
                      <h3 className="font-semibold flex items-center gap-2">
                        Step {item.step}: {item.title}
                      </h3>
                      <p className="text-sm text-gray-600">{item.description}</p>
                    </div>
                  </div>
                ))}
              </div>
            </CardContent>
          </Card>

          <Card>
            <CardHeader>
              <CardTitle>What Gets Synced to Outreach</CardTitle>
            </CardHeader>
            <CardContent>
              <div className="grid md:grid-cols-2 gap-6">
                <div className="space-y-4">
                  <h4 className="font-semibold text-blue-700">Call Activity Details</h4>
                  <div className="space-y-2 text-sm">
                    <div className="flex items-start gap-2">
                      <CheckCircle className="h-3 w-3 text-green-600 mt-0.5 flex-shrink-0" />
                      <span>Call subject with recording title</span>
                    </div>
                    <div className="flex items-start gap-2">
                      <CheckCircle className="h-3 w-3 text-green-600 mt-0.5 flex-shrink-0" />
                      <span>Call duration and timestamp</span>
                    </div>
                    <div className="flex items-start gap-2">
                      <CheckCircle className="h-3 w-3 text-green-600 mt-0.5 flex-shrink-0" />
                      <span>AI-generated call summary</span>
                    </div>
                    <div className="flex items-start gap-2">
                      <CheckCircle className="h-3 w-3 text-green-600 mt-0.5 flex-shrink-0" />
                      <span>Key discussion points</span>
                    </div>
                    <div className="flex items-start gap-2">
                      <CheckCircle className="h-3 w-3 text-green-600 mt-0.5 flex-shrink-0" />
                      <span>Identified next steps</span>
                    </div>
                  </div>
                </div>
                
                <div className="space-y-4">
                  <h4 className="font-semibold text-purple-700">Coaching Insights</h4>
                  <div className="space-y-2 text-sm">
                    <div className="flex items-start gap-2">
                      <CheckCircle className="h-3 w-3 text-green-600 mt-0.5 flex-shrink-0" />
                      <span>Overall coaching score</span>
                    </div>
                    <div className="flex items-start gap-2">
                      <CheckCircle className="h-3 w-3 text-green-600 mt-0.5 flex-shrink-0" />
                      <span>Areas for improvement</span>
                    </div>
                    <div className="flex items-start gap-2">
                      <CheckCircle className="h-3 w-3 text-green-600 mt-0.5 flex-shrink-0" />
                      <span>Performance feedback</span>
                    </div>
                    <div className="flex items-start gap-2">
                      <CheckCircle className="h-3 w-3 text-green-600 mt-0.5 flex-shrink-0" />
                      <span>Conversation analysis</span>
                    </div>
                    <div className="flex items-start gap-2">
                      <CheckCircle className="h-3 w-3 text-green-600 mt-0.5 flex-shrink-0" />
                      <span>Echo AI Scribe attribution</span>
                    </div>
                  </div>
                </div>
              </div>
            </CardContent>
          </Card>
        </TabsContent>

        {/* Troubleshooting */}
        <TabsContent value="troubleshooting" className="space-y-6">
          <Card>
            <CardHeader>
              <CardTitle>Common Issues & Solutions</CardTitle>
            </CardHeader>
            <CardContent className="space-y-4">
              <div className="space-y-4">
                <div className="p-4 border-l-4 border-red-500 bg-red-50">
                  <h4 className="font-semibold text-red-800">❌ No Prospects Found</h4>
                  <p className="text-sm text-red-700 mt-1">
                    The system couldn't find matching prospects for call participants.
                  </p>
                  <div className="mt-2 text-sm">
                    <strong>Solutions:</strong>
                    <ul className="mt-1 ml-4 space-y-1">
                      <li>• Use manual prospect mapping</li>
                      <li>• Ensure prospect emails are mentioned in the call</li>
                      <li>• Check if prospects exist in your Outreach database</li>
                      <li>• Verify email addresses are spelled correctly</li>
                    </ul>
                  </div>
                </div>

                <div className="p-4 border-l-4 border-yellow-500 bg-yellow-50">
                  <h4 className="font-semibold text-yellow-800">⚠️ Sync Failed</h4>
                  <p className="text-sm text-yellow-700 mt-1">
                    The recording failed to sync to Outreach.
                  </p>
                  <div className="mt-2 text-sm">
                    <strong>Solutions:</strong>
                    <ul className="mt-1 ml-4 space-y-1">
                      <li>• Check your Outreach connection status</li>
                      <li>• Try re-syncing the recording</li>
                      <li>• Verify you have permission to create activities</li>
                      <li>• Contact support if the issue persists</li>
                    </ul>
                  </div>
                </div>

                <div className="p-4 border-l-4 border-blue-500 bg-blue-50">
                  <h4 className="font-semibold text-blue-800">🔄 Token Expired</h4>
                  <p className="text-sm text-blue-700 mt-1">
                    Your Outreach connection has expired and needs to be refreshed.
                  </p>
                  <div className="mt-2 text-sm">
                    <strong>Solutions:</strong>
                    <ul className="mt-1 ml-4 space-y-1">
                      <li>• The system will automatically try to refresh tokens</li>
                      <li>• If automatic refresh fails, reconnect your account</li>
                      <li>• Go to integration settings and click "Connect"</li>
                    </ul>
                  </div>
                </div>
              </div>
            </CardContent>
          </Card>

          <Card>
            <CardHeader>
              <CardTitle>Support & Resources</CardTitle>
            </CardHeader>
            <CardContent className="space-y-4">
              <div className="grid md:grid-cols-2 gap-4">
                <div className="space-y-3">
                  <h4 className="font-semibold">🔧 Self-Service Tools</h4>
                  <div className="space-y-2">
                    <Button 
                      variant="outline" 
                      size="sm"
                      onClick={() => window.open('/integrations/outreach/test', '_blank')}
                    >
                      <Settings className="h-3 w-3 mr-1" />
                      Run Integration Tests
                    </Button>
                    <Button 
                      variant="outline" 
                      size="sm"
                      onClick={() => window.open('/integrations/outreach/connect', '_blank')}
                    >
                      <RefreshCw className="h-3 w-3 mr-1" />
                      Reconnect Account
                    </Button>
                  </div>
                </div>
                
                <div className="space-y-3">
                  <h4 className="font-semibold">📞 Get Help</h4>
                  <div className="space-y-2 text-sm">
                    <p>• Check the integration test page for diagnostics</p>
                    <p>• Review sync logs for detailed error messages</p>
                    <p>• Contact support with specific error details</p>
                    <p>• Include your Outreach account email when reaching out</p>
                  </div>
                </div>
              </div>
            </CardContent>
          </Card>
        </TabsContent>
      </Tabs>
    </div>
  );
}