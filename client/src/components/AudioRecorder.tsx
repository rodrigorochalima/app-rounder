import React, { useState } from 'react';
import { Mic, Upload } from 'lucide-react';

interface AudioRecorderProps {
  onAudioReady: (audioBlob: Blob, audioFile: File) => void;
  maxDurationSeconds?: number;
}

export function AudioRecorder({ onAudioReady, maxDurationSeconds = 600 }: AudioRecorderProps) {
  const [audioFile, setAudioFile] = useState<File | null>(null);

  const handleFileUpload = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (file) {
      setAudioFile(file);
    }
  };

  const handleSend = () => {
    if (audioFile) {
      onAudioReady(audioFile, audioFile);
      setAudioFile(null);
    }
  };

  return (
    <div className="space-y-4">
      {!audioFile ? (
        <label className="w-full border-2 border-dashed border-gray-300 rounded-lg p-6 flex flex-col items-center justify-center cursor-pointer hover:border-purple-500 transition-colors">
          <Upload className="w-8 h-8 text-gray-400 mb-2" />
          <span className="text-sm text-gray-600">Enviar áudio de feedback</span>
          <span className="text-xs text-gray-400 mt-1">MP3, WAV, M4A, etc. (até {maxDurationSeconds / 60} min)</span>
          <input
            type="file"
            accept="audio/*"
            onChange={handleFileUpload}
            className="hidden"
          />
        </label>
      ) : (
        <div className="bg-green-50 border-2 border-green-500 rounded-lg p-6">
          <p className="text-sm text-green-900 mb-4">✓ {audioFile.name}</p>
          <div className="space-y-3">
            <button
              onClick={handleSend}
              className="w-full bg-green-600 hover:bg-green-700 text-white py-3 rounded-lg font-semibold"
            >
              Enviar Feedback
            </button>
            <button
              onClick={() => setAudioFile(null)}
              className="w-full bg-gray-200 hover:bg-gray-300 text-gray-700 py-3 rounded-lg font-semibold"
            >
              Escolher outro áudio
            </button>
          </div>
        </div>
      )}
    </div>
  );
}
