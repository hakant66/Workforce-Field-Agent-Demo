import { serve } from "https://deno.land/std@0.168.0/http/server.ts";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers":
    "authorization, x-client-info, apikey, content-type, x-supabase-client-platform, x-supabase-client-platform-version, x-supabase-client-runtime, x-supabase-client-runtime-version",
};

serve(async (req) => {
  if (req.method === "OPTIONS") {
    return new Response(null, { headers: corsHeaders });
  }

  try {
    const OPENAI_API_KEY = Deno.env.get("OPENAI_API_KEY");
    if (!OPENAI_API_KEY) throw new Error("OPENAI_API_KEY is not configured");

    const formData = await req.formData();
    const audioFile = formData.get("audio");
    if (!audioFile || !(audioFile instanceof File)) {
      return new Response(JSON.stringify({ error: "No audio file provided" }), {
        status: 400,
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    // Read raw bytes from the uploaded file
    const arrayBuffer = await audioFile.arrayBuffer();
    const uint8 = new Uint8Array(arrayBuffer);

    console.log("Audio file size:", uint8.length, "original type:", audioFile.type, "original name:", audioFile.name);

    // Helper: build multipart body for Whisper
    function buildMultipartBody(fileBytes: Uint8Array, filename: string, contentType: string) {
      const boundary = "----WebKitFormBoundary" + crypto.randomUUID().replace(/-/g, "");
      const encoder = new TextEncoder();
      const filePart = encoder.encode(
        `--${boundary}\r\nContent-Disposition: form-data; name="file"; filename="${filename}"\r\nContent-Type: ${contentType}\r\n\r\n`
      );
      const modelPart = encoder.encode(
        `\r\n--${boundary}\r\nContent-Disposition: form-data; name="model"\r\n\r\nwhisper-1\r\n--${boundary}--\r\n`
      );
      const body = new Uint8Array(filePart.length + fileBytes.length + modelPart.length);
      body.set(filePart, 0);
      body.set(fileBytes, filePart.length);
      body.set(modelPart, filePart.length + fileBytes.length);
      return { body, boundary };
    }

    // Helper: call Whisper API
    async function callWhisper(fileBytes: Uint8Array, filename: string, contentType: string) {
      const { body, boundary } = buildMultipartBody(fileBytes, filename, contentType);
      return await fetch("https://api.openai.com/v1/audio/transcriptions", {
        method: "POST",
        headers: {
          Authorization: `Bearer ${OPENAI_API_KEY}`,
          "Content-Type": `multipart/form-data; boundary=${boundary}`,
        },
        body,
      });
    }

    // Helper: convert raw audio bytes to a minimal WAV (16-bit PCM, mono, 16kHz)
    // This wraps the raw bytes in a WAV header so Whisper can parse the format
    function rawToWav(rawPcm: Uint8Array, sampleRate = 16000, channels = 1, bitsPerSample = 16): Uint8Array {
      const dataSize = rawPcm.length;
      const header = new ArrayBuffer(44);
      const view = new DataView(header);
      const enc = new TextEncoder();
      // RIFF header
      new Uint8Array(header, 0, 4).set(enc.encode("RIFF"));
      view.setUint32(4, 36 + dataSize, true);
      new Uint8Array(header, 8, 4).set(enc.encode("WAVE"));
      // fmt chunk
      new Uint8Array(header, 12, 4).set(enc.encode("fmt "));
      view.setUint32(16, 16, true); // chunk size
      view.setUint16(20, 1, true); // PCM
      view.setUint16(22, channels, true);
      view.setUint32(24, sampleRate, true);
      view.setUint32(28, sampleRate * channels * (bitsPerSample / 8), true);
      view.setUint16(32, channels * (bitsPerSample / 8), true);
      view.setUint16(34, bitsPerSample, true);
      // data chunk
      new Uint8Array(header, 36, 4).set(enc.encode("data"));
      view.setUint32(40, dataSize, true);
      const wav = new Uint8Array(44 + dataSize);
      wav.set(new Uint8Array(header), 0);
      wav.set(rawPcm, 44);
      return wav;
    }

    // Attempt 1: send as webm
    console.log("Attempt 1: sending as webm");
    let response = await callWhisper(uint8, "recording.webm", "audio/webm");

    if (!response.ok) {
      const errorText = await response.text();
      console.warn("Whisper webm attempt failed:", response.status, errorText);

      // Attempt 2: wrap raw bytes in WAV header and retry
      console.log("Attempt 2: converting to WAV wrapper and retrying");
      const wavBytes = rawToWav(uint8);
      response = await callWhisper(wavBytes, "recording.wav", "audio/wav");

      if (!response.ok) {
        const errorText2 = await response.text();
        console.error("Whisper WAV attempt also failed:", response.status, errorText2);
        return new Response(JSON.stringify({ error: "Transcription failed", details: errorText2 }), {
          status: 500,
          headers: { ...corsHeaders, "Content-Type": "application/json" },
        });
      }
    }

    const result = await response.json();
    console.log("Transcription succeeded, text length:", result.text?.length);
    return new Response(JSON.stringify({ text: result.text }), {
      headers: { ...corsHeaders, "Content-Type": "application/json" },
    });
  } catch (e) {
    console.error("transcribe error:", e);
    return new Response(
      JSON.stringify({ error: e instanceof Error ? e.message : "Unknown error" }),
      { status: 500, headers: { ...corsHeaders, "Content-Type": "application/json" } }
    );
  }
});
