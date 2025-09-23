import React, { useState, useEffect } from 'react';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Alert, AlertDescription } from '@/components/ui/alert';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { 
  Search,
  Users,
  UserCheck,
  AlertCircle,
  CheckCircle,
  X,
  Plus,
  RefreshCw,
  ExternalLink,
  Mail,
  Building
} from 'lucide-react';
import { useOutreachIntegration } from '@/hooks/useOutreachIntegration';
import { useToast } from '@/hooks/use-toast';
import { supabase } from '@/integrations/supabase/client';
import type { OutreachProspect, ProspectMapping } from '@/lib/outreach/types';

interface Speaker {
  name: string;
  email?: string;
  company?: string;
  segments?: Array<{ text: string }>;
}

interface ProspectMappingProps {
  recordingId: string;
  speakers: Speaker[];
  onMappingComplete: (mappings: ProspectMapping[]) => void;
}

export default function ProspectMapping({ recordingId, speakers, onMappingComplete }: ProspectMappingProps) {
  const { toast } = useToast();
  const { isConnected, connection } = useOutreachIntegration();
  const [searchTerm, setSearchTerm] = useState('');
  const [isSearching, setIsSearching] = useState(false);
  const [searchResults, setSearchResults] = useState<OutreachProspect[]>([]);
  const [mappings, setMappings] = useState<Map<string, OutreachProspect>>(new Map());
  const [unmappedSpeakers, setUnmappedSpeakers] = useState<Speaker[]>(speakers);

  useEffect(() => {
    setUnmappedSpeakers(speakers);
  }, [speakers]);

  const searchProspects = async (query: string) => {
    if (!query.trim() || !isConnected) return;

    setIsSearching(true);
    try {
      const { data, error } = await supabase.functions.invoke('outreach-search-prospects', {
        body: { 
          query,
          userId: connection?.user_id 
        }
      });

      if (error) throw error;
      
      setSearchResults(data.prospects || []);
    } catch (error: any) {
      console.error('Search failed:', error);
      toast({
        title: "Search Failed",
        description: error.message,
        variant: "destructive"
      });
    } finally {
      setIsSearching(false);
    }
  };

  const handleSearch = () => {
    searchProspects(searchTerm);
  };

  const handleKeyPress = (e: React.KeyboardEvent) => {
    if (e.key === 'Enter') {
      handleSearch();
    }
  };

  const mapSpeakerToProspect = (speaker: Speaker, prospect: OutreachProspect) => {
    const newMappings = new Map(mappings);
    newMappings.set(speaker.name, prospect);
    setMappings(newMappings);

    // Remove speaker from unmapped list
    setUnmappedSpeakers(prev => prev.filter(s => s.name !== speaker.name));

    toast({
      title: "Mapping Added",
      description: `${speaker.name} mapped to ${prospect.attributes.name}`,
    });
  };

  const removeSpeakerMapping = (speakerName: string) => {
    const newMappings = new Map(mappings);
    const prospect = newMappings.get(speakerName);
    newMappings.delete(speakerName);
    setMappings(newMappings);

    // Add speaker back to unmapped list
    const speaker = speakers.find(s => s.name === speakerName);
    if (speaker) {
      setUnmappedSpeakers(prev => [...prev, speaker]);
    }

    toast({
      title: "Mapping Removed",
      description: `Removed mapping for ${speakerName}`,
    });
  };

  const saveMappings = async () => {
    const mappingArray: ProspectMapping[] = Array.from(mappings.entries()).map(([speakerName, prospect], index) => ({
      prospectId: prospect.id,
      speakerName,
      confidence: 1.0 // Manual mapping has 100% confidence
    }));

    // Store mappings in database
    try {
      const mappingRecords = Array.from(mappings.entries()).map(([speakerName, prospect]) => ({
        user_id: connection?.user_id,
        recording_id: recordingId,
        outreach_prospect_id: prospect.id,
        prospect_email: prospect.attributes.email,
        prospect_name: prospect.attributes.name,
        prospect_company: prospect.attributes.company,
        sync_status: 'pending' as const,
        created_at: new Date().toISOString(),
        updated_at: new Date().toISOString()
      }));

      const { error } = await supabase
        .from('outreach_prospect_mappings')
        .upsert(mappingRecords);

      if (error) throw error;

      onMappingComplete(mappingArray);
      
      toast({
        title: "Mappings Saved",
        description: `Saved ${mappingArray.length} prospect mapping(s)`,
      });
    } catch (error: any) {
      console.error('Failed to save mappings:', error);
      toast({
        title: "Save Failed",
        description: error.message,
        variant: "destructive"
      });
    }
  };

  const autoMapByEmail = async () => {
    if (!isConnected) return;

    setIsSearching(true);
    try {
      for (const speaker of unmappedSpeakers) {
        if (speaker.email) {
          const { data, error } = await supabase.functions.invoke('outreach-search-prospects', {
            body: { 
              emails: [speaker.email],
              userId: connection?.user_id 
            }
          });

          if (!error && data.prospects?.length > 0) {
            mapSpeakerToProspect(speaker, data.prospects[0]);
          }
        }
      }
    } catch (error: any) {
      console.error('Auto-mapping failed:', error);
      toast({
        title: "Auto-mapping Failed",
        description: error.message,
        variant: "destructive"
      });
    } finally {
      setIsSearching(false);
    }
  };

  if (!isConnected) {
    return (
      <Card>
        <CardContent className="p-6">
          <Alert>
            <AlertCircle className="h-4 w-4" />
            <AlertDescription>
              Please connect your Outreach account to map prospects.
            </AlertDescription>
          </Alert>
        </CardContent>
      </Card>
    );
  }

  return (
    <div className="space-y-6">
      {/* Search Section */}
      <Card>
        <CardHeader>
          <div className="flex items-center gap-3">
            <div className="p-2 bg-blue-50 rounded-lg">
              <Search className="h-5 w-5 text-blue-600" />
            </div>
            <div>
              <CardTitle className="text-lg">Search Prospects</CardTitle>
              <CardDescription>
                Search your Outreach prospects to map to call participants
              </CardDescription>
            </div>
          </div>
        </CardHeader>
        
        <CardContent className="space-y-4">
          <div className="flex gap-2">
            <div className="flex-1">
              <Input
                placeholder="Search by name, email, or company..."
                value={searchTerm}
                onChange={(e) => setSearchTerm(e.target.value)}
                onKeyPress={handleKeyPress}
              />
            </div>
            <Button
              onClick={handleSearch}
              disabled={isSearching || !searchTerm.trim()}
              className="px-6"
            >
              {isSearching ? (
                <>
                  <RefreshCw className="h-4 w-4 mr-2 animate-spin" />
                  Searching...
                </>
              ) : (
                <>
                  <Search className="h-4 w-4 mr-2" />
                  Search
                </>
              )}
            </Button>
            <Button
              variant="outline"
              onClick={autoMapByEmail}
              disabled={isSearching || unmappedSpeakers.filter(s => s.email).length === 0}
            >
              <UserCheck className="h-4 w-4 mr-2" />
              Auto-map
            </Button>
          </div>

          {/* Search Results */}
          {searchResults.length > 0 && (
            <div className="space-y-2">
              <Label className="text-sm font-medium">Search Results</Label>
              <div className="max-h-48 overflow-y-auto space-y-2 border rounded-lg p-2">
                {searchResults.map((prospect) => (
                  <div
                    key={prospect.id}
                    className="flex items-center justify-between p-3 bg-gray-50 rounded-lg hover:bg-gray-100 transition-colors"
                  >
                    <div className="flex-1">
                      <div className="font-medium text-sm">
                        {prospect.attributes.name}
                      </div>
                      <div className="text-xs text-gray-600 flex items-center gap-2">
                        <Mail className="h-3 w-3" />
                        {prospect.attributes.email}
                        {prospect.attributes.company && (
                          <>
                            <Building className="h-3 w-3 ml-2" />
                            {prospect.attributes.company}
                          </>
                        )}
                      </div>
                    </div>
                    
                    <div className="flex items-center gap-2">
                      <Button
                        variant="ghost"
                        size="sm"
                        onClick={() => window.open(
                          `https://app.outreach.io/prospects/${prospect.id}`,
                          '_blank'
                        )}
                        className="h-8 w-8 p-0"
                      >
                        <ExternalLink className="h-3 w-3" />
                      </Button>
                      
                      <Select onValueChange={(speakerName) => {
                        const speaker = unmappedSpeakers.find(s => s.name === speakerName);
                        if (speaker) {
                          mapSpeakerToProspect(speaker, prospect);
                        }
                      }}>
                        <SelectTrigger className="w-40">
                          <SelectValue placeholder="Map to speaker" />
                        </SelectTrigger>
                        <SelectContent>
                          {unmappedSpeakers.map((speaker) => (
                            <SelectItem key={speaker.name} value={speaker.name}>
                              {speaker.name}
                            </SelectItem>
                          ))}
                        </SelectContent>
                      </Select>
                    </div>
                  </div>
                ))}
              </div>
            </div>
          )}
        </CardContent>
      </Card>

      {/* Unmapped Speakers */}
      {unmappedSpeakers.length > 0 && (
        <Card>
          <CardHeader>
            <div className="flex items-center justify-between">
              <div className="flex items-center gap-3">
                <div className="p-2 bg-yellow-50 rounded-lg">
                  <Users className="h-5 w-5 text-yellow-600" />
                </div>
                <div>
                  <CardTitle className="text-lg">Unmapped Speakers</CardTitle>
                  <CardDescription>
                    Call participants not yet mapped to Outreach prospects
                  </CardDescription>
                </div>
              </div>
              <Badge variant="outline">{unmappedSpeakers.length}</Badge>
            </div>
          </CardHeader>
          
          <CardContent>
            <div className="space-y-2">
              {unmappedSpeakers.map((speaker) => (
                <div
                  key={speaker.name}
                  className="flex items-center justify-between p-3 bg-yellow-50 rounded-lg"
                >
                  <div>
                    <div className="font-medium text-sm">{speaker.name}</div>
                    {speaker.email && (
                      <div className="text-xs text-gray-600 flex items-center gap-1">
                        <Mail className="h-3 w-3" />
                        {speaker.email}
                      </div>
                    )}
                    {speaker.company && (
                      <div className="text-xs text-gray-600 flex items-center gap-1">
                        <Building className="h-3 w-3" />
                        {speaker.company}
                      </div>
                    )}
                  </div>
                  
                  <Badge variant="secondary">Unmapped</Badge>
                </div>
              ))}
            </div>
          </CardContent>
        </Card>
      )}

      {/* Current Mappings */}
      {mappings.size > 0 && (
        <Card>
          <CardHeader>
            <div className="flex items-center justify-between">
              <div className="flex items-center gap-3">
                <div className="p-2 bg-green-50 rounded-lg">
                  <CheckCircle className="h-5 w-5 text-green-600" />
                </div>
                <div>
                  <CardTitle className="text-lg">Mapped Prospects</CardTitle>
                  <CardDescription>
                    Speakers successfully mapped to Outreach prospects
                  </CardDescription>
                </div>
              </div>
              <Badge className="bg-green-100 text-green-800">{mappings.size}</Badge>
            </div>
          </CardHeader>
          
          <CardContent className="space-y-4">
            <div className="space-y-2">
              {Array.from(mappings.entries()).map(([speakerName, prospect]) => (
                <div
                  key={speakerName}
                  className="flex items-center justify-between p-3 bg-green-50 rounded-lg"
                >
                  <div className="flex-1">
                    <div className="font-medium text-sm">
                      {speakerName} → {prospect.attributes.name}
                    </div>
                    <div className="text-xs text-gray-600 flex items-center gap-2">
                      <Mail className="h-3 w-3" />
                      {prospect.attributes.email}
                      {prospect.attributes.company && (
                        <>
                          <Building className="h-3 w-3 ml-2" />
                          {prospect.attributes.company}
                        </>
                      )}
                    </div>
                  </div>
                  
                  <div className="flex items-center gap-2">
                    <Button
                      variant="ghost"
                      size="sm"
                      onClick={() => window.open(
                        `https://app.outreach.io/prospects/${prospect.id}`,
                        '_blank'
                      )}
                      className="h-8 w-8 p-0"
                    >
                      <ExternalLink className="h-3 w-3" />
                    </Button>
                    
                    <Button
                      variant="ghost"
                      size="sm"
                      onClick={() => removeSpeakerMapping(speakerName)}
                      className="h-8 w-8 p-0 text-red-600 hover:text-red-700"
                    >
                      <X className="h-3 w-3" />
                    </Button>
                  </div>
                </div>
              ))}
            </div>
            
            <div className="pt-4 border-t">
              <Button 
                onClick={saveMappings}
                className="w-full"
                disabled={mappings.size === 0}
              >
                <CheckCircle className="h-4 w-4 mr-2" />
                Save Mappings ({mappings.size})
              </Button>
            </div>
          </CardContent>
        </Card>
      )}
    </div>
  );
}