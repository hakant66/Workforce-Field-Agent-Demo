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
    const ERP_WEBHOOK_URL = Deno.env.get("ERP_WEBHOOK_URL");
    if (!ERP_WEBHOOK_URL) throw new Error("ERP_WEBHOOK_URL is not configured");

    const payload = await req.json();

    // Validate required fields
    const { site, asset, description, outcome } = payload;
    if (!site || !asset || !description || !outcome) {
      return new Response(
        JSON.stringify({ error: "Missing required fields: site, asset, description, outcome" }),
        { status: 400, headers: { ...corsHeaders, "Content-Type": "application/json" } }
      );
    }

    // Forward to ERP webhook
    const webhookPayload = {
      ...payload,
      synced_at: new Date().toISOString(),
    };

    console.log("Sending to ERP webhook:", JSON.stringify(webhookPayload));

    const response = await fetch(ERP_WEBHOOK_URL, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify(webhookPayload),
    });

    if (!response.ok) {
      const errorText = await response.text();
      console.error("ERP webhook error:", response.status, errorText);
      return new Response(
        JSON.stringify({ error: "ERP sync failed", status: response.status }),
        { status: 502, headers: { ...corsHeaders, "Content-Type": "application/json" } }
      );
    }

    // Consume body
    await response.text();

    return new Response(
      JSON.stringify({ success: true, synced_at: webhookPayload.synced_at }),
      { headers: { ...corsHeaders, "Content-Type": "application/json" } }
    );
  } catch (e) {
    console.error("sync-erp error:", e);
    return new Response(
      JSON.stringify({ error: e instanceof Error ? e.message : "Unknown error" }),
      { status: 500, headers: { ...corsHeaders, "Content-Type": "application/json" } }
    );
  }
});
