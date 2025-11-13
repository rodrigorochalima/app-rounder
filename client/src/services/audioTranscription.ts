import Groq from 'groq-sdk';

export async function transcribeAudio(audioFile: File, apiKey: string): Promise<string> {
  try {
    const groq = new Groq({
      apiKey: apiKey,
      dangerouslyAllowBrowser: true,
    });

    // Groq aceita vários formatos de áudio
    const transcription = await groq.audio.transcriptions.create({
      file: audioFile,
      model: 'whisper-large-v3',
      language: 'pt', // Português
      response_format: 'text',
    });

    return transcription as unknown as string;
  } catch (error) {
    console.error('Erro na transcrição:', error);
    throw new Error('Erro ao transcrever áudio: ' + (error instanceof Error ? error.message : 'Erro desconhecido'));
  }
}
