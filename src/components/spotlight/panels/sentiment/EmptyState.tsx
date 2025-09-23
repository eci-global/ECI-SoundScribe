import React from 'react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Heart } from 'lucide-react';

export default function EmptyState() {
  return (
    <Card>
      <CardHeader>
        <CardTitle className="flex items-center space-x-2">
          <Heart className="h-5 w-5" />
          <span>Sentiment Moments</span>
        </CardTitle>
      </CardHeader>
      <CardContent>
        <div className="text-center py-8 text-gray-500">
          <Heart className="h-12 w-12 mx-auto mb-4 opacity-50" />
          <p>No sentiment analysis available</p>
          <p className="text-sm">Sentiment moments will appear after AI processing</p>
        </div>
      </CardContent>
    </Card>
  );
}