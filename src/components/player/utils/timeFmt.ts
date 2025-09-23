export function formatTime(seconds: number): string {
  if (isNaN(seconds) || seconds < 0) return '0:00';
  
  const hours = Math.floor(seconds / 3600);
  const minutes = Math.floor((seconds % 3600) / 60);
  const remainingSeconds = Math.floor(seconds % 60);
  
  if (hours > 0) {
    return `${hours}:${minutes.toString().padStart(2, '0')}:${remainingSeconds.toString().padStart(2, '0')}`;
  }
  
  return `${minutes}:${remainingSeconds.toString().padStart(2, '0')}`;
}

export function parseTimeToSeconds(timeString: string): number {
  const parts = timeString.split(':').map(Number);
  
  if (parts.length === 2) {
    const [minutes, seconds] = parts;
    return minutes * 60 + seconds;
  }
  
  if (parts.length === 3) {
    const [hours, minutes, seconds] = parts;
    return hours * 3600 + minutes * 60 + seconds;
  }
  
  return 0;
}

export function getProgressPercentage(currentTime: number, duration: number): number {
  if (duration === 0) return 0;
  return Math.max(0, Math.min(100, (currentTime / duration) * 100));
}

export function secondsToPercentage(seconds: number, duration: number): number {
  if (duration === 0) return 0;
  return Math.max(0, Math.min(100, (seconds / duration) * 100));
}