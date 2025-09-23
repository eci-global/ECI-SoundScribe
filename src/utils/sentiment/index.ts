// Re-export all sentiment utility functions to maintain API compatibility

export {
  calculateTextSimilarity,
  areMomentsSimilar
} from './similarity';

export {
  calculateMomentQuality,
  filterHighQualityMoments
} from './quality';

export {
  deduplicateMoments
} from './deduplication';

export {
  selectBestMoments
} from './selection';

export {
  validateSentimentData
} from './validation';