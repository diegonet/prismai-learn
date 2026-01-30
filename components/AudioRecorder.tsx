import React, { useState, useRef } from 'react';

interface AudioRecorderProps {
  onAudioReady: (blob: Blob) => void;
  onClear: () => void;
  labels?: {
    record: string;
    stop: string;
    clear: string;
    recorded: string;
  }
}

const AudioRecorder: React.FC<AudioRecorderProps> = ({ onAudioReady, onClear, labels }) => {
  const [isRecording, setIsRecording] = useState(false);
  const [hasRecording, setHasRecording] = useState(false);
  const mediaRecorderRef = useRef<MediaRecorder | null>(null);
  const chunksRef = useRef<Blob[]>([]);

  // Default labels if not provided
  const txt = labels || {
    record: "Record Audio",
    stop: "Stop Recording",
    clear: "Clear",
    recorded: "Audio Recorded"
  };

  const startRecording = async () => {
    try {
      const stream = await navigator.mediaDevices.getUserMedia({ audio: true });
      const mediaRecorder = new MediaRecorder(stream);
      mediaRecorderRef.current = mediaRecorder;
      chunksRef.current = [];

      mediaRecorder.ondataavailable = (e) => {
        if (e.data.size > 0) {
          chunksRef.current.push(e.data);
        }
      };

      mediaRecorder.onstop = () => {
        const blob = new Blob(chunksRef.current, { type: 'audio/mp3' });
        onAudioReady(blob);
        setHasRecording(true);
        stream.getTracks().forEach(track => track.stop());
      };

      mediaRecorder.start();
      setIsRecording(true);
    } catch (err) {
      console.error("Error accessing microphone:", err);
      alert("Microphone access denied or unavailable.");
    }
  };

  const stopRecording = () => {
    if (mediaRecorderRef.current && isRecording) {
      mediaRecorderRef.current.stop();
      setIsRecording(false);
    }
  };

  const reset = () => {
    setHasRecording(false);
    chunksRef.current = [];
    onClear();
  };

  return (
    <div className="flex items-center gap-3">
      {!isRecording && !hasRecording && (
        <button
          onClick={startRecording}
          type="button"
          className="flex items-center gap-2 px-4 py-2 bg-red-100 text-red-700 rounded-full hover:bg-red-200 transition-colors text-sm font-medium"
        >
          <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M19 11a7 7 0 01-7 7m0 0a7 7 0 01-7-7m7 7v4m0 0H8m4 0h4m-4-8a3 3 0 01-3-3V5a3 3 0 116 0v6a3 3 0 01-3 3z"></path></svg>
          {txt.record}
        </button>
      )}

      {isRecording && (
        <button
          onClick={stopRecording}
          type="button"
          className="flex items-center gap-2 px-4 py-2 bg-red-600 text-white rounded-full hover:bg-red-700 animate-pulse text-sm font-medium"
        >
          <div className="w-2 h-2 bg-white rounded-full"></div>
          {txt.stop}
        </button>
      )}

      {hasRecording && (
        <div className="flex items-center gap-2">
          <span className="text-sm text-green-600 font-medium flex items-center gap-1">
            <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M5 13l4 4L19 7"></path></svg>
            {txt.recorded}
          </span>
          <button
            onClick={reset}
            type="button"
            className="text-xs text-gray-500 underline hover:text-gray-700"
          >
            {txt.clear}
          </button>
        </div>
      )}
    </div>
  );
};

export default AudioRecorder;