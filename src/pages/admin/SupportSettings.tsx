import React, { useState } from 'react';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Label } from '@/components/ui/label';
import { Switch } from '@/components/ui/switch';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import {
  Settings,
  Eye,
  EyeOff,
  Info,
  CheckCircle,
  XCircle,
  Heart,
  Clock,
  Shield,
  TrendingUp,
  Save,
  AlertCircle
} from 'lucide-react';
import { useSupportModeShowScores } from '@/hooks/useOrganizationSettings';
import { cn } from '@/lib/utils';
import { Alert, AlertDescription, AlertTitle } from '@/components/ui/alert';

export default function SupportSettings() {
  const {
    showScores,
    isLoading,
    updateShowScores,
    isUpdating
  } = useSupportModeShowScores();

  const [localShowScores, setLocalShowScores] = useState(showScores);
  const [showPreview, setShowPreview] = useState(false);
  const [saveSuccess, setSaveSuccess] = useState(false);

  // Sync local state when data loads
  React.useEffect(() => {
    setLocalShowScores(showScores);
  }, [showScores]);

  const handleSave = () => {
    updateShowScores(localShowScores, {
      onSuccess: () => {
        setSaveSuccess(true);
        setTimeout(() => setSaveSuccess(false), 3000);
      },
    });
  };

  const hasChanges = localShowScores !== showScores;

  return (
    <div className="h-full overflow-auto bg-eci-admin-bg p-6">
      <div className="max-w-5xl mx-auto space-y-6">
        {/* Header */}
        <div className="flex items-center justify-between">
          <div>
            <h1 className="text-2xl font-bold text-eci-gray-900 flex items-center gap-3">
              <Settings className="w-7 h-7 text-eci-red" />
              Support Mode Settings
            </h1>
            <p className="text-sm text-eci-gray-600 mt-1">
              Configure how ECI Quality Framework analysis is displayed for support calls
            </p>
          </div>
          {hasChanges && (
            <Button
              onClick={handleSave}
              disabled={isUpdating}
              className="gap-2"
            >
              <Save className="w-4 h-4" />
              {isUpdating ? 'Saving...' : 'Save Changes'}
            </Button>
          )}
        </div>

        {/* Success Alert */}
        {saveSuccess && (
          <Alert className="border-green-200 bg-green-50">
            <CheckCircle className="h-4 w-4 text-green-600" />
            <AlertTitle className="text-green-800">Settings saved successfully</AlertTitle>
            <AlertDescription className="text-green-700">
              Your support mode display preferences have been updated.
            </AlertDescription>
          </Alert>
        )}

        {/* Main Settings Card */}
        <Card>
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <Eye className="w-5 h-5 text-blue-600" />
              Score Display Settings
            </CardTitle>
            <CardDescription>
              Control whether numerical scores and percentages are visible in support mode coaching insights
            </CardDescription>
          </CardHeader>
          <CardContent className="space-y-6">
            {/* Toggle Setting */}
            <div className="flex items-center justify-between p-4 border border-eci-gray-200 rounded-lg bg-white">
              <div className="space-y-1 flex-1">
                <Label htmlFor="show-scores" className="text-base font-medium">
                  Display ECI Scores in Support Mode
                </Label>
                <p className="text-sm text-eci-gray-600">
                  When enabled, support stakeholders will see numerical scores and percentages alongside coaching insights
                </p>
              </div>
              <Switch
                id="show-scores"
                checked={localShowScores}
                onCheckedChange={setLocalShowScores}
                disabled={isLoading}
              />
            </div>

            {/* Info Box */}
            <div className="bg-blue-50 dark:bg-blue-950/20 border border-blue-200 rounded-lg p-4">
              <div className="flex items-start gap-3">
                <Info className="w-5 h-5 text-blue-600 mt-0.5 flex-shrink-0" />
                <div className="space-y-2">
                  <h4 className="font-medium text-blue-800">Understanding the Display Modes</h4>
                  <div className="text-sm text-blue-700 space-y-2">
                    <div className="flex items-start gap-2">
                      <div className="font-medium min-w-[100px]">Scores ON:</div>
                      <div>Shows percentages, color-coded ratings, and Y/N/U counts. Focus is on measurable performance metrics.</div>
                    </div>
                    <div className="flex items-start gap-2">
                      <div className="font-medium min-w-[100px]">Scores OFF:</div>
                      <div>Hides numerical data. Emphasizes qualitative coaching recommendations and improvement areas.</div>
                    </div>
                  </div>
                </div>
              </div>
            </div>

            {/* Preview Toggle */}
            <div className="pt-4 border-t border-eci-gray-200">
              <Button
                variant="outline"
                onClick={() => setShowPreview(!showPreview)}
                className="gap-2"
              >
                {showPreview ? (
                  <>
                    <EyeOff className="w-4 h-4" />
                    Hide Preview
                  </>
                ) : (
                  <>
                    <Eye className="w-4 h-4" />
                    Show Preview
                  </>
                )}
              </Button>
            </div>
          </CardContent>
        </Card>

        {/* Preview Cards */}
        {showPreview && (
          <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
            {/* Scores ON Preview */}
            <Card className="border-2 border-green-200">
              <CardHeader className="bg-green-50 dark:bg-green-950/20">
                <CardTitle className="text-lg flex items-center gap-2">
                  <CheckCircle className="w-5 h-5 text-green-600" />
                  Scores Enabled
                </CardTitle>
                <CardDescription>What support teams see with scores ON</CardDescription>
              </CardHeader>
              <CardContent className="pt-4 space-y-3">
                {/* Mock ECI Section */}
                <div className="border border-gray-200 rounded-lg bg-white">
                  <div className="p-3 bg-gray-50 rounded-t-lg">
                    <div className="flex items-center justify-between mb-2">
                      <div className="flex items-center gap-2">
                        <Heart className="w-4 h-4 text-green-600" />
                        <span className="font-semibold text-sm">Care for Customer</span>
                      </div>
                      <div className="flex items-center gap-2">
                        <Badge className="bg-green-100 text-green-800 border-green-200">
                          75%
                        </Badge>
                        <span className="text-xs text-gray-500">5Y / 2N / 1U</span>
                      </div>
                    </div>
                    <p className="text-xs text-gray-500">Weight: 60% of overall ECI score</p>
                  </div>
                </div>

                <div className="border border-gray-200 rounded-lg bg-white">
                  <div className="p-3 bg-gray-50 rounded-t-lg">
                    <div className="flex items-center justify-between mb-2">
                      <div className="flex items-center gap-2">
                        <CheckCircle className="w-4 h-4 text-blue-600" />
                        <span className="font-semibold text-sm">Call Resolution</span>
                      </div>
                      <div className="flex items-center gap-2">
                        <Badge className="bg-yellow-100 text-yellow-800 border-yellow-200">
                          60%
                        </Badge>
                        <span className="text-xs text-gray-500">3Y / 2N / 0U</span>
                      </div>
                    </div>
                    <p className="text-xs text-gray-500">Weight: 30% of overall ECI score</p>
                  </div>
                </div>

                <div className="bg-blue-50 p-3 rounded-lg text-xs text-blue-700">
                  <strong>Focus:</strong> Metrics and measurable performance indicators
                </div>
              </CardContent>
            </Card>

            {/* Scores OFF Preview */}
            <Card className="border-2 border-orange-200">
              <CardHeader className="bg-orange-50 dark:bg-orange-950/20">
                <CardTitle className="text-lg flex items-center gap-2">
                  <XCircle className="w-5 h-5 text-orange-600" />
                  Scores Disabled
                </CardTitle>
                <CardDescription>What support teams see with scores OFF</CardDescription>
              </CardHeader>
              <CardContent className="pt-4 space-y-3">
                {/* Mock ECI Section without scores */}
                <div className="border border-gray-200 rounded-lg bg-white">
                  <div className="p-3 flex items-center justify-between bg-gray-50 rounded-t-lg">
                    <div className="flex items-center gap-2">
                      <Heart className="w-4 h-4 text-green-600" />
                      <span className="font-semibold text-sm">Care for Customer</span>
                    </div>
                    <Badge variant="outline" className="text-green-700">
                      Strong Performance
                    </Badge>
                  </div>
                </div>

                <div className="border border-gray-200 rounded-lg bg-white">
                  <div className="p-3 flex items-center justify-between bg-gray-50 rounded-t-lg">
                    <div className="flex items-center gap-2">
                      <CheckCircle className="w-4 h-4 text-blue-600" />
                      <span className="font-semibold text-sm">Call Resolution</span>
                    </div>
                    <Badge variant="outline" className="text-orange-700">
                      Needs Improvement
                    </Badge>
                  </div>
                </div>

                <div className="bg-orange-50 p-3 rounded-lg text-xs text-orange-700">
                  <strong>Focus:</strong> Coaching insights and qualitative feedback
                </div>
              </CardContent>
            </Card>
          </div>
        )}

        {/* Use Cases Card */}
        <Card>
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <TrendingUp className="w-5 h-5 text-purple-600" />
              When to Use Each Mode
            </CardTitle>
          </CardHeader>
          <CardContent>
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              <div className="p-4 border border-green-200 rounded-lg bg-green-50 dark:bg-green-950/20">
                <h4 className="font-semibold text-green-800 mb-2 flex items-center gap-2">
                  <CheckCircle className="w-4 h-4" />
                  Enable Scores For:
                </h4>
                <ul className="text-sm text-green-700 space-y-1">
                  <li>• Performance review preparation</li>
                  <li>• Manager-led coaching sessions</li>
                  <li>• Quality assurance analysis</li>
                  <li>• Team benchmarking and comparisons</li>
                </ul>
              </div>

              <div className="p-4 border border-orange-200 rounded-lg bg-orange-50 dark:bg-orange-950/20">
                <h4 className="font-semibold text-orange-800 mb-2 flex items-center gap-2">
                  <XCircle className="w-4 h-4" />
                  Disable Scores For:
                </h4>
                <ul className="text-sm text-orange-700 space-y-1">
                  <li>• Self-guided improvement focus</li>
                  <li>• Reducing evaluation anxiety</li>
                  <li>• Emphasizing qualitative growth</li>
                  <li>• Coaching-first culture environments</li>
                </ul>
              </div>
            </div>
          </CardContent>
        </Card>

        {/* Impact Notice */}
        <Alert>
          <AlertCircle className="h-4 w-4" />
          <AlertTitle>Organization-Wide Setting</AlertTitle>
          <AlertDescription>
            This setting applies to all support mode recordings across your organization.
            Changes take effect immediately for all users.
          </AlertDescription>
        </Alert>
      </div>
    </div>
  );
}
