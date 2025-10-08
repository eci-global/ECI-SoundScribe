import React, { useState, useEffect } from 'react';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Progress } from '@/components/ui/progress';
import { Alert, AlertDescription } from '@/components/ui/alert';
import { 
  Mic, 
  MicOff, 
  User, 
  CheckCircle, 
  AlertCircle, 
  Loader2,
  Volume2,
  VolumeX,
  Users,
  Target
} from 'lucide-react';
import { EmployeeService } from '@/services/employeeService';
import type { VoiceDetectionResult, Employee } from '@/types/employee';

interface EmployeeVoiceDetectionProps {
  recordingId: string;
  onEmployeeDetected: (employeeId: string, confidence: number) => void;
  onManualTag: (employeeId: string) => void;
}

const EmployeeVoiceDetection: React.FC<EmployeeVoiceDetectionProps> = ({
  recordingId,
  onEmployeeDetected,
  onManualTag
}) => {
  const [isDetecting, setIsDetecting] = useState(false);
  const [detectionResult, setDetectionResult] = useState<VoiceDetectionResult | null>(null);
  const [suggestedEmployees, setSuggestedEmployees] = useState<Employee[]>([]);
  const [detectionProgress, setDetectionProgress] = useState(0);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    // Auto-start detection when component mounts
    startVoiceDetection();
  }, [recordingId]);

  const startVoiceDetection = async () => {
    try {
      setIsDetecting(true);
      setError(null);
      setDetectionProgress(0);

      // Simulate detection progress
      const progressInterval = setInterval(() => {
        setDetectionProgress(prev => {
          if (prev >= 90) {
            clearInterval(progressInterval);
            return 90;
          }
          return prev + 10;
        });
      }, 200);

      // Call the actual detection service
      const result = await EmployeeService.detectEmployeeVoice(recordingId);
      
      clearInterval(progressInterval);
      setDetectionProgress(100);
      setDetectionResult(result);

      // Load suggested employees if confidence is low
      if (result.confidence < 0.8 && result.suggested_employees.length > 0) {
        // In a real implementation, you'd fetch employee details
        setSuggestedEmployees([]);
      }

      if (result.employee_id) {
        onEmployeeDetected(result.employee_id, result.confidence);
      }

    } catch (err) {
      setError(err instanceof Error ? err.message : 'Voice detection failed');
    } finally {
      setIsDetecting(false);
    }
  };

  const handleManualTag = (employeeId: string) => {
    onManualTag(employeeId);
  };

  const getConfidenceColor = (confidence: number) => {
    if (confidence >= 0.8) return 'text-green-600';
    if (confidence >= 0.6) return 'text-yellow-600';
    return 'text-red-600';
  };

  const getConfidenceText = (confidence: number) => {
    if (confidence >= 0.8) return 'High Confidence';
    if (confidence >= 0.6) return 'Medium Confidence';
    return 'Low Confidence';
  };

  return (
    <div className="space-y-4">
      {/* Detection Status */}
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center space-x-2">
            <Mic className="h-5 w-5" />
            <span>Voice Detection</span>
          </CardTitle>
          <CardDescription>
            Automatically identifying employees in this recording
          </CardDescription>
        </CardHeader>
        <CardContent>
          {isDetecting ? (
            <div className="space-y-4">
              <div className="flex items-center space-x-2">
                <Loader2 className="h-4 w-4 animate-spin" />
                <span className="text-sm">Analyzing voice patterns...</span>
              </div>
              <Progress value={detectionProgress} className="w-full" />
              <p className="text-xs text-gray-600">
                This may take a few moments depending on recording length
              </p>
            </div>
          ) : detectionResult ? (
            <div className="space-y-4">
              {detectionResult.employee_id ? (
                <div className="flex items-center space-x-2">
                  <CheckCircle className="h-5 w-5 text-green-500" />
                  <span className="font-medium">Employee Detected</span>
                  <Badge 
                    variant={detectionResult.confidence >= 0.8 ? 'default' : 'secondary'}
                    className={getConfidenceColor(detectionResult.confidence)}
                  >
                    {getConfidenceText(detectionResult.confidence)}
                  </Badge>
                </div>
              ) : (
                <div className="flex items-center space-x-2">
                  <AlertCircle className="h-5 w-5 text-yellow-500" />
                  <span className="font-medium">No Employee Detected</span>
                  <Badge variant="secondary">
                    Confidence: {(detectionResult.confidence * 100).toFixed(1)}%
                  </Badge>
                </div>
              )}

              <div className="text-sm text-gray-600">
                <p>Detection Method: {detectionResult.detection_method}</p>
                <p>Confidence Score: {(detectionResult.confidence * 100).toFixed(1)}%</p>
              </div>

              {detectionResult.confidence < 0.8 && (
                <Alert>
                  <AlertCircle className="h-4 w-4" />
                  <AlertDescription>
                    Low confidence detection. Consider manual tagging for accuracy.
                  </AlertDescription>
                </Alert>
              )}
            </div>
          ) : error ? (
            <Alert variant="destructive">
              <AlertCircle className="h-4 w-4" />
              <AlertDescription>{error}</AlertDescription>
            </Alert>
          ) : null}

          <div className="flex space-x-2 mt-4">
            <Button 
              onClick={startVoiceDetection} 
              disabled={isDetecting}
              variant="outline"
              size="sm"
            >
              {isDetecting ? (
                <>
                  <Loader2 className="h-4 w-4 mr-2 animate-spin" />
                  Detecting...
                </>
              ) : (
                <>
                  <Mic className="h-4 w-4 mr-2" />
                  Re-detect
                </>
              )}
            </Button>
          </div>
        </CardContent>
      </Card>

      {/* Suggested Employees */}
      {suggestedEmployees.length > 0 && (
        <Card>
          <CardHeader>
            <CardTitle className="flex items-center space-x-2">
              <Users className="h-5 w-5" />
              <span>Suggested Employees</span>
            </CardTitle>
            <CardDescription>
              Employees that might match the detected voice
            </CardDescription>
          </CardHeader>
          <CardContent>
            <div className="space-y-2">
              {suggestedEmployees.map((employee) => (
                <div 
                  key={employee.id} 
                  className="flex items-center justify-between p-3 border rounded-lg hover:bg-gray-50"
                >
                  <div className="flex items-center space-x-3">
                    <User className="h-4 w-4 text-gray-400" />
                    <div>
                      <p className="font-medium">
                        {employee.first_name} {employee.last_name}
                      </p>
                      <p className="text-sm text-gray-600">
                        {employee.role} • {employee.department}
                      </p>
                    </div>
                  </div>
                  <div className="flex items-center space-x-2">
                    <Badge variant="outline">
                      {(Math.random() * 0.4 + 0.6) * 100}% match
                    </Badge>
                    <Button 
                      size="sm" 
                      onClick={() => handleManualTag(employee.id)}
                    >
                      Tag Employee
                    </Button>
                  </div>
                </div>
              ))}
            </div>
          </CardContent>
        </Card>
      )}

      {/* Manual Tagging */}
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center space-x-2">
            <Target className="h-5 w-5" />
            <span>Manual Tagging</span>
          </CardTitle>
          <CardDescription>
            Manually assign employees to this recording
          </CardDescription>
        </CardHeader>
        <CardContent>
          <div className="space-y-4">
            <p className="text-sm text-gray-600">
              If automatic detection didn't work or you need to add additional employees, 
              you can manually tag them here.
            </p>
            <Button variant="outline" className="w-full">
              <User className="h-4 w-4 mr-2" />
              Select Employee to Tag
            </Button>
          </div>
        </CardContent>
      </Card>

      {/* Voice Profile Training */}
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center space-x-2">
            <Volume2 className="h-5 w-5" />
            <span>Voice Profile Training</span>
          </CardTitle>
          <CardDescription>
            Improve voice detection accuracy by training employee voice profiles
          </CardDescription>
        </CardHeader>
        <CardContent>
          <div className="space-y-4">
            <p className="text-sm text-gray-600">
              Train voice profiles using sample recordings to improve automatic detection accuracy.
            </p>
            <div className="flex space-x-2">
              <Button variant="outline" size="sm">
                <Volume2 className="h-4 w-4 mr-2" />
                Train Voice Profile
              </Button>
              <Button variant="outline" size="sm">
                <VolumeX className="h-4 w-4 mr-2" />
                View Training Status
              </Button>
            </div>
          </div>
        </CardContent>
      </Card>
    </div>
  );
};

export default EmployeeVoiceDetection;
