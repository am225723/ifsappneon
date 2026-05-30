import { serve } from "https://deno.land/std@0.168.0/http/server.ts";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers":
    "authorization, x-client-info, apikey, content-type, x-caller-pin",
};

serve(async (req) => {
  if (req.method === "OPTIONS") {
    return new Response("ok", { headers: corsHeaders });
  }

  try {
    const supabaseUrl = Deno.env.get("SUPABASE_URL") ?? "";
    const supabaseServiceKey = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY") ?? "";
    const supabaseAnonKey = Deno.env.get("SUPABASE_ANON_KEY") ?? "";
    const onesignalApiKey = Deno.env.get("ONESIGNAL_REST_API_KEY") ?? "";
    const onesignalAppId = Deno.env.get("ONESIGNAL_APP_ID") ?? "e5dccda5-8644-424e-a0bd-f4144395e258";

    if (!onesignalApiKey) {
      return new Response(
        JSON.stringify({ success: false, error: "OneSignal API key not configured." }),
        { status: 500, headers: { ...corsHeaders, "Content-Type": "application/json" } }
      );
    }

    const authHeader = req.headers.get("Authorization");
    const callerPin = req.headers.get("x-caller-pin");

    let isAuthorized = false;
    const adminClient = createClient(supabaseUrl, supabaseServiceKey);

    if (authHeader) {
      const userClient = createClient(supabaseUrl, supabaseAnonKey, {
        global: { headers: { Authorization: authHeader } },
      });
      const { data: { user }, error: authError } = await userClient.auth.getUser();
      if (!authError && user) {
        const { data: userData } = await adminClient
          .from("ifs_clients")
          .select("id, user_role")
          .eq("id", user.id)
          .single();
        if (userData && userData.user_role === "therapist") {
          isAuthorized = true;
        }
      }
    }

    if (!isAuthorized && callerPin) {
      const { data: callerData } = await adminClient
        .from("ifs_clients")
        .select("id, user_role")
        .eq("pin", callerPin)
        .single();

      if (callerData && callerData.user_role === "therapist") {
        isAuthorized = true;
      }
    }

    if (!isAuthorized) {
      return new Response(
        JSON.stringify({ success: false, error: "Unauthorized. Only advisors can send emails." }),
        { status: 401, headers: { ...corsHeaders, "Content-Type": "application/json" } }
      );
    }

    const { to_email, subject, html_body, from_name } = await req.json();

    if (!to_email || !subject || !html_body) {
      return new Response(
        JSON.stringify({ success: false, error: "Missing required fields: to_email, subject, html_body" }),
        { status: 400, headers: { ...corsHeaders, "Content-Type": "application/json" } }
      );
    }

    const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
    if (!emailRegex.test(to_email)) {
      return new Response(
        JSON.stringify({ success: false, error: "Invalid email address." }),
        { status: 400, headers: { ...corsHeaders, "Content-Type": "application/json" } }
      );
    }

    const onesignalPayload = {
      app_id: onesignalAppId,
      include_email_tokens: [to_email],
      email_subject: subject,
      email_body: html_body,
      email_from_name: from_name || "Intrinsic Therapeutic Solutions",
      channel_for_external_user_ids: "email",
    };

    const onesignalResponse = await fetch("https://api.onesignal.com/notifications", {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        "Authorization": `Key ${onesignalApiKey}`,
      },
      body: JSON.stringify(onesignalPayload),
    });

    const onesignalResult = await onesignalResponse.json();

    if (!onesignalResponse.ok) {
      console.error("OneSignal API error:", onesignalResult);
      return new Response(
        JSON.stringify({
          success: false,
          error: onesignalResult.errors?.[0] || "Failed to send email via OneSignal.",
          details: onesignalResult,
        }),
        { status: 502, headers: { ...corsHeaders, "Content-Type": "application/json" } }
      );
    }

    return new Response(
      JSON.stringify({
        success: true,
        message: `Email sent to ${to_email}`,
        onesignal_id: onesignalResult.id,
      }),
      { status: 200, headers: { ...corsHeaders, "Content-Type": "application/json" } }
    );

  } catch (error) {
    console.error("Send email error:", error);
    return new Response(
      JSON.stringify({ success: false, error: error.message || "Internal server error" }),
      { status: 500, headers: { ...corsHeaders, "Content-Type": "application/json" } }
    );
  }
});
