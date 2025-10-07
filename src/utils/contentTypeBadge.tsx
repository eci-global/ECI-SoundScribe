import React from 'react';
import { Badge } from '@/components/ui/badge';
import { TrendingUp, Headphones, Users, GraduationCap, FileText } from 'lucide-react';
import type { ContentType } from '@/types/recording';

interface ContentTypeBadgeConfig {
  icon: React.ComponentType<{ className?: string }>;
  text: string;
  fullText: string;
  className: string;
  description: string;
}

const contentTypeConfig: Record<ContentType, ContentTypeBadgeConfig> = {
  sales_call: {
    icon: TrendingUp,
    text: 'Sales',
    fullText: 'Sales Call',
    className: 'bg-blue-100 text-blue-800 border-blue-200',
    description: 'Recording uploaded as sales call content - shows BDR metrics and sales coaching'
  },
  customer_support: {
    icon: Headphones,
    text: 'Support',
    fullText: 'Customer Support',
    className: 'bg-green-100 text-green-800 border-green-200',
    description: 'Recording uploaded as customer support content - shows support metrics and ECI analysis'
  },
  team_meeting: {
    icon: Users,
    text: 'Meeting',
    fullText: 'Team Meeting',
    className: 'bg-purple-100 text-purple-800 border-purple-200',
    description: 'Recording uploaded as team meeting content'
  },
  training_session: {
    icon: GraduationCap,
    text: 'Training',
    fullText: 'Training Session',
    className: 'bg-orange-100 text-orange-800 border-orange-200',
    description: 'Recording uploaded as training session content'
  },
  other: {
    icon: FileText,
    text: 'Other',
    fullText: 'Other',
    className: 'bg-gray-100 text-gray-800 border-gray-200',
    description: 'Recording uploaded with other content type'
  }
};

interface ContentTypeBadgeProps {
  contentType?: ContentType;
  showFullText?: boolean;
  size?: 'sm' | 'default';
  className?: string;
  showTooltip?: boolean;
}

/**
 * Displays a badge indicating the content type of a recording
 * This helps users understand why they see certain types of metrics
 */
export function ContentTypeBadge({
  contentType,
  showFullText = false,
  size = 'sm',
  className = '',
  showTooltip = true
}: ContentTypeBadgeProps) {
  if (!contentType) {
    return null;
  }

  const config = contentTypeConfig[contentType] || contentTypeConfig.other;
  const Icon = config.icon;

  const badgeContent = (
    <Badge
      className={`${config.className} ${className} ${size === 'sm' ? 'text-xs' : 'text-sm'} inline-flex items-center gap-1`}
      title={showTooltip ? config.description : undefined}
    >
      <Icon className={`${size === 'sm' ? 'w-3 h-3' : 'w-4 h-4'}`} />
      <span className={`${showFullText ? '' : 'hidden sm:inline'}`}>
        {showFullText ? config.fullText : config.text}
      </span>
    </Badge>
  );

  return badgeContent;
}

/**
 * Get content type configuration for custom implementations
 */
export function getContentTypeConfig(contentType?: ContentType) {
  if (!contentType) return null;
  return contentTypeConfig[contentType] || contentTypeConfig.other;
}

/**
 * Utility function to determine if recording should show BDR metrics
 */
export function shouldShowBDRMetrics(contentType?: ContentType): boolean {
  return contentType === 'sales_call';
}

/**
 * Utility function to determine if recording should show support metrics
 */
export function shouldShowSupportMetrics(contentType?: ContentType): boolean {
  return contentType === 'customer_support';
}

export default ContentTypeBadge;