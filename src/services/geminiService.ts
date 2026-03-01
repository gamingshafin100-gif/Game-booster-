import { GoogleGenAI, Modality, Type } from "@google/genai";

/**
 * Adds a WAV header to raw PCM data (16-bit, Mono, 24000Hz)
 */
function addWavHeader(pcmBase64: string, sampleRate: number = 24000): string {
  const pcmData = Uint8Array.from(atob(pcmBase64), c => c.charCodeAt(0));
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

  let binary = '';
  const len = wavBuffer.byteLength;
  for (let i = 0; i < len; i++) {
    binary += String.fromCharCode(wavBuffer[i]);
  }
  return btoa(binary);
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

export async function speak(text: string) {
  try {
    const apiKey = process.env.GEMINI_API_KEY;
    if (!apiKey) {
      throw new Error("GEMINI_API_KEY is not defined");
    }

    const ai = new GoogleGenAI({ apiKey });
    const response = await ai.models.generateContent({
      model: "gemini-2.5-flash-preview-tts",
      contents: [{ parts: [{ text: `Mimic the voice from the "Beast Mode" transformation in the video: An EXTREMELY deep, resonant, demonic, and powerful male voice. It should sound like it's coming from a dark entity, with a slight gravelly texture and a heavy, bass-boosted robotic undertone. The delivery should be slow, deliberate, and menacing. Use a voice that sounds like a fusion of a dark god and a high-tech machine. Say the following exactly: ${text}` }] }],
      config: {
        responseModalities: [Modality.AUDIO],
        speechConfig: {
          voiceConfig: {
            // 'Puck', 'Charon', 'Kore', 'Fenrir', 'Zephyr'
            prebuiltVoiceConfig: { voiceName: 'Fenrir' },
          },
        },
      },
    });

    const base64Audio = response.candidates?.[0]?.content?.parts?.[0]?.inlineData?.data;
    if (base64Audio) {
      try {
        // Gemini TTS returns raw PCM data. We need to add a WAV header to play it in the browser.
        const wavBase64 = addWavHeader(base64Audio, 24000);
        const audio = new Audio(`data:audio/wav;base64,${wavBase64}`);
        
        audio.onerror = (e) => {
          console.error("Audio playback error:", e);
        };

        await audio.play();
      } catch (playError) {
        console.error("Error processing/playing audio:", playError);
      }
    } else {
      console.warn("No audio data received from Gemini TTS");
    }
  } catch (error) {
    console.error("TTS API Error:", error);
  }
}
