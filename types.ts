export enum AppStage {
  INPUT = 'INPUT',
  ANALYZING = 'ANALYZING',
  INTERACTING = 'INTERACTING',
  SATISFACTION_CHECK = 'SATISFACTION_CHECK',
  SAVING = 'SAVING',
  COMPLETED = 'COMPLETED'
}

export type LanguageCode = 'es' | 'en' | 'pt' | 'fr' | 'de' | 'zh' | 'ja' | 'ru' | 'ar' | 'hi';

export type ProblemCategory = 'ALGEBRA' | 'ARITHMETIC' | 'GEOMETRY' | 'CALCULUS' | 'OTHERS';

export interface ChatMessage {
  id: string;
  role: 'user' | 'model';
  text: string;
  image?: string; // Base64 or URL for display
  file?: File; // File object for upload
  isThinking?: boolean;
}

export interface FormData {
  problemImage: File | null;
  solutionAttemptType: 'text' | 'video' | 'audio' | 'image';
  solutionText: string;
  solutionVideo: File | null;
  solutionAudioBlob: Blob | null;
  solutionImage: File | null;
  generatedVideoSummary?: string;
  questionType: 'text' | 'audio';
  questionText: string;
  questionAudioBlob: Blob | null;
}

export interface AnalysisResult {
  diagnosis: string;
  isComplex: boolean;
  errorType: 'Conceptual' | 'Execution' | 'Unknown';
}

export interface StoredSession {
  id: string;
  sessionId: string;
  createdAt: any;
  language?: LanguageCode;
  category?: ProblemCategory;
  fileUrls: {
    problemImage?: string;
    solutionVideo?: string;
    solutionAudio?: string;
    solutionImage?: string;
    questionAudio?: string;
  };
  historical: {
    id: string;
    role: 'user' | 'model';
    text: string;
    image?: string;
  }[];
  status: string;
}