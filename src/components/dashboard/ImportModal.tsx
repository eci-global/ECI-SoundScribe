
import React, { useState } from 'react';
import { Dialog, DialogContent, DialogDescription, DialogHeader, DialogTitle } from '@/components/ui/dialog';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { FileDown, Globe, Phone } from 'lucide-react';
import { useToast } from '@/hooks/use-toast';

interface ImportModalProps {
  open: boolean;
  onClose: () => void;
  onImport: (type: 'outreach' | 'vonage', credentials: any) => Promise<void>;
}

export default function ImportModal({ open, onClose, onImport }: ImportModalProps) {
  const [loading, setLoading] = useState(false);
  const [outreachApiKey, setOutreachApiKey] = useState('');
  const [vonageApiKey, setVonageApiKey] = useState('');
  const [vonageApiSecret, setVonageApiSecret] = useState('');
  const { toast } = useToast();

  const handleOutreachImport = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!outreachApiKey.trim()) return;

    setLoading(true);
    try {
      await onImport('outreach', { apiKey: outreachApiKey.trim() });
      setOutreachApiKey('');
      onClose();
      toast({
        title: "Import started",
        description: "Your Outreach.io recordings are being imported"
      });
    } catch (error) {
      toast({
        title: "Import failed",
        description: "Failed to import from Outreach.io. Please check your API key.",
        variant: "destructive"
      });
    } finally {
      setLoading(false);
    }
  };

  const handleVonageImport = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!vonageApiKey.trim() || !vonageApiSecret.trim()) return;

    setLoading(true);
    try {
      await onImport('vonage', { 
        apiKey: vonageApiKey.trim(), 
        apiSecret: vonageApiSecret.trim() 
      });
      setVonageApiKey('');
      setVonageApiSecret('');
      onClose();
      toast({
        title: "Import started",
        description: "Your Vonage recordings are being imported"
      });
    } catch (error) {
      toast({
        title: "Import failed",
        description: "Failed to import from Vonage. Please check your credentials.",
        variant: "destructive"
      });
    } finally {
      setLoading(false);
    }
  };

  return (
    <Dialog open={open} onOpenChange={onClose}>
      <DialogContent className="sm:max-w-lg bg-white/95 backdrop-blur-sm border-0 shadow-2xl">
        <DialogHeader className="space-y-3">
          <DialogTitle className="text-2xl font-bold bg-gradient-to-r from-gray-900 to-gray-700 bg-clip-text text-transparent flex items-center">
            <FileDown className="h-6 w-6 mr-2 text-blue-500" />
            Import Recordings
          </DialogTitle>
          <DialogDescription className="text-gray-600">
            Import your existing recordings from Outreach.io or Vonage
          </DialogDescription>
        </DialogHeader>
        
        <Tabs defaultValue="outreach" className="space-y-4">
          <TabsList className="grid w-full grid-cols-2">
            <TabsTrigger value="outreach" className="flex items-center space-x-2">
              <Globe className="h-4 w-4" />
              <span>Outreach.io</span>
            </TabsTrigger>
            <TabsTrigger value="vonage" className="flex items-center space-x-2">
              <Phone className="h-4 w-4" />
              <span>Vonage</span>
            </TabsTrigger>
          </TabsList>
          
          <TabsContent value="outreach">
            <Card>
              <CardHeader>
                <CardTitle className="text-lg">Outreach.io Import</CardTitle>
                <CardDescription>
                  Import call recordings from your Outreach.io account
                </CardDescription>
              </CardHeader>
              <CardContent>
                <form onSubmit={handleOutreachImport} className="space-y-4">
                  <div className="space-y-2">
                    <Label htmlFor="outreach-api-key">API Key</Label>
                    <Input
                      id="outreach-api-key"
                      type="password"
                      value={outreachApiKey}
                      onChange={(e) => setOutreachApiKey(e.target.value)}
                      placeholder="Enter your Outreach.io API key"
                      required
                    />
                  </div>
                  <div className="flex gap-3">
                    <Button 
                      type="button" 
                      variant="outline" 
                      onClick={onClose} 
                      className="flex-1"
                    >
                      Cancel
                    </Button>
                    <Button 
                      type="submit" 
                      disabled={loading || !outreachApiKey.trim()}
                      className="flex-1"
                    >
                      {loading ? 'Importing...' : 'Import'}
                    </Button>
                  </div>
                </form>
              </CardContent>
            </Card>
          </TabsContent>
          
          <TabsContent value="vonage">
            <Card>
              <CardHeader>
                <CardTitle className="text-lg">Vonage Import</CardTitle>
                <CardDescription>
                  Import call recordings from your Vonage account
                </CardDescription>
              </CardHeader>
              <CardContent>
                <form onSubmit={handleVonageImport} className="space-y-4">
                  <div className="space-y-2">
                    <Label htmlFor="vonage-api-key">API Key</Label>
                    <Input
                      id="vonage-api-key"
                      type="text"
                      value={vonageApiKey}
                      onChange={(e) => setVonageApiKey(e.target.value)}
                      placeholder="Enter your Vonage API key"
                      required
                    />
                  </div>
                  <div className="space-y-2">
                    <Label htmlFor="vonage-api-secret">API Secret</Label>
                    <Input
                      id="vonage-api-secret"
                      type="password"
                      value={vonageApiSecret}
                      onChange={(e) => setVonageApiSecret(e.target.value)}
                      placeholder="Enter your Vonage API secret"
                      required
                    />
                  </div>
                  <div className="flex gap-3">
                    <Button 
                      type="button" 
                      variant="outline" 
                      onClick={onClose} 
                      className="flex-1"
                    >
                      Cancel
                    </Button>
                    <Button 
                      type="submit" 
                      disabled={loading || !vonageApiKey.trim() || !vonageApiSecret.trim()}
                      className="flex-1"
                    >
                      {loading ? 'Importing...' : 'Import'}
                    </Button>
                  </div>
                </form>
              </CardContent>
            </Card>
          </TabsContent>
        </Tabs>
      </DialogContent>
    </Dialog>
  );
}
