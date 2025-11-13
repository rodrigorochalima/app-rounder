import JSZip from "jszip";
import { transcribeAudio } from "./audioTranscription";

export interface WhatsAppMessage {
  date: string;
  time: string;
  sender: string;
  content: string;
  type: 'text' | 'audio' | 'image' | 'file';
}

/**
 * Processa ZIP do WhatsApp e extrai transcrição estruturada
 */
export async function processWhatsAppZip(file: File, apiKey: string): Promise<string> {
  try {
    // Carregar o ZIP
    const zip = await JSZip.loadAsync(file);
    
    // Encontrar o arquivo _chat.txt
    const chatFile = zip.file("_chat.txt");
    if (!chatFile) {
      throw new Error("Arquivo _chat.txt não encontrado no ZIP");
    }
    
    // Ler o conteúdo do chat
    const chatContent = await chatFile.async("text");
    
    // Processar as linhas do chat
    const messages: WhatsAppMessage[] = [];
    const lines = chatContent.split("\n");
    
    // Regex para analisar cada linha: [DD/MM/YYYY, HH:MM:SS] Remetente: Mensagem
    const messageRegex = /^\[(\d{2}\/\d{2}\/\d{4}), (\d{2}:\d{2}:\d{2})\] ([^:]+): (.*)$/;
    
    for (let i = 0; i < lines.length; i++) {
      let line = lines[i].replace(/[\u200E\u200F\u202A\u202B\u202C\u202D\u202E]/g, '').trim();
      if (!line) continue;
      
      const match = line.match(messageRegex);
      if (match) {
        const [, dateStr, timeStrFull, sender, content] = match;
        
        // Extrair apenas HH:MM
        const timeStr = timeStrFull.substring(0, 5);
        
        // Detectar tipo de mensagem
        let type: WhatsAppMessage["type"] = "text";
        let finalContent = content;
        
        // Ignorar mensagens do sistema
        const systemMessages = [
          /Ligação de voz/i,
          /Ligação de vídeo/i,
          /As mensagens e ligações são protegidas/i,
          /está na sua lista de contatos/i,
          /convidou você para participar/i,
          /Mensagem apagada/i,
          /Você apagou esta mensagem/i,
        ];
        
        let isSystemMessage = false;
        for (const pattern of systemMessages) {
          if (pattern.test(content)) {
            isSystemMessage = true;
            break;
          }
        }
        
        if (isSystemMessage) continue;
        
        // Verificar se há referência a arquivo de mídia
        const mediaPatterns = [
          /‎<anexado: (.+?)>/i,
          /<anexado: (.+?)>/i,
          /\(arquivo: (.+?)\)/i,
        ];
        
        let mediaFileName: string | null = null;
        for (const pattern of mediaPatterns) {
          const mediaMatch = content.match(pattern);
          if (mediaMatch) {
            mediaFileName = mediaMatch[1];
            break;
          }
        }
        
        // Se encontrou referência a mídia, processar
        if (mediaFileName) {
          const mediaFileInZip = zip.file(mediaFileName) || 
                                 zip.file(`media/${mediaFileName}`) ||
                                 zip.file(`WhatsApp/${mediaFileName}`);
          
          if (mediaFileInZip) {
            // Detectar tipo de mídia
            const ext = mediaFileName.split('.').pop()?.toLowerCase();
            
            if (['mp3', 'm4a', 'ogg', 'opus', 'wav'].includes(ext || '')) {
              type = 'audio';
              
              // Transcrever áudio
              try {
                const blob = await mediaFileInZip.async("blob");
                const audioFile = new File([blob], mediaFileName, { type: `audio/${ext}` });
                const transcription = await transcribeAudio(audioFile, apiKey);
                finalContent = `[ÁUDIO TRANSCRITO]: ${transcription}`;
              } catch (error) {
                console.error('Erro ao transcrever áudio:', error);
                finalContent = `[ÁUDIO: ${mediaFileName}]`;
              }
            } else if (['jpg', 'jpeg', 'png', 'gif', 'webp'].includes(ext || '')) {
              type = 'image';
              finalContent = `[IMAGEM: ${mediaFileName}]`;
            } else {
              type = 'file';
              finalContent = `[ARQUIVO: ${mediaFileName}]`;
            }
          }
        }
        
        messages.push({
          date: dateStr,
          time: timeStr,
          sender: sender.trim(),
          content: finalContent,
          type,
        });
      }
    }
    
    // Ordenar por data e hora (cronológico)
    messages.sort((a, b) => {
      const dateA = a.date.split('/').reverse().join('') + a.time.replace(':', '');
      const dateB = b.date.split('/').reverse().join('') + b.time.replace(':', '');
      return dateA.localeCompare(dateB);
    });
    
    // Estruturar em texto
    let transcricao = "TRANSCRIÇÃO DO WHATSAPP\n";
    transcricao += "=".repeat(50) + "\n\n";
    
    for (const msg of messages) {
      transcricao += `[${msg.date} ${msg.time}] ${msg.sender}:\n`;
      transcricao += `${msg.content}\n\n`;
    }
    
    return transcricao;
    
  } catch (error) {
    console.error('Erro ao processar ZIP do WhatsApp:', error);
    throw new Error('Erro ao processar ZIP do WhatsApp: ' + (error instanceof Error ? error.message : 'Erro desconhecido'));
  }
}
