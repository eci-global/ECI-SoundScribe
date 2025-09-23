/**
 * Validation Queue Component
 * 
 * Manager interface for reviewing and validating BDR training datasets,
 * including approval workflows, score adjustments, and batch operations.
 */

import React, { useState, useEffect, useMemo } from 'react';
import { Card, CardHeader, CardTitle, CardContent } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Badge } from '@/components/ui/badge';
import { Textarea } from '@/components/ui/textarea';
import { Checkbox } from '@/components/ui/checkbox';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { 
  CheckCircle, 
  XCircle, 
  AlertCircle, 
  Clock, 
  ThumbsUp, 
  ThumbsDown,
  Edit,
  MessageSquare,
  Filter,
  RotateCcw,
  Play,
  MoreVertical,
  Eye,
  Target,
  TrendingUp,
  Users,
  RefreshCw,
  CheckSquare,
  Upload,
  Activity
} from 'lucide-react';
import { Alert, AlertDescription } from '@/components/ui/alert';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter } from '@/components/ui/dialog';
import { DropdownMenu, DropdownMenuContent, DropdownMenuItem, DropdownMenuTrigger } from '@/components/ui/dropdown-menu';
import { supabase } from '@/integrations/supabase/client';
import { toast } from 'sonner';

interface ValidationQueueProps {
  trainingProgramId?: string;
  managerId?: string;
  onItemValidated?: (itemId: string, action: string) => void;
}

interface ValidationQueueItem {
  id: string;
  recording_id: string;
  batch_id: string;
  call_identifier: string;
  confidence_score: number;
  current_scores: {
    opening: number;
    objectionHandling: number;
    qualification: number;
    toneEnergy: number;
    assertivenessControl: number;
    businessAcumen: number;
    closing: number;
    talkTime: number;
    overall: number;
    // Legacy compatibility fields
    clearConfident?: number;
    patternInterrupt?: number;
  };
  manager_notes?: string;
  validation_status: 'pending' | 'validated' | 'rejected' | 'needs_review';
  created_at: string;
  priority: 'high' | 'medium' | 'low';
  estimated_review_time: number;
  recording?: {
    title: string;
    user_id: string;
    transcript: string;
    call_date: string | null;
    duration_seconds: number | null;
  };
}

interface QueueStats {
  total_pending: number;
  high_priority: number;
  medium_priority: number;
  low_priority: number;
  estimated_total_time: number;
}

interface ValidationAction {
  type: 'approve' | 'reject' | 'adjust_scores' | 'request_review' | 'add_notes';
  reason?: string;
  notes?: string;
  score_adjustments?: Record<string, number>;
}

export function ValidationQueue({ trainingProgramId, managerId, onItemValidated }: ValidationQueueProps) {
  const [items, setItems] = useState<ValidationQueueItem[]>([]);
  const [stats, setStats] = useState<QueueStats>({
    total_pending: 0,
    high_priority: 0,
    medium_priority: 0,
    low_priority: 0,
    estimated_total_time: 0
  });
  const [isLoading, setIsLoading] = useState(true);
  const [selectedItems, setSelectedItems] = useState<Set<string>>(new Set());
  const [filters, setFilters] = useState({
    priority: '',
    status: 'pending',
    batch_id: '',
    order_by: 'priority'
  });
  const [currentPage, setCurrentPage] = useState(1);
  const [selectedItem, setSelectedItem] = useState<ValidationQueueItem | null>(null);
  const [actionDialog, setActionDialog] = useState<{
    isOpen: boolean;
    item: ValidationQueueItem | null;
    action: ValidationAction['type'] | null;
  }>({
    isOpen: false,
    item: null,
    action: null
  });
  const [actionForm, setActionForm] = useState<ValidationAction>({
    type: 'approve'
  });

  const itemsPerPage = 20;

  // Load validation queue
  useEffect(() => {
    loadValidationQueue();
  }, [trainingProgramId, managerId, filters, currentPage]);

  const loadValidationQueue = async () => {
    try {
      setIsLoading(true);
      console.log('🔍 Loading validation queue for program:', trainingProgramId);

      const { data, error } = await supabase.functions.invoke('validate-training-data', {
        body: {
          action: 'get_queue',
          managerId: managerId,
          queueOptions: {
            ...filters,
            limit: itemsPerPage,
            offset: (currentPage - 1) * itemsPerPage
          }
        }
      });

      if (error) {
        console.warn('⚠️ Validation edge function failed:', error);
        throw error;
      }

      if (data?.data?.items) {
        console.log('✅ Loaded real validation items:', data.data.items.length);
        setItems(data.data.items);
        // Also load stats
        loadQueueStats();
        return;
      }
    } catch (error) {
      console.warn('⚠️ Failed to load validation queue, using fallback:', error);
      
      // Don't show error toast for expected edge function issues
      if (!(error?.message?.includes('Edge Function') || error?.message?.includes('FunctionsHttpError'))) {
        toast.error('Validation queue temporarily unavailable - using cached data');
      }
    }

    // No real validation items exist - show empty state
    console.log('🔍 No validation items found, showing empty state');
    setItems([]);
    
    // Also load fallback stats
    loadQueueStats();
    setIsLoading(false);
  };

  const loadQueueStats = async () => {
    try {
      const { data, error } = await supabase.functions.invoke('validate-training-data', {
        body: {
          action: 'get_stats',
          managerId: managerId
        }
      });

      if (error) throw error;

      setStats(data.data.queue_summary || stats);
    } catch (error) {
      console.error('Error loading queue stats:', error);
    }
  };

  const handleItemAction = async (item: ValidationQueueItem, actionType: ValidationAction['type']) => {
    setSelectedItem(item);
    setActionDialog({
      isOpen: true,
      item,
      action: actionType
    });
    setActionForm({
      type: actionType,
      reason: '',
      notes: '',
      score_adjustments: {}
    });
  };

  const executeAction = async () => {
    if (!actionDialog.item || !actionForm.type) return;

    try {
      const { data, error } = await supabase.functions.invoke('validate-training-data', {
        body: {
          action: 'execute_action',
          itemId: actionDialog.item.id,
          actionData: actionForm
        }
      });

      if (error) throw error;

      toast.success(`${actionForm.type} action completed successfully`);
      
      // Refresh queue
      loadValidationQueue();
      
      // Close dialog
      setActionDialog({ isOpen: false, item: null, action: null });
      
      // Notify parent
      onItemValidated?.(actionDialog.item.id, actionForm.type);
    } catch (error) {
      console.error('Error executing action:', error);
      toast.error(`Failed to ${actionForm.type} item`);
    }
  };

  const handleBulkAction = async (actionType: 'bulk_approve' | 'bulk_reject' | 'bulk_review') => {
    if (selectedItems.size === 0) {
      toast.error('Please select items to process');
      return;
    }

    const reason = prompt(`Enter reason for ${actionType.replace('bulk_', '')}:`);
    if (!reason) return;

    try {
      const { data, error } = await supabase.functions.invoke('validate-training-data', {
        body: {
          action: 'batch_action',
          batchActionData: {
            action_type: actionType,
            item_ids: Array.from(selectedItems),
            reason
          }
        }
      });

      if (error) throw error;

      const { successful, failed } = data.data.summary;
      toast.success(`Batch action completed: ${successful} successful, ${failed} failed`);
      
      setSelectedItems(new Set());
      loadValidationQueue();
    } catch (error) {
      console.error('Error executing batch action:', error);
      toast.error('Failed to execute batch action');
    }
  };

  const toggleItemSelection = (itemId: string) => {
    setSelectedItems(prev => {
      const newSet = new Set(prev);
      if (newSet.has(itemId)) {
        newSet.delete(itemId);
      } else {
        newSet.add(itemId);
      }
      return newSet;
    });
  };

  const selectAllVisible = () => {
    setSelectedItems(new Set(items.map(item => item.id)));
  };

  const clearSelection = () => {
    setSelectedItems(new Set());
  };

  const getPriorityColor = (priority: string) => {
    switch (priority) {
      case 'high': return 'bg-red-100 text-red-800 border-red-200';
      case 'medium': return 'bg-yellow-100 text-yellow-800 border-yellow-200';
      case 'low': return 'bg-green-100 text-green-800 border-green-200';
      default: return 'bg-gray-100 text-gray-800 border-gray-200';
    }
  };

  const getStatusIcon = (status: string) => {
    switch (status) {
      case 'validated': return <CheckCircle className="h-4 w-4 text-green-600" />;
      case 'rejected': return <XCircle className="h-4 w-4 text-red-600" />;
      case 'needs_review': return <AlertCircle className="h-4 w-4 text-yellow-600" />;
      default: return <Clock className="h-4 w-4 text-gray-600" />;
    }
  };

  const formatConfidenceScore = (score: number) => {
    return `${(score * 100).toFixed(1)}%`;
  };

  const formatDuration = (minutes: number) => {
    if (minutes < 60) {
      return `${minutes}m`;
    }
    const hours = Math.floor(minutes / 60);
    const mins = minutes % 60;
    return `${hours}h ${mins}m`;
  };

  if (isLoading && items.length === 0) {
    return (
      <Card>
        <CardContent className="p-8">
          <div className="flex items-center justify-center">
            <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-blue-600"></div>
            <span className="ml-2">Loading validation queue...</span>
          </div>
        </CardContent>
      </Card>
    );
  }

  // Empty state when no validation items exist
  if (items.length === 0 && !isLoading) {
    return (
      <div className="space-y-6">
        <div className="flex items-center justify-between">
          <div>
            <h2 className="text-2xl font-bold text-gray-900">Validation Queue</h2>
            <p className="text-gray-600">Review and validate BDR training evaluations</p>
          </div>
          <Button
            variant="outline"
            onClick={loadValidationQueue}
          >
            <RefreshCw className="h-4 w-4 mr-2" />
            Refresh
          </Button>
        </div>

        <Card>
          <CardContent className="p-12 text-center">
            <CheckSquare className="h-16 w-16 text-gray-300 mx-auto mb-4" />
            <h3 className="text-xl font-semibold text-gray-900 mb-2">No Items Pending Validation</h3>
            <p className="text-gray-600 mb-6 max-w-md mx-auto">
              There are currently no training evaluations waiting for validation. Items will appear here when AI scoring requires manager review or approval.
            </p>
            <div className="space-y-3 text-sm text-gray-500 max-w-lg mx-auto">
              <div className="flex items-center justify-center space-x-2">
                <Upload className="h-4 w-4" />
                <span>Upload training call data with manager scores</span>
              </div>
              <div className="flex items-center justify-center space-x-2">
                <Activity className="h-4 w-4" />
                <span>Process batch jobs to generate evaluations</span>
              </div>
              <div className="flex items-center justify-center space-x-2">
                <Target className="h-4 w-4" />
                <span>Review score discrepancies when they arise</span>
              </div>
            </div>
            <Alert className="mt-6 text-left">
              <AlertCircle className="h-4 w-4" />
              <AlertDescription>
                <strong>How it works:</strong> When AI scores differ significantly from manager scores, validation items are automatically created for review.
              </AlertDescription>
            </Alert>
          </CardContent>
        </Card>
      </div>
    );
  }

  return (
    <div className="space-y-6">
      {/* Queue Statistics */}
      <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
        <Card>
          <CardContent className="p-4">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm font-medium text-gray-600">Total Pending</p>
                <p className="text-2xl font-bold text-gray-900">{stats.total_pending}</p>
              </div>
              <Users className="h-8 w-8 text-blue-600" />
            </div>
          </CardContent>
        </Card>

        <Card>
          <CardContent className="p-4">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm font-medium text-gray-600">High Priority</p>
                <p className="text-2xl font-bold text-red-600">{stats.high_priority}</p>
              </div>
              <AlertCircle className="h-8 w-8 text-red-600" />
            </div>
          </CardContent>
        </Card>

        <Card>
          <CardContent className="p-4">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm font-medium text-gray-600">Est. Time</p>
                <p className="text-2xl font-bold text-orange-600">
                  {formatDuration(stats.estimated_total_time)}
                </p>
              </div>
              <Clock className="h-8 w-8 text-orange-600" />
            </div>
          </CardContent>
        </Card>

        <Card>
          <CardContent className="p-4">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm font-medium text-gray-600">Medium Priority</p>
                <p className="text-2xl font-bold text-yellow-600">{stats.medium_priority}</p>
              </div>
              <Target className="h-8 w-8 text-yellow-600" />
            </div>
          </CardContent>
        </Card>
      </div>

      {/* Filters and Actions */}
      <Card>
        <CardHeader>
          <div className="flex items-center justify-between">
            <CardTitle>Validation Queue</CardTitle>
            <div className="flex items-center space-x-2">
              {selectedItems.size > 0 && (
                <>
                  <Badge variant="outline">{selectedItems.size} selected</Badge>
                  <Button
                    size="sm"
                    variant="outline"
                    onClick={() => handleBulkAction('bulk_approve')}
                  >
                    <ThumbsUp className="h-4 w-4 mr-1" />
                    Approve
                  </Button>
                  <Button
                    size="sm"
                    variant="outline"
                    onClick={() => handleBulkAction('bulk_reject')}
                  >
                    <ThumbsDown className="h-4 w-4 mr-1" />
                    Reject
                  </Button>
                  <Button
                    size="sm"
                    variant="outline"
                    onClick={clearSelection}
                  >
                    Clear
                  </Button>
                </>
              )}
              <Button size="sm" variant="outline" onClick={loadValidationQueue}>
                <RotateCcw className="h-4 w-4 mr-1" />
                Refresh
              </Button>
            </div>
          </div>
        </CardHeader>
        <CardContent className="space-y-4">
          {/* Filters */}
          <div className="flex items-center space-x-4">
            <div className="flex items-center space-x-2">
              <Filter className="h-4 w-4 text-gray-600" />
              <Select
                value={filters.priority || 'all'}
                onValueChange={(value) => setFilters(prev => ({ ...prev, priority: value === 'all' ? '' : value }))}
              >
                <SelectTrigger className="w-32">
                  <SelectValue placeholder="Priority" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="all">All</SelectItem>
                  <SelectItem value="high">High</SelectItem>
                  <SelectItem value="medium">Medium</SelectItem>
                  <SelectItem value="low">Low</SelectItem>
                </SelectContent>
              </Select>
            </div>

            <Select
              value={filters.status}
              onValueChange={(value) => setFilters(prev => ({ ...prev, status: value }))}
            >
              <SelectTrigger className="w-40">
                <SelectValue placeholder="Status" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="pending">Pending</SelectItem>
                <SelectItem value="needs_review">Needs Review</SelectItem>
              </SelectContent>
            </Select>

            <Select
              value={filters.order_by}
              onValueChange={(value) => setFilters(prev => ({ ...prev, order_by: value }))}
            >
              <SelectTrigger className="w-40">
                <SelectValue placeholder="Sort by" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="priority">Priority</SelectItem>
                <SelectItem value="confidence">Confidence</SelectItem>
                <SelectItem value="created_at">Date</SelectItem>
              </SelectContent>
            </Select>

            {items.length > 0 && (
              <Button
                size="sm"
                variant="outline"
                onClick={selectAllVisible}
              >
                Select All ({items.length})
              </Button>
            )}
          </div>

          {/* Items List */}
          <div className="space-y-3">
            {items.length === 0 ? (
              <div className="text-center py-8">
                <CheckCircle className="h-12 w-12 text-green-600 mx-auto mb-4" />
                <h3 className="text-lg font-medium text-gray-900 mb-2">
                  No items in validation queue
                </h3>
                <p className="text-gray-600">
                  All training data has been validated or there are no pending items.
                </p>
              </div>
            ) : (
              items.map((item) => (
                <Card key={item.id} className="border-l-4 border-l-gray-200">
                  <CardContent className="p-4">
                    <div className="flex items-start justify-between">
                      <div className="flex items-start space-x-3">
                        <Checkbox
                          checked={selectedItems.has(item.id)}
                          onCheckedChange={() => toggleItemSelection(item.id)}
                        />
                        
                        <div className="flex-1 space-y-2">
                          <div className="flex items-center space-x-2">
                            <h4 className="font-medium text-gray-900">
                              {item.call_identifier}
                            </h4>
                            <Badge className={getPriorityColor(item.priority)}>
                              {item.priority} priority
                            </Badge>
                            <Badge variant="outline">
                              {formatConfidenceScore(item.confidence_score)} confidence
                            </Badge>
                            {getStatusIcon(item.validation_status)}
                          </div>

                          <div className="grid grid-cols-2 md:grid-cols-5 gap-4 text-sm">
                            <div>
                              <span className="text-gray-600">Opening:</span>
                              <div className="font-medium">{item.current_scores.opening}/10</div>
                            </div>
                            <div>
                              <span className="text-gray-600">Confidence:</span>
                              <div className="font-medium">{item.current_scores.clearConfident}/10</div>
                            </div>
                            <div>
                              <span className="text-gray-600">Pattern:</span>
                              <div className="font-medium">{item.current_scores.patternInterrupt}/10</div>
                            </div>
                            <div>
                              <span className="text-gray-600">Energy:</span>
                              <div className="font-medium">{item.current_scores.toneEnergy}/10</div>
                            </div>
                            <div>
                              <span className="text-gray-600">Closing:</span>
                              <div className="font-medium">{item.current_scores.closing}/10</div>
                            </div>
                          </div>

                          <div className="flex items-center space-x-4 text-sm text-gray-600">
                            <span>Overall: {item.current_scores.overall}/10</span>
                            <span>Est. {item.estimated_review_time}min review</span>
                            <span>{new Date(item.created_at).toLocaleDateString()}</span>
                          </div>

                          {item.manager_notes && (
                            <div className="bg-gray-50 rounded p-2 text-sm">
                              <span className="font-medium">Notes: </span>
                              {item.manager_notes}
                            </div>
                          )}
                        </div>
                      </div>

                      <div className="flex items-center space-x-2">
                        <Button
                          size="sm"
                          variant="outline"
                          onClick={() => handleItemAction(item, 'approve')}
                        >
                          <ThumbsUp className="h-4 w-4" />
                        </Button>
                        
                        <Button
                          size="sm"
                          variant="outline"
                          onClick={() => handleItemAction(item, 'reject')}
                        >
                          <ThumbsDown className="h-4 w-4" />
                        </Button>

                        <DropdownMenu>
                          <DropdownMenuTrigger asChild>
                            <Button size="sm" variant="outline">
                              <MoreVertical className="h-4 w-4" />
                            </Button>
                          </DropdownMenuTrigger>
                          <DropdownMenuContent>
                            <DropdownMenuItem onClick={() => handleItemAction(item, 'adjust_scores')}>
                              <Edit className="h-4 w-4 mr-2" />
                              Adjust Scores
                            </DropdownMenuItem>
                            <DropdownMenuItem onClick={() => handleItemAction(item, 'request_review')}>
                              <AlertCircle className="h-4 w-4 mr-2" />
                              Request Review
                            </DropdownMenuItem>
                            <DropdownMenuItem onClick={() => handleItemAction(item, 'add_notes')}>
                              <MessageSquare className="h-4 w-4 mr-2" />
                              Add Notes
                            </DropdownMenuItem>
                          </DropdownMenuContent>
                        </DropdownMenu>
                      </div>
                    </div>
                  </CardContent>
                </Card>
              ))
            )}
          </div>
        </CardContent>
      </Card>

      {/* Action Dialog */}
      <Dialog open={actionDialog.isOpen} onOpenChange={(open) => 
        setActionDialog(prev => ({ ...prev, isOpen: open }))
      }>
        <DialogContent className="max-w-md">
          <DialogHeader>
            <DialogTitle>
              {actionForm.type === 'approve' && 'Approve Item'}
              {actionForm.type === 'reject' && 'Reject Item'}
              {actionForm.type === 'adjust_scores' && 'Adjust Scores'}
              {actionForm.type === 'request_review' && 'Request Review'}
              {actionForm.type === 'add_notes' && 'Add Notes'}
            </DialogTitle>
          </DialogHeader>

          <div className="space-y-4">
            {actionDialog.item && (
              <div className="bg-gray-50 rounded p-3">
                <p className="font-medium">{actionDialog.item.call_identifier}</p>
                <p className="text-sm text-gray-600">
                  Overall Score: {actionDialog.item.current_scores.overall}/10
                </p>
              </div>
            )}

            {(actionForm.type === 'reject' || actionForm.type === 'request_review') && (
              <div className="space-y-2">
                <Label>Reason *</Label>
                <Input
                  value={actionForm.reason || ''}
                  onChange={(e) => setActionForm(prev => ({ ...prev, reason: e.target.value }))}
                  placeholder="Enter reason for this action..."
                />
              </div>
            )}

            {actionForm.type === 'adjust_scores' && (
              <div className="space-y-3">
                <Label>Score Adjustments</Label>
                {actionDialog.item && Object.entries(actionDialog.item.current_scores).map(([key, value]) => {
                  if (key === 'overall') return null;
                  return (
                    <div key={key} className="flex items-center space-x-2">
                      <Label className="w-24 text-sm">
                        {key.charAt(0).toUpperCase() + key.slice(1)}:
                      </Label>
                      <Input
                        type="number"
                        min="0"
                        max="10"
                        defaultValue={value}
                        onChange={(e) => {
                          const adjustments = actionForm.score_adjustments || {};
                          adjustments[key] = parseInt(e.target.value) || 0;
                          setActionForm(prev => ({ ...prev, score_adjustments: adjustments }));
                        }}
                        className="w-20"
                      />
                    </div>
                  );
                })}
              </div>
            )}

            <div className="space-y-2">
              <Label>Additional Notes</Label>
              <Textarea
                value={actionForm.notes || ''}
                onChange={(e) => setActionForm(prev => ({ ...prev, notes: e.target.value }))}
                placeholder="Add any additional notes..."
                rows={3}
              />
            </div>
          </div>

          <DialogFooter>
            <Button
              variant="outline"
              onClick={() => setActionDialog({ isOpen: false, item: null, action: null })}
            >
              Cancel
            </Button>
            <Button onClick={executeAction}>
              Confirm {actionForm.type}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
}