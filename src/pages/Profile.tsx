import React, { useState } from 'react';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { 
  User,
  Phone,
  Settings,
  BarChart3,
  Calendar,
  Mail,
  Building,
  Shield,
  Bell,
  Download
} from 'lucide-react';
import { useAuth } from '@/hooks/useAuth';
import OutreachCallHistory from '@/components/profile/OutreachCallHistory';
import StandardLayout from '@/components/layout/StandardLayout';

export default function Profile() {
  const { user } = useAuth();
  const [activeTab, setActiveTab] = useState('overview');

  if (!user) {
    return (
      <StandardLayout activeSection="dashboard">
        <div className="container max-w-4xl mx-auto p-6">
          <div className="text-center py-12">
            <User className="h-12 w-12 text-gray-400 mx-auto mb-4" />
            <h3 className="text-lg font-medium text-gray-900 mb-2">Please Sign In</h3>
            <p className="text-gray-600">Sign in to view your profile and call history.</p>
          </div>
        </div>
      </StandardLayout>
    );
  }

  return (
    <StandardLayout activeSection="dashboard">
      <div className="container max-w-6xl mx-auto p-6 space-y-6">
        {/* Header */}
        <div className="flex items-center justify-between">
          <div>
            <h1 className="text-2xl font-bold text-gray-900 flex items-center gap-3">
              <User className="h-6 w-6 text-blue-600" />
              My Profile
            </h1>
            <p className="text-gray-600 mt-1">
              Manage your account settings and view your activity
            </p>
          </div>
          
          <Button variant="outline">
            <Settings className="h-4 w-4 mr-2" />
            Account Settings
          </Button>
        </div>

        <Tabs value={activeTab} onValueChange={setActiveTab} className="space-y-6">
          <TabsList className="grid w-full grid-cols-4">
            <TabsTrigger value="overview">Overview</TabsTrigger>
            <TabsTrigger value="outreach-calls">Outreach Calls</TabsTrigger>
            <TabsTrigger value="activity">Activity</TabsTrigger>
            <TabsTrigger value="preferences">Preferences</TabsTrigger>
          </TabsList>

          {/* Overview Tab */}
          <TabsContent value="overview" className="space-y-6">
            <div className="grid md:grid-cols-3 gap-6">
              {/* Profile Info */}
              <Card className="md:col-span-2">
                <CardHeader>
                  <CardTitle>Profile Information</CardTitle>
                  <CardDescription>
                    Your account details and contact information
                  </CardDescription>
                </CardHeader>
                <CardContent className="space-y-4">
                  <div className="flex items-center gap-4">
                    <div className="w-16 h-16 bg-gradient-to-r from-blue-500 to-purple-600 rounded-full flex items-center justify-center text-white text-xl font-semibold">
                      {user.email?.charAt(0).toUpperCase()}
                    </div>
                    <div>
                      <h3 className="text-lg font-semibold">{user.user_metadata?.name || 'User'}</h3>
                      <p className="text-gray-600">{user.email}</p>
                      <div className="flex items-center gap-2 mt-1">
                        <Badge className="bg-green-100 text-green-800">Active</Badge>
                        <Badge variant="outline">Standard User</Badge>
                      </div>
                    </div>
                  </div>
                  
                  <div className="grid md:grid-cols-2 gap-4 pt-4 border-t">
                    <div>
                      <label className="text-sm font-medium text-gray-600">Email</label>
                      <div className="flex items-center gap-2 mt-1">
                        <Mail className="h-4 w-4 text-gray-400" />
                        <span className="text-sm">{user.email}</span>
                      </div>
                    </div>
                    
                    <div>
                      <label className="text-sm font-medium text-gray-600">Account Created</label>
                      <div className="flex items-center gap-2 mt-1">
                        <Calendar className="h-4 w-4 text-gray-400" />
                        <span className="text-sm">
                          {new Date(user.created_at).toLocaleDateString()}
                        </span>
                      </div>
                    </div>
                    
                    <div>
                      <label className="text-sm font-medium text-gray-600">Organization</label>
                      <div className="flex items-center gap-2 mt-1">
                        <Building className="h-4 w-4 text-gray-400" />
                        <span className="text-sm">
                          {user.email?.split('@')[1] || 'Not specified'}
                        </span>
                      </div>
                    </div>
                    
                    <div>
                      <label className="text-sm font-medium text-gray-600">Role</label>
                      <div className="flex items-center gap-2 mt-1">
                        <Shield className="h-4 w-4 text-gray-400" />
                        <span className="text-sm">
                          {user.user_metadata?.role || 'User'}
                        </span>
                      </div>
                    </div>
                  </div>
                </CardContent>
              </Card>

              {/* Quick Stats */}
              <div className="space-y-4">
                <Card>
                  <CardContent className="p-4">
                    <div className="flex items-center gap-2 mb-2">
                      <Phone className="h-4 w-4 text-blue-600" />
                      <span className="text-sm font-medium">Outreach Calls</span>
                    </div>
                    <p className="text-2xl font-bold">-</p>
                    <p className="text-xs text-gray-500">This month</p>
                  </CardContent>
                </Card>
                
                <Card>
                  <CardContent className="p-4">
                    <div className="flex items-center gap-2 mb-2">
                      <BarChart3 className="h-4 w-4 text-green-600" />
                      <span className="text-sm font-medium">Recordings</span>
                    </div>
                    <p className="text-2xl font-bold">-</p>
                    <p className="text-xs text-gray-500">Total uploaded</p>
                  </CardContent>
                </Card>
                
                <Card>
                  <CardContent className="p-4">
                    <div className="flex items-center gap-2 mb-2">
                      <Calendar className="h-4 w-4 text-purple-600" />
                      <span className="text-sm font-medium">Last Activity</span>
                    </div>
                    <p className="text-sm font-bold">Today</p>
                    <p className="text-xs text-gray-500">Profile view</p>
                  </CardContent>
                </Card>
              </div>
            </div>
          </TabsContent>

          {/* Outreach Calls Tab */}
          <TabsContent value="outreach-calls" className="space-y-6">
            <OutreachCallHistory recordings={[]} />
          </TabsContent>

          {/* Activity Tab */}
          <TabsContent value="activity" className="space-y-6">
            <Card>
              <CardHeader>
                <CardTitle>Recent Activity</CardTitle>
                <CardDescription>
                  Your recent actions and system events
                </CardDescription>
              </CardHeader>
              <CardContent>
                <div className="text-center py-12">
                  <BarChart3 className="h-12 w-12 text-gray-400 mx-auto mb-4" />
                  <h3 className="text-lg font-medium text-gray-900 mb-2">No Activity Yet</h3>
                  <p className="text-gray-600">
                    Your activity history will appear here as you use the system.
                  </p>
                </div>
              </CardContent>
            </Card>
          </TabsContent>

          {/* Preferences Tab */}
          <TabsContent value="preferences" className="space-y-6">
            <div className="grid md:grid-cols-2 gap-6">
              <Card>
                <CardHeader>
                  <CardTitle>Notification Preferences</CardTitle>
                  <CardDescription>
                    Configure how you receive notifications
                  </CardDescription>
                </CardHeader>
                <CardContent className="space-y-4">
                  <div className="flex items-center justify-between">
                    <div className="flex items-center gap-2">
                      <Bell className="h-4 w-4 text-gray-600" />
                      <span className="text-sm">Email notifications</span>
                    </div>
                    <Badge variant="outline">Enabled</Badge>
                  </div>
                  
                  <div className="flex items-center justify-between">
                    <div className="flex items-center gap-2">
                      <Phone className="h-4 w-4 text-gray-600" />
                      <span className="text-sm">Call sync notifications</span>
                    </div>
                    <Badge variant="outline">Enabled</Badge>
                  </div>
                  
                  <div className="flex items-center justify-between">
                    <div className="flex items-center gap-2">
                      <BarChart3 className="h-4 w-4 text-gray-600" />
                      <span className="text-sm">Weekly reports</span>
                    </div>
                    <Badge variant="outline">Disabled</Badge>
                  </div>
                </CardContent>
              </Card>

              <Card>
                <CardHeader>
                  <CardTitle>Data & Privacy</CardTitle>
                  <CardDescription>
                    Manage your data and privacy settings
                  </CardDescription>
                </CardHeader>
                <CardContent className="space-y-4">
                  <div className="flex items-center justify-between">
                    <div className="flex items-center gap-2">
                      <Download className="h-4 w-4 text-gray-600" />
                      <span className="text-sm">Export my data</span>
                    </div>
                    <Button variant="outline" size="sm">
                      Request
                    </Button>
                  </div>
                  
                  <div className="flex items-center justify-between">
                    <div className="flex items-center gap-2">
                      <Shield className="h-4 w-4 text-gray-600" />
                      <span className="text-sm">Data retention</span>
                    </div>
                    <Badge variant="outline">90 days</Badge>
                  </div>
                  
                  <div className="flex items-center justify-between">
                    <div className="flex items-center gap-2">
                      <User className="h-4 w-4 text-gray-600" />
                      <span className="text-sm">Profile visibility</span>
                    </div>
                    <Badge variant="outline">Organization</Badge>
                  </div>
                </CardContent>
              </Card>
            </div>
          </TabsContent>
        </Tabs>
      </div>
    </StandardLayout>
  );
}