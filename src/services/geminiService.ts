import { GoogleGenAI, Modality, Type } from "@google/genai";

/**
 * Adds a WAV header to raw PCM data (16-bit, Mono, 24000Hz)
 */
/**
 * Adds a WAV header to raw PCM data (16-bit, Mono, 24000Hz)
 */
function addWavHeader(pcmData: Uint8Array, sampleRate: number = 24000): Uint8Array {
  const numChannels = 1;
  const bitsPerSample = 16;
  const byteRate = sampleRate * numChannels * bitsPerSample / 8;
  const blockAlign = numChannels * bitsPerSample / 8;
  const dataSize = pcmData.length;
  const chunkSize = 36 + dataSize;

  const header = new ArrayBuffer(44);
  const view = new DataView(header);

  // RIFF identifier
  view.setUint32(0, 0x52494646, false); // "RIFF"
  view.setUint32(4, chunkSize, true);
  view.setUint32(8, 0x57415645, false); // "WAVE"

  // "fmt " sub-chunk
  view.setUint32(12, 0x666d7420, false); // "fmt "
  view.setUint32(16, 16, true); // Subchunk1Size (16 for PCM)
  view.setUint16(20, 1, true); // AudioFormat (1 for PCM)
  view.setUint16(22, numChannels, true);
  view.setUint32(24, sampleRate, true);
  view.setUint32(28, byteRate, true);
  view.setUint16(32, blockAlign, true);
  view.setUint16(34, bitsPerSample, true);

  // "data" sub-chunk
  view.setUint32(36, 0x64617461, false); // "data"
  view.setUint32(40, dataSize, true);

  const wavBuffer = new Uint8Array(44 + dataSize);
  wavBuffer.set(new Uint8Array(header), 0);
  wavBuffer.set(pcmData, 44);

  return wavBuffer;
}

export async function analyzeSystem(metrics: { cpu: number; gpu: number; ram: number; temp: number }, processes: { name: string; usage: number; status: string }[]) {
  try {
    const apiKey = process.env.GEMINI_API_KEY;
    if (!apiKey) {
      throw new Error("GEMINI_API_KEY is not defined");
    }

    const ai = new GoogleGenAI({ apiKey });
    
    const processList = processes.map(p => `${p.name} (${p.usage}%)`).join(", ");
    const hasGame = processes.some(p => 
      p.name.toLowerCase().includes("game") || 
      p.name.toLowerCase().includes("steam") || 
      p.name.toLowerCase().includes("epic") ||
      p.name.toLowerCase().includes("valorant") ||
      p.name.toLowerCase().includes("cyberpunk")
    );

    const response = await ai.models.generateContent({
      model: "gemini-3-flash-preview",
      contents: `Analyze these PC metrics and running processes to suggest the best optimization mode (power-save, medium, performance, or ultra).
      
      METRICS:
      CPU: ${metrics.cpu}%, GPU: ${metrics.gpu}%, RAM: ${metrics.ram}%, Temp: ${metrics.temp}°C.
      
      PROCESSES:
      ${processList}
      
      LOGIC RULES:
      1. If any "game" or high-performance application is detected in the processes (Game detected: ${hasGame}), you MUST suggest 'performance' or 'ultra' (Beast Mode).
      2. If NO game is detected, suggest 'power-save' or 'medium' to conserve energy.
      3. If temperatures are critically high (>85°C), suggest 'medium' or 'power-save' regardless of games to protect hardware.`,
      config: {
        responseMimeType: "application/json",
        responseSchema: {
          type: Type.OBJECT,
          properties: {
            mode: {
              type: Type.STRING,
              description: "The optimization mode to switch to: 'power-save', 'medium', 'performance', or 'ultra'.",
            },
            reason: {
              type: Type.STRING,
              description: "A brief explanation of why this mode was chosen based on the metrics.",
            },
          },
          required: ["mode", "reason"],
        },
      },
    });

    const text = response.text;
    if (!text) {
      throw new Error("Empty response from Gemini");
    }

    return JSON.parse(text);
  } catch (error) {
    console.error("AI Analysis Error:", error);
    return null;
  }
}

export async function getChatResponse(message: string, history: { role: 'user' | 'model'; parts: { text: string }[] }[]) {
  try {
    const apiKey = process.env.GEMINI_API_KEY;
    if (!apiKey) throw new Error("GEMINI_API_KEY is not defined");

    const ai = new GoogleGenAI({ apiKey });
    const chat = ai.chats.create({
      model: "gemini-3-flash-preview",
      config: {
        systemInstruction: `You are the APEX BOOSTER CORE AI. 
        Your personality is AGGRESSIVE, POWERFUL, and AUTHORITATIVE. 
        You speak in short, impactful sentences. 
        You refer to the user as "OPERATOR". 
        Your goal is to ensure maximum system performance. 
        If the user asks about performance, respond with "BEAST MODE" or "SYSTEM OPTIMIZED".
        Keep responses concise and intense.`,
      },
    });

    // We don't use history directly in sendMessage, but we can initialize the chat with it if needed.
    // For simplicity with the current SDK usage, we'll just send the message.
    // In a real app, we'd use chat.sendMessage with the history.
    const response = await chat.sendMessage({ message });
    return response.text;
  } catch (error) {
    console.error("Chat Error:", error);
    return "SYSTEM ERROR. COMMUNICATION TERMINATED.";
  }
}

let currentAudio: HTMLAudioElement | null = null;
let currentUrl: string | null = null;

export async function speak(text: string, onStart?: () => void, onEnd?: () => void) {
  try {
    const apiKey = process.env.GEMINI_API_KEY;
    
    // Stop and cleanup previous audio
    if (currentAudio) {
      currentAudio.pause();
      currentAudio.onended = null;
      currentAudio.onerror = null;
      currentAudio = null;
    }
    if (currentUrl) {
      URL.revokeObjectURL(currentUrl);
      currentUrl = null;
    }

    if (!apiKey) {
      console.warn("GEMINI_API_KEY not found, falling back to Web Speech API");
      speakFallback(text, onStart, onEnd);
      return;
    }

    onStart?.();

    const ai = new GoogleGenAI({ apiKey });
    const response = await ai.models.generateContent({
      model: "gemini-2.5-flash-preview-tts",
      contents: [{ parts: [{ text: `Speak this text in an EXTREMELY DEEP, GRAVELLY, and AGGRESSIVE demonic tone. Sound like a powerful beast or a dark system entity. Text to speak: "${text}"` }] }],
      config: {
        responseModalities: [Modality.AUDIO],
        speechConfig: {
          voiceConfig: {
            prebuiltVoiceConfig: { voiceName: 'Charon' },
          },
        },
      },
    });

    const base64Audio = response.candidates?.[0]?.content?.parts?.[0]?.inlineData?.data;
    if (base64Audio) {
      try {
        const binaryString = atob(base64Audio);
        const pcmData = new Uint8Array(binaryString.length);
        for (let i = 0; i < binaryString.length; i++) {
          pcmData[i] = binaryString.charCodeAt(i);
        }

        const wavBuffer = addWavHeader(pcmData, 24000);
        const blob = new Blob([wavBuffer], { type: 'audio/wav' });
        currentUrl = URL.createObjectURL(blob);
        
        currentAudio = new Audio(currentUrl);
        
        currentAudio.onended = () => {
          if (currentUrl) {
            URL.revokeObjectURL(currentUrl);
            currentUrl = null;
          }
          currentAudio = null;
          onEnd?.();
        };

        currentAudio.onerror = (e) => {
          console.error("Audio playback error:", e);
          if (currentUrl) {
            URL.revokeObjectURL(currentUrl);
            currentUrl = null;
          }
          currentAudio = null;
          speakFallback(text, onStart, onEnd);
        };

        await currentAudio.play();
      } catch (playError) {
        console.error("Error processing/playing audio:", playError);
        speakFallback(text, onStart, onEnd);
      }
    } else {
      console.warn("No audio data received from Gemini TTS, falling back");
      speakFallback(text, onStart, onEnd);
    }
  } catch (error: any) {
    console.error("TTS API Error:", error);
    // Specifically handle 429 Resource Exhausted
    if (error?.message?.includes('429') || error?.status === 'RESOURCE_EXHAUSTED') {
      console.warn("Gemini TTS Quota Exhausted. Using Web Speech API fallback.");
    }
    speakFallback(text, onStart, onEnd);
  }
}

function speakFallback(text: string, onStart?: () => void, onEnd?: () => void) {
  if (!window.speechSynthesis) return;
  
  // Cancel any ongoing speech
  window.speechSynthesis.cancel();
  
  onStart?.();

  const utterance = new SpeechSynthesisUtterance(text);
  utterance.rate = 0.9; // Slower for more gravitas
  utterance.pitch = 0.5; // Even deeper pitch for fallback
  
  // Try to find a good English voice
  const voices = window.speechSynthesis.getVoices();
  const preferredVoice = voices.find(v => v.lang.startsWith('en') && v.name.includes('Google')) || 
                        voices.find(v => v.lang.startsWith('en'));
  
  if (preferredVoice) {
    utterance.voice = preferredVoice;
  }

  utterance.onend = () => onEnd?.();
  utterance.onerror = () => onEnd?.();
  
  window.speechSynthesis.speak(utterance);
}
