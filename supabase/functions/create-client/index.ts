import { serve } from "https://deno.land/std@0.168.0/http/server.ts";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers":
    "authorization, x-client-info, apikey, content-type",
};

serve(async (req) => {
  if (req.method === "OPTIONS") {
    return new Response("ok", { headers: corsHeaders });
  }

  try {
    const supabaseUrl = Deno.env.get("SUPABASE_URL") ?? "";
    const supabaseServiceKey = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY") ?? "";
    const supabaseAnonKey = Deno.env.get("SUPABASE_ANON_KEY") ?? "";

    const authHeader = req.headers.get("Authorization");
    if (!authHeader) {
      return new Response(
        JSON.stringify({ success: false, error: "Missing authorization header." }),
        { status: 401, headers: { ...corsHeaders, "Content-Type": "application/json" } }
      );
    }

    const userClient = createClient(supabaseUrl, supabaseAnonKey, {
      global: { headers: { Authorization: authHeader } },
    });

    const { data: { user }, error: authError } = await userClient.auth.getUser();

    if (authError || !user) {
      const adminClient = createClient(supabaseUrl, supabaseServiceKey);
      const callerPin = req.headers.get("x-caller-pin");
      if (!callerPin) {
        return new Response(
          JSON.stringify({ success: false, error: "Authentication required." }),
          { status: 401, headers: { ...corsHeaders, "Content-Type": "application/json" } }
        );
      }

      const { data: caller, error: callerError } = await adminClient
        .from("ifs_clients")
        .select("user_role")
        .eq("pin", callerPin)
        .maybeSingle();

      if (callerError || !caller || caller.user_role !== "therapist") {
        return new Response(
          JSON.stringify({ success: false, error: "Only therapists can create clients." }),
          { status: 403, headers: { ...corsHeaders, "Content-Type": "application/json" } }
        );
      }
    }

    const adminSupabase = createClient(supabaseUrl, supabaseServiceKey);

    const { name, email, phone, notes } = await req.json();

    if (!name || name.trim().length === 0) {
      return new Response(
        JSON.stringify({ success: false, error: "Client name is required." }),
        {
          status: 400,
          headers: { ...corsHeaders, "Content-Type": "application/json" },
        }
      );
    }

    let pin: string | null = null;
    let attempts = 0;
    const maxAttempts = 20;

    while (attempts < maxAttempts) {
      const candidate = Math.floor(100000 + Math.random() * 900000).toString();

      const { data: existing, error: checkError } = await adminSupabase
        .from("ifs_clients")
        .select("id")
        .eq("pin", candidate)
        .maybeSingle();

      if (checkError) {
        return new Response(
          JSON.stringify({
            success: false,
            error: "Failed to verify PIN uniqueness.",
          }),
          {
            status: 500,
            headers: { ...corsHeaders, "Content-Type": "application/json" },
          }
        );
      }

      if (!existing) {
        pin = candidate;
        break;
      }

      attempts++;
    }

    if (!pin) {
      return new Response(
        JSON.stringify({
          success: false,
          error: "Unable to generate a unique PIN. Please try again.",
        }),
        {
          status: 500,
          headers: { ...corsHeaders, "Content-Type": "application/json" },
        }
      );
    }

    const { data: client, error: insertError } = await adminSupabase
      .from("ifs_clients")
      .insert({
        pin,
        name: name.trim(),
        email: email || null,
        phone: phone || null,
        therapist_notes: notes || null,
        status: "active",
      })
      .select()
      .single();

    if (insertError) {
      return new Response(
        JSON.stringify({
          success: false,
          error: "Failed to create client.",
          details: insertError.message,
        }),
        {
          status: 500,
          headers: { ...corsHeaders, "Content-Type": "application/json" },
        }
      );
    }

    return new Response(
      JSON.stringify({
        success: true,
        client: {
          id: client.id,
          name: client.name,
          email: client.email,
          phone: client.phone,
          status: client.status,
          created_at: client.created_at,
        },
        pin,
      }),
      {
        status: 200,
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      }
    );
  } catch (error) {
    return new Response(
      JSON.stringify({
        success: false,
        error: "An unexpected error occurred.",
        details: error.message,
      }),
      {
        status: 500,
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      }
    );
  }
});
