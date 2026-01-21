import { useState, useRef, useEffect } from 'react';
import { Mic, Square, Play, Pause, Download, Settings, Trash2 } from 'lucide-react';
import './AudioRecorderAdvanced.css';

interface AudioRecorderAdvancedProps {
  onAudioRecorded: (audioBlob: Blob, audioUrl: string) => void;
  onClose?: () => void;
}

type AudioFormat = 'audio/webm' | 'audio/mp4' | 'audio/ogg' | 'audio/wav';
type SampleRate = 44100 | 48000 | 96000;
type Bitrate = 128000 | 192000 | 256000 | 320000;

interface AudioSettings {
  format: AudioFormat;
  sampleRate: SampleRate;
  bitrate: Bitrate;
  echoCancellation: boolean;
  noiseSuppression: boolean;
  autoGainControl: boolean;
}

export function AudioRecorderAdvanced({ onAudioRecorded, onClose }: AudioRecorderAdvancedProps) {
  const [isRecording, setIsRecording] = useState(false);
  const [isPaused, setIsPaused] = useState(false);
  const [audioUrl, setAudioUrl] = useState<string | null>(null);
  const [audioBlob, setAudioBlob] = useState<Blob | null>(null);
  const [recordingTime, setRecordingTime] = useState(0);
  const [isPlaying, setIsPlaying] = useState(false);
  const [showSettings, setShowSettings] = useState(false);
  const [volume, setVolume] = useState(1);
  
  const [settings, setSettings] = useState<AudioSettings>({
    format: 'audio/webm',
    sampleRate: 48000,
    bitrate: 192000,
    echoCancellation: true,
    noiseSuppression: true,
    autoGainControl: true
  });

  const mediaRecorderRef = useRef<MediaRecorder | null>(null);
  const audioChunksRef = useRef<Blob[]>([]);
  const audioRef = useRef<HTMLAudioElement | null>(null);
  const timerRef = useRef<NodeJS.Timeout | null>(null);
  const streamRef = useRef<MediaStream | null>(null);

  // Limpar recursos ao desmontar
  useEffect(() => {
    return () => {
      if (timerRef.current) clearInterval(timerRef.current);
      if (streamRef.current) {
        streamRef.current.getTracks().forEach(track => track.stop());
      }
      if (audioUrl) URL.revokeObjectURL(audioUrl);
    };
  }, [audioUrl]);

  // Formatar tempo (MM:SS)
  const formatTime = (seconds: number): string => {
    const mins = Math.floor(seconds / 60);
    const secs = seconds % 60;
    return `${mins.toString().padStart(2, '0')}:${secs.toString().padStart(2, '0')}`;
  };

  // Iniciar gravação
  const startRecording = async () => {
    try {
      // Solicitar permissão de microfone com configurações avançadas
      const stream = await navigator.mediaDevices.getUserMedia({
        audio: {
          sampleRate: settings.sampleRate,
          echoCancellation: settings.echoCancellation,
          noiseSuppression: settings.noiseSuppression,
          autoGainControl: settings.autoGainControl,
          channelCount: 2 // Stereo
        }
      });

      streamRef.current = stream;

      // Verificar formato suportado
      let mimeType = settings.format;
      if (!MediaRecorder.isTypeSupported(mimeType)) {
        console.warn(`${mimeType} não suportado, usando audio/webm`);
        mimeType = 'audio/webm';
      }

      // Criar MediaRecorder com configurações
      const mediaRecorder = new MediaRecorder(stream, {
        mimeType,
        audioBitsPerSecond: settings.bitrate
      });

      audioChunksRef.current = [];

      mediaRecorder.ondataavailable = (event) => {
        if (event.data.size > 0) {
          audioChunksRef.current.push(event.data);
        }
      };

      mediaRecorder.onstop = () => {
        const blob = new Blob(audioChunksRef.current, { type: mimeType });
        const url = URL.createObjectURL(blob);
        setAudioBlob(blob);
        setAudioUrl(url);
        
        // Parar stream
        if (streamRef.current) {
          streamRef.current.getTracks().forEach(track => track.stop());
        }
      };

      mediaRecorderRef.current = mediaRecorder;
      mediaRecorder.start(100); // Capturar dados a cada 100ms
      setIsRecording(true);
      setIsPaused(false);

      // Iniciar timer
      setRecordingTime(0);
      timerRef.current = setInterval(() => {
        setRecordingTime(prev => prev + 1);
      }, 1000);

    } catch (error) {
      console.error('Erro ao acessar microfone:', error);
      alert('Erro ao acessar o microfone. Verifique as permissões.');
    }
  };

  // Pausar gravação
  const pauseRecording = () => {
    if (mediaRecorderRef.current && mediaRecorderRef.current.state === 'recording') {
      mediaRecorderRef.current.pause();
      setIsPaused(true);
      if (timerRef.current) clearInterval(timerRef.current);
    }
  };

  // Retomar gravação
  const resumeRecording = () => {
    if (mediaRecorderRef.current && mediaRecorderRef.current.state === 'paused') {
      mediaRecorderRef.current.resume();
      setIsPaused(false);
      timerRef.current = setInterval(() => {
        setRecordingTime(prev => prev + 1);
      }, 1000);
    }
  };

  // Parar gravação
  const stopRecording = () => {
    if (mediaRecorderRef.current && mediaRecorderRef.current.state !== 'inactive') {
      mediaRecorderRef.current.stop();
      setIsRecording(false);
      setIsPaused(false);
      if (timerRef.current) clearInterval(timerRef.current);
    }
  };

  // Play/Pause do áudio gravado
  const togglePlayback = () => {
    if (!audioRef.current) return;

    if (isPlaying) {
      audioRef.current.pause();
      setIsPlaying(false);
    } else {
      audioRef.current.play();
      setIsPlaying(true);
    }
  };

  // Download do áudio
  const downloadAudio = () => {
    if (!audioBlob || !audioUrl) return;

    const a = document.createElement('a');
    a.href = audioUrl;
    a.download = `round_${new Date().toISOString().split('T')[0]}.${settings.format.split('/')[1]}`;
    document.body.appendChild(a);
    a.click();
    document.body.removeChild(a);
  };

  // Deletar gravação
  const deleteRecording = () => {
    if (audioUrl) URL.revokeObjectURL(audioUrl);
    setAudioUrl(null);
    setAudioBlob(null);
    setRecordingTime(0);
    setIsPlaying(false);
  };

  // Confirmar e usar gravação
  const confirmRecording = () => {
    if (audioBlob && audioUrl) {
      onAudioRecorded(audioBlob, audioUrl);
      if (onClose) onClose();
    }
  };

  return (
    <div className="audio-recorder-advanced">
      <div className="audio-recorder-header">
        <h3>🎙️ Gravar Round</h3>
        <button onClick={() => setShowSettings(!showSettings)} className="btn-settings">
          <Settings size={20} />
        </button>
      </div>

      {/* Configurações */}
      {showSettings && (
        <div className="audio-settings">
          <h4>Configurações de Áudio</h4>
          
          <div className="setting-group">
            <label>Formato:</label>
            <select 
              value={settings.format} 
              onChange={(e) => setSettings({...settings, format: e.target.value as AudioFormat})}
              disabled={isRecording}
            >
              <option value="audio/webm">WebM (recomendado)</option>
              <option value="audio/mp4">MP4</option>
              <option value="audio/ogg">OGG</option>
              <option value="audio/wav">WAV</option>
            </select>
          </div>

          <div className="setting-group">
            <label>Taxa de Amostragem:</label>
            <select 
              value={settings.sampleRate} 
              onChange={(e) => setSettings({...settings, sampleRate: Number(e.target.value) as SampleRate})}
              disabled={isRecording}
            >
              <option value="44100">44.1 kHz (CD Quality)</option>
              <option value="48000">48 kHz (Professional)</option>
              <option value="96000">96 kHz (High-End)</option>
            </select>
          </div>

          <div className="setting-group">
            <label>Bitrate:</label>
            <select 
              value={settings.bitrate} 
              onChange={(e) => setSettings({...settings, bitrate: Number(e.target.value) as Bitrate})}
              disabled={isRecording}
            >
              <option value="128000">128 kbps</option>
              <option value="192000">192 kbps (recomendado)</option>
              <option value="256000">256 kbps</option>
              <option value="320000">320 kbps (máxima)</option>
            </select>
          </div>

          <div className="setting-group-checkbox">
            <label>
              <input 
                type="checkbox" 
                checked={settings.echoCancellation}
                onChange={(e) => setSettings({...settings, echoCancellation: e.target.checked})}
                disabled={isRecording}
              />
              Cancelamento de Eco
            </label>
          </div>

          <div className="setting-group-checkbox">
            <label>
              <input 
                type="checkbox" 
                checked={settings.noiseSuppression}
                onChange={(e) => setSettings({...settings, noiseSuppression: e.target.checked})}
                disabled={isRecording}
              />
              Supressão de Ruído
            </label>
          </div>

          <div className="setting-group-checkbox">
            <label>
              <input 
                type="checkbox" 
                checked={settings.autoGainControl}
                onChange={(e) => setSettings({...settings, autoGainControl: e.target.checked})}
                disabled={isRecording}
              />
              Controle Automático de Ganho
            </label>
          </div>
        </div>
      )}

      {/* Visualizador de Tempo */}
      <div className="recording-time">
        {formatTime(recordingTime)}
      </div>

      {/* Controles de Gravação */}
      <div className="recording-controls">
        {!isRecording && !audioUrl && (
          <button onClick={startRecording} className="btn-record">
            <Mic size={24} />
            Iniciar Gravação
          </button>
        )}

        {isRecording && !isPaused && (
          <>
            <button onClick={pauseRecording} className="btn-pause">
              <Pause size={24} />
              Pausar
            </button>
            <button onClick={stopRecording} className="btn-stop">
              <Square size={24} />
              Parar
            </button>
          </>
        )}

        {isRecording && isPaused && (
          <>
            <button onClick={resumeRecording} className="btn-resume">
              <Play size={24} />
              Retomar
            </button>
            <button onClick={stopRecording} className="btn-stop">
              <Square size={24} />
              Parar
            </button>
          </>
        )}
      </div>

      {/* Player de Áudio */}
      {audioUrl && (
        <div className="audio-player">
          <h4>Preview da Gravação</h4>
          <audio 
            ref={audioRef}
            src={audioUrl}
            onEnded={() => setIsPlaying(false)}
            onPlay={() => setIsPlaying(true)}
            onPause={() => setIsPlaying(false)}
          />
          
          <div className="player-controls">
            <button onClick={togglePlayback} className="btn-play">
              {isPlaying ? <Pause size={20} /> : <Play size={20} />}
              {isPlaying ? 'Pausar' : 'Reproduzir'}
            </button>

            <div className="volume-control">
              <label>Volume:</label>
              <input 
                type="range" 
                min="0" 
                max="1" 
                step="0.1"
                value={volume}
                onChange={(e) => {
                  const vol = parseFloat(e.target.value);
                  setVolume(vol);
                  if (audioRef.current) audioRef.current.volume = vol;
                }}
              />
              <span>{Math.round(volume * 100)}%</span>
            </div>
          </div>

          <div className="audio-actions">
            <button onClick={downloadAudio} className="btn-download">
              <Download size={18} />
              Baixar
            </button>
            <button onClick={deleteRecording} className="btn-delete">
              <Trash2 size={18} />
              Deletar
            </button>
            <button onClick={confirmRecording} className="btn-confirm">
              Usar esta Gravação
            </button>
          </div>
        </div>
      )}

      {/* Informações */}
      <div className="audio-info">
        <p><strong>Formato:</strong> {settings.format.split('/')[1].toUpperCase()}</p>
        <p><strong>Taxa:</strong> {(settings.sampleRate / 1000).toFixed(1)} kHz</p>
        <p><strong>Bitrate:</strong> {settings.bitrate / 1000} kbps</p>
      </div>
    </div>
  );
}
