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

    // Log debug info
    console.log("Audio file size:", uint8.length, "original type:", audioFile.type, "original name:", audioFile.name);

    // Build multipart/form-data manually to guarantee correct Content-Type on the file part
    const boundary = "----WebKitFormBoundary" + crypto.randomUUID().replace(/-/g, "");
    const encoder = new TextEncoder();

    const filePart = [
      `--${boundary}\r\n`,
      `Content-Disposition: form-data; name="file"; filename="recording.webm"\r\n`,
      `Content-Type: audio/webm\r\n\r\n`,
    ];
    const modelPart = [
      `\r\n--${boundary}\r\n`,
      `Content-Disposition: form-data; name="model"\r\n\r\n`,
      `whisper-1`,
      `\r\n--${boundary}--\r\n`,
    ];

    const filePartBytes = encoder.encode(filePart.join(""));
    const modelPartBytes = encoder.encode(modelPart.join(""));

    const body = new Uint8Array(filePartBytes.length + uint8.length + modelPartBytes.length);
    body.set(filePartBytes, 0);
    body.set(uint8, filePartBytes.length);
    body.set(modelPartBytes, filePartBytes.length + uint8.length);

    const response = await fetch("https://api.openai.com/v1/audio/transcriptions", {
      method: "POST",
      headers: {
        Authorization: `Bearer ${OPENAI_API_KEY}`,
        "Content-Type": `multipart/form-data; boundary=${boundary}`,
      },
      body: body,
    });

    if (!response.ok) {
      const errorText = await response.text();
      console.error("Whisper error:", response.status, errorText);
      return new Response(JSON.stringify({ error: "Transcription failed" }), {
        status: 500,
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    const result = await response.json();
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
