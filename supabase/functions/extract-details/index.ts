import { serve } from "https://deno.land/std@0.168.0/http/server.ts";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers":
    "authorization, x-client-info, apikey, content-type, x-supabase-client-platform, x-supabase-client-platform-version, x-supabase-client-runtime, x-supabase-client-runtime-version",
};

const systemPrompt = `You are a technical data clerk. Extract structured job details from a field engineer's transcript. For each extracted field, provide a confidence score (0-100) and a brief reasoning explaining your confidence level.

Low confidence examples:
- Background noise made the asset ID unclear
- The engineer mumbled the site name
- Multiple sites were mentioned, unsure which is primary

If the user says "job done" or "finished," set outcome to "Completed".
If they mention "missing parts" or "returning," set to "Incomplete".`;

serve(async (req) => {
  if (req.method === "OPTIONS") {
    return new Response(null, { headers: corsHeaders });
  }

  try {
    const LOVABLE_API_KEY = Deno.env.get("LOVABLE_API_KEY");
    if (!LOVABLE_API_KEY) throw new Error("LOVABLE_API_KEY is not configured");

    const { transcript } = await req.json();
    if (!transcript) {
      return new Response(JSON.stringify({ error: "No transcript provided" }), {
        status: 400,
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    const response = await fetch("https://ai.gateway.lovable.dev/v1/chat/completions", {
      method: "POST",
      headers: {
        Authorization: `Bearer ${LOVABLE_API_KEY}`,
        "Content-Type": "application/json",
      },
      body: JSON.stringify({
        model: "google/gemini-3-flash-preview",
        messages: [
          { role: "system", content: systemPrompt },
          { role: "user", content: transcript },
        ],
        tools: [
          {
            type: "function",
            function: {
              name: "extract_job_details",
              description: "Extract structured job details from a field engineer transcript with per-field confidence and reasoning.",
              parameters: {
                type: "object",
                properties: {
                  site: {
                    type: "object",
                    properties: {
                      value: { type: "string", description: "Site ID or name" },
                      confidence: { type: "number", description: "Confidence score 0-100" },
                      reasoning: { type: "string", description: "Brief explanation of confidence level" },
                    },
                    required: ["value", "confidence", "reasoning"],
                    additionalProperties: false,
                  },
                  asset: {
                    type: "object",
                    properties: {
                      value: { type: "string", description: "Asset ID or name" },
                      confidence: { type: "number", description: "Confidence score 0-100" },
                      reasoning: { type: "string", description: "Brief explanation of confidence level" },
                    },
                    required: ["value", "confidence", "reasoning"],
                    additionalProperties: false,
                  },
                  description: {
                    type: "object",
                    properties: {
                      value: { type: "string", description: "Technical summary of work done" },
                      confidence: { type: "number", description: "Confidence score 0-100" },
                      reasoning: { type: "string", description: "Brief explanation of confidence level" },
                    },
                    required: ["value", "confidence", "reasoning"],
                    additionalProperties: false,
                  },
                  outcome: {
                    type: "object",
                    properties: {
                      value: { type: "string", enum: ["Completed", "Incomplete"] },
                      confidence: { type: "number", description: "Confidence score 0-100" },
                      reasoning: { type: "string", description: "Brief explanation of confidence level" },
                    },
                    required: ["value", "confidence", "reasoning"],
                    additionalProperties: false,
                  },
                },
                required: ["site", "asset", "description", "outcome"],
                additionalProperties: false,
              },
            },
          },
        ],
        tool_choice: { type: "function", function: { name: "extract_job_details" } },
      }),
    });

    if (!response.ok) {
      if (response.status === 429) {
        return new Response(JSON.stringify({ error: "Rate limit exceeded, please try again later." }), {
          status: 429,
          headers: { ...corsHeaders, "Content-Type": "application/json" },
        });
      }
      if (response.status === 402) {
        return new Response(JSON.stringify({ error: "AI credits exhausted. Please add funds." }), {
          status: 402,
          headers: { ...corsHeaders, "Content-Type": "application/json" },
        });
      }
      const errorText = await response.text();
      console.error("AI gateway error:", response.status, errorText);
      return new Response(JSON.stringify({ error: "Extraction failed" }), {
        status: 500,
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    const result = await response.json();

    // Parse tool call response
    const toolCall = result.choices?.[0]?.message?.tool_calls?.[0];
    if (toolCall?.function?.arguments) {
      const extracted = JSON.parse(toolCall.function.arguments);
      return new Response(JSON.stringify(extracted), {
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    // Fallback: try parsing content directly
    const content = result.choices?.[0]?.message?.content || "";
    try {
      const parsed = JSON.parse(content);
      return new Response(JSON.stringify(parsed), {
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    } catch {
      return new Response(JSON.stringify({ error: "Failed to parse extraction result", raw: content }), {
        status: 500,
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }
  } catch (e) {
    console.error("extract-details error:", e);
    return new Response(
      JSON.stringify({ error: e instanceof Error ? e.message : "Unknown error" }),
      { status: 500, headers: { ...corsHeaders, "Content-Type": "application/json" } }
    );
  }
});
