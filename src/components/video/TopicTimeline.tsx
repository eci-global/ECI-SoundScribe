
import React from 'react';
import { ChevronDown, Users, MessageSquare } from 'lucide-react';
import { useVideoPlayer } from '@/contexts/VideoPlayerContext';
import { parseSpeakers, parseTopics } from '@/utils/speakerParser';
import { 
  Accordion,
  AccordionContent,
  AccordionItem,
  AccordionTrigger,
} from '@/components/ui/accordion';
import { cn } from '@/lib/utils';

export default function TopicTimeline() {
  const { state, dispatch } = useVideoPlayer();
  
  const speakers = parseSpeakers('');
  const topics = parseTopics('');
  
  const handleSpeakerClick = (speaker: typeof speakers[0]) => {
    dispatch({ type: 'SET_TIME', payload: speaker.startTime });
    dispatch({ type: 'SELECT_SPEAKER', payload: speaker.name });
    console.log('Jumped to speaker:', speaker.name);
  };

  const handleTopicClick = (topic: typeof topics[0]) => {
    dispatch({ type: 'SET_TIME', payload: topic.startTime });
    dispatch({ type: 'SELECT_TOPIC', payload: topic.name });
    console.log('Jumped to topic:', topic.name);
  };

  const maxSpeakerTime = Math.max(...speakers.map(s => s.totalTime));
  const maxTopicDuration = Math.max(...topics.map(t => t.duration));

  return (
    <div className="bg-white/90 backdrop-blur-md rounded-3xl shadow-lg overflow-hidden">
      <Accordion type="multiple" defaultValue={["speakers", "topics"]}>
        {/* Speakers Section */}
        <AccordionItem value="speakers" className="border-b border-eci-gray-200">
          <AccordionTrigger className="px-6 py-4 hover:no-underline">
            <div className="flex items-center space-x-3">
              <Users className="w-5 h-5 text-brand-red" strokeWidth={1.5} />
              <span className="text-title-small font-semibold text-eci-gray-800">
                Speakers ({speakers.length})
              </span>
            </div>
          </AccordionTrigger>
          <AccordionContent className="px-6 pb-6">
            <div className="space-y-4">
              {speakers.map((speaker, index) => {
                const widthPercent = (speaker.totalTime / maxSpeakerTime) * 100;
                const isSelected = state.selectedSpeaker === speaker.name;
                
                return (
                  <div key={index} className="space-y-2">
                    <div className="flex items-center justify-between">
                      <span className="text-body font-medium text-eci-gray-700">
                        {speaker.name}
                      </span>
                      <span className="text-body-small text-eci-gray-500">
                        {Math.floor(speaker.totalTime / 60)}:{(speaker.totalTime % 60).toString().padStart(2, '0')}
                      </span>
                    </div>
                    
                    <button
                      onClick={() => handleSpeakerClick(speaker)}
                      className={cn(
                        "w-full h-8 rounded-lg transition-all duration-200 relative overflow-hidden focus:outline-none focus:ring-2 focus:ring-brand-red group",
                        isSelected ? "ring-2 ring-brand-red" : ""
                      )}
                    >
                      {/* Background */}
                      <div className="absolute inset-0 bg-eci-gray-200 rounded-lg" />
                      
                      {/* Speaker Bar */}
                      <div 
                        className={cn(
                          "absolute top-0 left-0 h-full rounded-lg transition-all duration-300",
                          isSelected 
                            ? "bg-brand-red" 
                            : "bg-eci-gray-400 group-hover:bg-brand-red/80"
                        )}
                        style={{ width: `${widthPercent}%` }}
                      />
                      
                      {/* Speaker Segments */}
                      {speaker.segments.map((segment, segIndex) => (
                        <div
                          key={segIndex}
                          className="absolute top-1 bottom-1 bg-white/30 rounded-sm"
                          style={{
                            left: `${(segment.start / speaker.totalTime) * widthPercent}%`,
                            width: `${((segment.end - segment.start) / speaker.totalTime) * widthPercent}%`
                          }}
                        />
                      ))}
                    </button>
                  </div>
                );
              })}
            </div>
          </AccordionContent>
        </AccordionItem>

        {/* Topics Section */}
        <AccordionItem value="topics">
          <AccordionTrigger className="px-6 py-4 hover:no-underline">
            <div className="flex items-center space-x-3">
              <MessageSquare className="w-5 h-5 text-brand-red" strokeWidth={1.5} />
              <span className="text-title-small font-semibold text-eci-gray-800">
                Topics ({topics.length})
              </span>
            </div>
          </AccordionTrigger>
          <AccordionContent className="px-6 pb-6">
            <div className="space-y-4">
              {topics.map((topic, index) => {
                const widthPercent = (topic.duration / maxTopicDuration) * 100;
                const isSelected = state.selectedTopic === topic.name;
                
                return (
                  <div key={index} className="space-y-2">
                    <div className="flex items-center justify-between">
                      <span className="text-body font-medium text-eci-gray-700">
                        {topic.name}
                      </span>
                      <span className="text-body-small text-eci-gray-500">
                        {Math.floor(topic.duration / 60)}:{(topic.duration % 60).toString().padStart(2, '0')}
                      </span>
                    </div>
                    
                    <button
                      onClick={() => handleTopicClick(topic)}
                      className={cn(
                        "w-full h-6 rounded-lg transition-all duration-200 relative overflow-hidden focus:outline-none focus:ring-2 focus:ring-brand-red group",
                        isSelected ? "ring-2 ring-brand-red" : ""
                      )}
                    >
                      {/* Background */}
                      <div className="absolute inset-0 bg-eci-gray-200 rounded-lg" />
                      
                      {/* Topic Bar */}
                      <div 
                        className={cn(
                          "absolute top-0 left-0 h-full rounded-lg transition-all duration-300",
                          isSelected 
                            ? "bg-brand-red" 
                            : "bg-eci-blue group-hover:bg-brand-red/80"
                        )}
                        style={{ width: `${widthPercent}%` }}
                      />
                    </button>
                  </div>
                );
              })}
            </div>
          </AccordionContent>
        </AccordionItem>
      </Accordion>
    </div>
  );
}
