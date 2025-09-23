
import React from 'react';

export interface FormattedTextProps {
  text: string;
  className?: string;
}

export function formatAIText(text: string): React.ReactElement[] {
  if (!text) return [];

  // First, normalize line breaks - convert \r\n to \n and handle double spaces
  const normalizedText = text.replace(/\r\n/g, '\n').replace(/\r/g, '\n');
  
  // Split by newlines but also handle cases where bullet points might be on the same line
  const lines = normalizedText
    .split('\n')
    .flatMap(line => {
      // If a line contains multiple bullet points separated by spaces, split them
      if (line.includes(' • ') && !line.startsWith('•')) {
        return line.split(' • ').map((part, i) => i === 0 ? part : `• ${part}`);
      }
      return [line];
    });

  const elements: React.ReactElement[] = [];

  lines.forEach((line, index) => {
    const trimmedLine = line.trim();
    if (trimmedLine.length === 0 && index > 0 && index < lines.length - 1) {
      // Skip empty lines unless they're meaningful separators
      return;
    }

    const key = `line-${index}`;

    // Simple bold text formatting with **text**
    const formatInlineText = (text: string) => {
      const parts = text.split(/(\*\*.*?\*\*)/g);
      return parts.map((part, i) => {
        if (part.startsWith('**') && part.endsWith('**')) {
          const boldText = part.slice(2, -2);
          return <strong key={i} className="font-semibold text-slate-900">{boldText}</strong>;
        }
        return part;
      });
    };

    // Handle section headers - check for common patterns
    const headerPatterns = [
      'Meeting Summary:', 'Key Points:', 'Decisions:', 'Action Items:', 
      'Participants:', 'Purpose:', 'Next Steps:', 'Topics:', 'Discussion:',
      'Summary:', 'Insights:', 'Key Takeaways:', 'Main Points:', 'Highlights:',
      'Strengths:', 'Improvements:', 'Recommendations:', 'Analysis:',
      'Conversation Summary:'
    ];
    
    const isHeader = headerPatterns.some(pattern => 
      trimmedLine.startsWith(pattern) || 
      (trimmedLine.includes(pattern) && !trimmedLine.startsWith('•') && !trimmedLine.startsWith('-'))
    );

    if (isHeader) {
      // Find the first colon to split label from content
      const colonIndex = trimmedLine.indexOf(':');
      if (colonIndex > -1) {
        const label = trimmedLine.substring(0, colonIndex + 1);
        const content = trimmedLine.substring(colonIndex + 1).trim();
        
        if (content && !content.startsWith('-') && !content.startsWith('•')) {
          // Inline header with content
          elements.push(
            <p key={key} className="text-sm text-slate-700 mb-2 leading-relaxed">
              <strong className="font-semibold text-slate-900">{label}</strong> {formatInlineText(content)}
            </p>
          );
        } else {
          // Standalone header - this is what we want for "Key Points:"
          elements.push(
            <h4 key={key} className="font-semibold text-sm text-slate-900 mt-3 mb-1">
              {label}
            </h4>
          );
          // If content starts with bullet, add it as the next line
          if (content && (content.startsWith('-') || content.startsWith('•'))) {
            const bulletContent = content.replace(/^[•\-]\s*/, '');
            elements.push(
              <li key={`${key}-bullet`} className="text-sm text-slate-700 mb-1.5 ml-6 list-disc leading-relaxed">
                {formatInlineText(bulletContent)}
              </li>
            );
          }
        }
      }
    }
    // Handle bullet points with various markers (including when they're at the start of a line)
    else if (trimmedLine.match(/^[•\-\*]\s+/) || trimmedLine.match(/^[•\-\*]/)) {
      const content = trimmedLine.replace(/^[•\-\*]\s*/, '');
      if (content.trim()) {
        elements.push(
          <li key={key} className="text-sm text-slate-700 mb-1.5 ml-6 list-disc leading-relaxed">
            {formatInlineText(content)}
          </li>
        );
      }
    }
    // Handle numbered lists
    else if (trimmedLine.match(/^\d+\.\s+/)) {
      const content = trimmedLine.replace(/^\d+\.\s+/, '');
      elements.push(
        <li key={key} className="text-sm text-slate-700 mb-2 ml-6 list-decimal leading-relaxed pl-1 font-medium">
          {formatInlineText(content)}
        </li>
      );
    }
    // Handle regular paragraphs
    else if (trimmedLine.length > 0) {
      elements.push(
        <p key={key} className="text-sm text-slate-700 mb-2 leading-relaxed">
          {formatInlineText(trimmedLine)}
        </p>
      );
    }
  });

  // Wrap consecutive list items in ul/ol tags
  const finalElements: React.ReactElement[] = [];
  let currentList: React.ReactElement[] = [];
  let listType: 'ul' | 'ol' | null = null;

  elements.forEach((element, index) => {
    if (element.type === 'li') {
      // Determine list type from the element's className
      const isOrdered = element.props.className.includes('list-decimal');
      const newListType = isOrdered ? 'ol' : 'ul';
      
      if (listType && listType !== newListType) {
        // Different list type, close current list
        if (currentList.length > 0) {
          const ListTag = listType;
          finalElements.push(
            <ListTag key={`list-${finalElements.length}`} className="mb-3">
              {currentList}
            </ListTag>
          );
          currentList = [];
        }
      }
      
      listType = newListType;
      currentList.push(element);
    } else {
      // Not a list item, close any open list
      if (currentList.length > 0 && listType) {
        const ListTag = listType;
        finalElements.push(
          <ListTag key={`list-${finalElements.length}`} className="mb-4 pl-2">
            {currentList}
          </ListTag>
        );
        currentList = [];
        listType = null;
      }
      finalElements.push(element);
    }
  });

  // Close any remaining list
  if (currentList.length > 0 && listType) {
    const ListTag = listType;
    finalElements.push(
      <ListTag key={`list-${finalElements.length}`} className="mb-4 pl-2">
        {currentList}
      </ListTag>
    );
  }

  return finalElements;
}

export function FormattedText({ text, className = "" }: FormattedTextProps) {
  const elements = formatAIText(text);

  return (
    <div className={`formatted-ai-text ${className}`}>
      {elements}
    </div>
  );
}

export function cleanAIText(text: string): string {
  if (!text) return '';

  // Preserve line breaks and formatting structure
  return text
    // Preserve existing line breaks
    .split('\n')
    .map(line => line.trim())
    // Remove empty lines but keep structure
    .filter((line, index, arr) => {
      // Keep non-empty lines
      if (line.length > 0) return true;
      // Keep empty lines between sections
      if (index > 0 && index < arr.length - 1) {
        const prevLine = arr[index - 1];
        const nextLine = arr[index + 1];
        // Keep empty line after headers or before bullet points
        return prevLine.endsWith(':') || nextLine.match(/^[•\-\*]\s+/) || nextLine.match(/^\d+\.\s+/);
      }
      return false;
    })
    .join('\n')
    .trim();
}
