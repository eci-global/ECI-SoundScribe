import React from 'react';
import { Badge } from '@/components/ui/badge';
import {
  CheckCircle,
  AlertCircle,
  Brain,
  User,
  Users,
  HelpCircle
} from 'lucide-react';
import {
  Tooltip,
  TooltipContent,
  TooltipProvider,
  TooltipTrigger,
} from "@/components/ui/tooltip";

interface EmployeeDetectionBadgeProps {
  detectionMethod?: 'exact_match' | 'fuzzy_match' | 'first_name_unique' | 'first_name_context' | 'first_name_ambiguous' | 'manual' | null;
  confidence?: number;
  manuallyTagged?: boolean;
  showTooltip?: boolean;
  size?: 'sm' | 'md' | 'lg';
}

export const EmployeeDetectionBadge: React.FC<EmployeeDetectionBadgeProps> = ({
  detectionMethod,
  confidence,
  manuallyTagged = false,
  showTooltip = true,
  size = 'sm'
}) => {
  if (manuallyTagged) {
    const badge = (
      <Badge variant="outline" className="bg-blue-50 text-blue-700 border-blue-200">
        <User className={`${size === 'sm' ? 'h-3 w-3' : 'h-4 w-4'} mr-1`} />
        Manual
      </Badge>
    );

    if (!showTooltip) return badge;

    return (
      <TooltipProvider>
        <Tooltip>
          <TooltipTrigger asChild>
            {badge}
          </TooltipTrigger>
          <TooltipContent>
            <p>Manually tagged by user</p>
          </TooltipContent>
        </Tooltip>
      </TooltipProvider>
    );
  }

  const getDetectionInfo = () => {
    switch (detectionMethod) {
      case 'exact_match':
        return {
          label: 'AI - Exact Match',
          icon: CheckCircle,
          color: 'bg-green-50 text-green-700 border-green-200',
          description: 'Employee identified by AI with exact full name match (first + last name)',
        };
      case 'fuzzy_match':
        return {
          label: 'AI - Fuzzy Match',
          icon: Brain,
          color: 'bg-emerald-50 text-emerald-700 border-emerald-200',
          description: 'Employee identified by AI with partial name matching',
        };
      case 'first_name_unique':
        return {
          label: 'AI - First Name',
          icon: CheckCircle,
          color: 'bg-teal-50 text-teal-700 border-teal-200',
          description: 'Employee identified by first name only (unique match in database)',
        };
      case 'first_name_context':
        return {
          label: 'AI - Context Match',
          icon: Users,
          color: 'bg-cyan-50 text-cyan-700 border-cyan-200',
          description: 'Employee identified by first name using recent call history for disambiguation',
        };
      case 'first_name_ambiguous':
        return {
          label: 'AI - Ambiguous',
          icon: AlertCircle,
          color: 'bg-yellow-50 text-yellow-700 border-yellow-200',
          description: 'Employee identified by first name but multiple matches found - may need verification',
        };
      default:
        return {
          label: 'AI Detected',
          icon: Brain,
          color: 'bg-purple-50 text-purple-700 border-purple-200',
          description: 'Employee automatically identified by AI from transcript analysis',
        };
    }
  };

  const info = getDetectionInfo();
  const Icon = info.icon;
  const confidencePercent = confidence ? Math.round(confidence * 100) : null;

  const badge = (
    <Badge variant="outline" className={info.color}>
      <Icon className={`${size === 'sm' ? 'h-3 w-3' : 'h-4 w-4'} mr-1`} />
      {info.label}
      {confidencePercent && (
        <span className="ml-1 text-xs opacity-75">
          ({confidencePercent}%)
        </span>
      )}
    </Badge>
  );

  if (!showTooltip) return badge;

  return (
    <TooltipProvider>
      <Tooltip>
        <TooltipTrigger asChild>
          {badge}
        </TooltipTrigger>
        <TooltipContent className="max-w-xs">
          <div className="space-y-2">
            <p className="font-semibold">Detection Method</p>
            <p className="text-sm">{info.description}</p>
            {confidencePercent && (
              <p className="text-sm">
                <strong>Confidence:</strong> {confidencePercent}%
                {confidencePercent >= 80 && ' (High)'}
                {confidencePercent >= 60 && confidencePercent < 80 && ' (Medium)'}
                {confidencePercent < 60 && ' (Low - may need verification)'}
              </p>
            )}
          </div>
        </TooltipContent>
      </Tooltip>
    </TooltipProvider>
  );
};

// Compact version for use in tables and lists
export const EmployeeDetectionIndicator: React.FC<{
  detectionMethod?: string;
  confidence?: number;
  manuallyTagged?: boolean;
}> = ({ detectionMethod, confidence, manuallyTagged }) => {
  if (manuallyTagged) {
    return (
      <TooltipProvider>
        <Tooltip>
          <TooltipTrigger asChild>
            <div className="inline-flex items-center">
              <User className="h-4 w-4 text-blue-600" />
            </div>
          </TooltipTrigger>
          <TooltipContent>
            <p>Manually tagged</p>
          </TooltipContent>
        </Tooltip>
      </TooltipProvider>
    );
  }

  const confidencePercent = confidence ? Math.round(confidence * 100) : null;
  let icon = Brain;
  let color = 'text-purple-600';

  if (detectionMethod === 'exact_match') {
    icon = CheckCircle;
    color = 'text-green-600';
  } else if (detectionMethod === 'first_name_ambiguous') {
    icon = AlertCircle;
    color = 'text-yellow-600';
  }

  const Icon = icon;

  return (
    <TooltipProvider>
      <Tooltip>
        <TooltipTrigger asChild>
          <div className="inline-flex items-center gap-1">
            <Icon className={`h-4 w-4 ${color}`} />
            {confidencePercent && (
              <span className={`text-xs ${color}`}>
                {confidencePercent}%
              </span>
            )}
          </div>
        </TooltipTrigger>
        <TooltipContent>
          <p>AI detected - {detectionMethod?.replace(/_/g, ' ') || 'auto'}</p>
          {confidencePercent && <p>Confidence: {confidencePercent}%</p>}
        </TooltipContent>
      </Tooltip>
    </TooltipProvider>
  );
};
