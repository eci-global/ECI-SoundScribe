import React, { useState } from 'react';
import { Card } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Switch } from '@/components/ui/switch';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { 
  Shield, 
  Lock, 
  Trash2, 
  Calendar, 
  Eye, 
  EyeOff,
  AlertTriangle,
  Save,
  RefreshCw
} from 'lucide-react';
import { useToast } from '@/hooks/use-toast';

interface RetentionPolicy {
  id: string;
  dataType: string;
  retentionDays: number;
  autoDelete: boolean;
  lastPurge?: string;
}

interface PrivacyConfig {
  gdprCompliance: boolean;
  ccpaCompliance: boolean;
  dataEncryption: boolean;
  anonymizeData: boolean;
  consentRequired: boolean;
  auditLogging: boolean;
  rightToDelete: boolean;
  dataPortability: boolean;
}

export default function PrivacySettings() {
  const { toast } = useToast();
  
  const [privacyConfig, setPrivacyConfig] = useState<PrivacyConfig>({
    gdprCompliance: true,
    ccpaCompliance: true,
    dataEncryption: true,
    anonymizeData: false,
    consentRequired: true,
    auditLogging: true,
    rightToDelete: true,
    dataPortability: true
  });

  const [retentionPolicies, setRetentionPolicies] = useState<RetentionPolicy[]>([
    { id: '1', dataType: 'Recordings', retentionDays: 365, autoDelete: true, lastPurge: '2025-01-15T00:00:00Z' },
    { id: '2', dataType: 'Transcripts', retentionDays: 730, autoDelete: true, lastPurge: '2025-01-15T00:00:00Z' },
    { id: '3', dataType: 'User Activity Logs', retentionDays: 90, autoDelete: true, lastPurge: '2025-01-18T00:00:00Z' },
    { id: '4', dataType: 'System Logs', retentionDays: 30, autoDelete: true, lastPurge: '2025-01-20T00:00:00Z' },
    { id: '5', dataType: 'Analytics Data', retentionDays: 180, autoDelete: false }
  ]);

  const handleConfigToggle = (key: keyof PrivacyConfig) => {
    setPrivacyConfig(prev => ({ ...prev, [key]: !prev[key] }));
  };

  const handleRetentionUpdate = (id: string, field: keyof RetentionPolicy, value: any) => {
    setRetentionPolicies(prev => prev.map(policy =>
      policy.id === id ? { ...policy, [field]: value } : policy
    ));
  };

  const handleSaveSettings = () => {
    toast({
      title: "Privacy settings saved",
      description: "Your privacy configuration has been updated successfully."
    });
  };

  const handlePurgeData = (dataType: string) => {
    toast({
      title: "Data purge initiated",
      description: `Purging ${dataType} according to retention policy...`,
      variant: "destructive"
    });
  };

  return (
    
      <div className="h-full overflow-y-auto">
        <div className="max-w-7xl mx-auto p-8">
          <div className="mb-8">
            <h1 className="text-display text-eci-gray-900 mb-2">Privacy Settings</h1>
            <p className="text-body text-eci-gray-600">Configure data privacy and retention policies</p>
          </div>

          {/* Compliance Settings */}
          <Card className="bg-white shadow-sm p-6 mb-8">
            <div className="flex items-center gap-2 mb-6">
              <Shield className="h-6 w-6 text-eci-gray-400" />
              <h2 className="text-title font-semibold text-eci-gray-900">Compliance Configuration</h2>
            </div>

            <div className="grid grid-cols-2 gap-6">
              <div className="space-y-4">
                <div className="flex items-center justify-between">
                  <div>
                    <Label htmlFor="gdpr" className="text-body font-medium text-eci-gray-900">GDPR Compliance</Label>
                    <p className="text-caption text-eci-gray-600">Enable General Data Protection Regulation features</p>
                  </div>
                  <Switch
                    id="gdpr"
                    checked={privacyConfig.gdprCompliance}
                    onCheckedChange={() => handleConfigToggle('gdprCompliance')}
                  />
                </div>

                <div className="flex items-center justify-between">
                  <div>
                    <Label htmlFor="ccpa" className="text-body font-medium text-eci-gray-900">CCPA Compliance</Label>
                    <p className="text-caption text-eci-gray-600">Enable California Consumer Privacy Act features</p>
                  </div>
                  <Switch
                    id="ccpa"
                    checked={privacyConfig.ccpaCompliance}
                    onCheckedChange={() => handleConfigToggle('ccpaCompliance')}
                  />
                </div>

                <div className="flex items-center justify-between">
                  <div>
                    <Label htmlFor="encryption" className="text-body font-medium text-eci-gray-900">Data Encryption</Label>
                    <p className="text-caption text-eci-gray-600">Encrypt all sensitive data at rest</p>
                  </div>
                  <Switch
                    id="encryption"
                    checked={privacyConfig.dataEncryption}
                    onCheckedChange={() => handleConfigToggle('dataEncryption')}
                  />
                </div>

                <div className="flex items-center justify-between">
                  <div>
                    <Label htmlFor="anonymize" className="text-body font-medium text-eci-gray-900">Anonymize Data</Label>
                    <p className="text-caption text-eci-gray-600">Automatically anonymize personal information</p>
                  </div>
                  <Switch
                    id="anonymize"
                    checked={privacyConfig.anonymizeData}
                    onCheckedChange={() => handleConfigToggle('anonymizeData')}
                  />
                </div>
              </div>

              <div className="space-y-4">
                <div className="flex items-center justify-between">
                  <div>
                    <Label htmlFor="consent" className="text-body font-medium text-eci-gray-900">Consent Required</Label>
                    <p className="text-caption text-eci-gray-600">Require explicit consent for data collection</p>
                  </div>
                  <Switch
                    id="consent"
                    checked={privacyConfig.consentRequired}
                    onCheckedChange={() => handleConfigToggle('consentRequired')}
                  />
                </div>

                <div className="flex items-center justify-between">
                  <div>
                    <Label htmlFor="audit" className="text-body font-medium text-eci-gray-900">Audit Logging</Label>
                    <p className="text-caption text-eci-gray-600">Log all data access and modifications</p>
                  </div>
                  <Switch
                    id="audit"
                    checked={privacyConfig.auditLogging}
                    onCheckedChange={() => handleConfigToggle('auditLogging')}
                  />
                </div>

                <div className="flex items-center justify-between">
                  <div>
                    <Label htmlFor="delete" className="text-body font-medium text-eci-gray-900">Right to Delete</Label>
                    <p className="text-caption text-eci-gray-600">Allow users to request data deletion</p>
                  </div>
                  <Switch
                    id="delete"
                    checked={privacyConfig.rightToDelete}
                    onCheckedChange={() => handleConfigToggle('rightToDelete')}
                  />
                </div>

                <div className="flex items-center justify-between">
                  <div>
                    <Label htmlFor="portability" className="text-body font-medium text-eci-gray-900">Data Portability</Label>
                    <p className="text-caption text-eci-gray-600">Enable data export in standard formats</p>
                  </div>
                  <Switch
                    id="portability"
                    checked={privacyConfig.dataPortability}
                    onCheckedChange={() => handleConfigToggle('dataPortability')}
                  />
                </div>
              </div>
            </div>

            <div className="flex justify-end mt-6">
              <Button onClick={handleSaveSettings} className="flex items-center gap-2">
                <Save className="h-4 w-4" />
                Save Configuration
              </Button>
            </div>
          </Card>

          {/* Retention Policies */}
          <Card className="bg-white shadow-sm p-6">
            <div className="flex items-center gap-2 mb-6">
              <Calendar className="h-6 w-6 text-eci-gray-400" />
              <h2 className="text-title font-semibold text-eci-gray-900">Data Retention Policies</h2>
            </div>

            <div className="overflow-x-auto">
              <table className="w-full">
                <thead>
                  <tr className="border-b border-eci-gray-200">
                    <th className="text-left py-3 px-4 text-caption font-medium text-eci-gray-600">Data Type</th>
                    <th className="text-left py-3 px-4 text-caption font-medium text-eci-gray-600">Retention Period</th>
                    <th className="text-left py-3 px-4 text-caption font-medium text-eci-gray-600">Auto Delete</th>
                    <th className="text-left py-3 px-4 text-caption font-medium text-eci-gray-600">Last Purge</th>
                    <th className="text-right py-3 px-4 text-caption font-medium text-eci-gray-600">Actions</th>
                  </tr>
                </thead>
                <tbody>
                  {retentionPolicies.map((policy) => (
                    <tr key={policy.id} className="border-b border-eci-gray-100 hover:bg-eci-gray-50">
                      <td className="py-3 px-4">
                        <div className="flex items-center gap-2">
                          <Lock className="h-4 w-4 text-eci-gray-400" />
                          <span className="text-body font-medium text-eci-gray-900">{policy.dataType}</span>
                        </div>
                      </td>
                      <td className="py-3 px-4">
                        <div className="flex items-center gap-2">
                          <Input
                            type="number"
                            value={policy.retentionDays}
                            onChange={(e) => handleRetentionUpdate(policy.id, 'retentionDays', parseInt(e.target.value))}
                            className="w-20 h-8"
                            min="1"
                          />
                          <span className="text-body-small text-eci-gray-600">days</span>
                        </div>
                      </td>
                      <td className="py-3 px-4">
                        <Switch
                          checked={policy.autoDelete}
                          onCheckedChange={(checked) => handleRetentionUpdate(policy.id, 'autoDelete', checked)}
                        />
                      </td>
                      <td className="py-3 px-4">
                        {policy.lastPurge ? (
                          <span className="text-body-small text-eci-gray-600">
                            {new Date(policy.lastPurge).toLocaleDateString()}
                          </span>
                        ) : (
                          <span className="text-body-small text-eci-gray-400">Never</span>
                        )}
                      </td>
                      <td className="py-3 px-4 text-right">
                        <Button
                          variant="ghost"
                          size="sm"
                          onClick={() => handlePurgeData(policy.dataType)}
                          className="text-red-600 hover:text-red-700"
                        >
                          <Trash2 className="h-4 w-4 mr-1" />
                          Purge Now
                        </Button>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </Card>

          {/* Privacy Notice */}
          <Card className="bg-orange-50 border-orange-200 p-4 mt-6">
            <div className="flex items-start gap-3">
              <AlertTriangle className="h-5 w-5 text-orange-600 mt-0.5" />
              <div>
                <p className="text-body font-medium text-orange-900">Important Privacy Notice</p>
                <p className="text-body-small text-orange-800 mt-1">
                  Changes to privacy settings may affect system functionality and compliance status. 
                  Ensure all modifications align with your organization's privacy policies and applicable regulations.
                </p>
              </div>
            </div>
          </Card>
        </div>
      </div>
    
  );
}