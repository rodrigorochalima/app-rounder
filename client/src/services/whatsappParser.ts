import JSZip from "jszip";
import { TimelineMessage } from "@/types";

/**
 * Processa um arquivo ZIP exportado do WhatsApp e extrai a linha do tempo de mensagens
 */
export async function parseWhatsAppZip(file: File): Promise<TimelineMessage[]> {
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
    const timeline: TimelineMessage[] = [];
    const lines = chatContent.split("\n");
    
    // Regex para analisar cada linha: [DD/MM/YYYY, HH:MM:SS] Remetente: Mensagem
    // Formato real do WhatsApp exportado
    const messageRegex = /^\[(\d{2}\/\d{2}\/\d{4}), (\d{2}:\d{2}:\d{2})\] ([^:]+): (.*)$/;
    
    for (let i = 0; i < lines.length; i++) {
      // Remover caracteres invisíveis (LEFT-TO-RIGHT MARK e similares) e espaços
      let line = lines[i].replace(/[\u200E\u200F\u202A\u202B\u202C\u202D\u202E]/g, '').trim();
      if (!line) continue;
      
      const match = line.match(messageRegex);
      if (match) {
        const [, dateStr, timeStrFull, sender, content] = match;
        
        // Extrair apenas HH:MM (remover segundos)
        const timeStr = timeStrFull.substring(0, 5);
        
        // Converter data de DD/MM/YYYY para YYYY-MM-DD
        const [day, month, year] = dateStr.split("/");
        const fullDate = `${year}-${month}-${day}`;
        
        // Detectar tipo de mensagem
        let type: TimelineMessage["type"] = "text";
        let mediaFile: File | undefined;
        let mediaUrl: string | undefined;
        let finalContent = content;
        
        // Ignorar mensagens do sistema
        const systemMessages = [
          /‎Ligação de voz/i,
          /‎Ligação de vídeo/i,
          /‎As mensagens e ligações são protegidas/i,
          /‎está na sua lista de contatos/i,
          /convidou você para participar/i,
          /‎Mensagem apagada/i,
          /‎Você apagou esta mensagem/i,
        ];
        
        let isSystemMessage = false;
        for (const pattern of systemMessages) {
          if (pattern.test(content)) {
            isSystemMessage = true;
            break;
          }
        }
        
        if (isSystemMessage) {
          continue; // Pular mensagens do sistema
        }
        
        // Verificar se há referência a arquivo de mídia
        // Padrão real do WhatsApp: ‎<anexado: arquivo.ext>
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
        
        // Se encontrou referência a mídia, tentar localizar o arquivo no ZIP
        if (mediaFileName) {
          // Tentar encontrar o arquivo (pode estar na raiz ou em subpastas)
          const mediaFileInZip = zip.file(mediaFileName) || 
                                 zip.file(`media/${mediaFileName}`) ||
                                 zip.file(`WhatsApp/${mediaFileName}`);
          
          if (mediaFileInZip) {
            // Obter o blob do arquivo
            const blob = await mediaFileInZip.async("blob");
            
            // Determinar o tipo de mídia pela extensão
            const ext = mediaFileName.split(".").pop()?.toLowerCase();
            let mimeType = "application/octet-stream";
            
            if (["jpg", "jpeg", "png", "gif", "webp"].includes(ext || "")) {
              type = "image";
              mimeType = `image/${ext === "jpg" ? "jpeg" : ext}`;
            } else if (["mp4", "avi", "mov"].includes(ext || "")) {
              type = "video";
              mimeType = `video/${ext}`;
            } else if (["opus", "ogg", "mp3", "wav"].includes(ext || "")) {
              type = "audio";
              mimeType = `audio/${ext}`;
            } else if (["pdf", "doc", "docx"].includes(ext || "")) {
              type = "document";
              mimeType = ext === "pdf" ? "application/pdf" : "application/msword";
            }
            
            // Criar objeto File a partir do blob
            mediaFile = new File([blob], mediaFileName, { type: mimeType });
            
            // Criar URL local para visualização
            mediaUrl = URL.createObjectURL(blob);
            
            // Atualizar conteúdo da mensagem
            finalContent = `[${type.toUpperCase()}] ${mediaFileName}`;
          }
        }
        
        // Adicionar mensagem à linha do tempo
        timeline.push({
          id: `${fullDate}-${timeStr}-${i}`,
          type,
          content: finalContent,
          timestamp: timeStr,
          fullDate,
          sender: sender.trim(),
          mediaFile,
          mediaUrl,
        });
      } else {
        // Linha não corresponde ao padrão - pode ser continuação de mensagem anterior
        // ou mensagem do sistema
        if (timeline.length > 0) {
          // Adicionar como continuação da última mensagem
          timeline[timeline.length - 1].content += "\n" + line;
        }
      }
    }
    
    return timeline;
  } catch (error) {
    console.error("Erro ao processar ZIP:", error);
    throw new Error(`Falha ao processar arquivo ZIP: ${error instanceof Error ? error.message : "Erro desconhecido"}`);
  }
}

/**
 * Filtra a linha do tempo por período
 */
export function filterTimelineByPeriod(
  timeline: TimelineMessage[],
  period: "today" | "todayAndYesterday" | "all"
): TimelineMessage[] {
  if (period === "all") {
    return timeline;
  }
  
  const today = new Date();
  today.setHours(0, 0, 0, 0);
  const todayStr = today.toISOString().split("T")[0];
  
  const yesterday = new Date(today);
  yesterday.setDate(yesterday.getDate() - 1);
  const yesterdayStr = yesterday.toISOString().split("T")[0];
  
  if (period === "today") {
    return timeline.filter((msg) => msg.fullDate === todayStr);
  }
  
  if (period === "todayAndYesterday") {
    return timeline.filter((msg) => msg.fullDate === todayStr || msg.fullDate === yesterdayStr);
  }
  
  return timeline;
}

/**
 * Converte a linha do tempo em texto formatado para envio à IA
 */
export function timelineToText(timeline: TimelineMessage[]): string {
  return timeline
    .map((msg) => {
      const prefix = `[${msg.fullDate} ${msg.timestamp}] ${msg.sender}:`;
      if (msg.type === "text") {
        return `${prefix} ${msg.content}`;
      } else {
        return `${prefix} ${msg.content}`;
      }
    })
    .join("\n");
}
