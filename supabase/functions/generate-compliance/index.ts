import { serve } from "https://deno.land/std@0.168.0/http/server.ts";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2";

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
    const { reportId, serviceName, vulnerabilities } = await req.json();

    const authHeader = req.headers.get("authorization");
    if (!authHeader) throw new Error("Not authenticated");

    const SUPABASE_URL = Deno.env.get("SUPABASE_URL")!;
    const SUPABASE_ANON_KEY = Deno.env.get("SUPABASE_ANON_KEY")!;
    const SUPABASE_SERVICE_ROLE_KEY = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!;
    const LOVABLE_API_KEY = Deno.env.get("LOVABLE_API_KEY");

    if (!LOVABLE_API_KEY) throw new Error("LOVABLE_API_KEY not configured");

    // Get user from auth token
    const userClient = createClient(SUPABASE_URL, SUPABASE_ANON_KEY, {
      global: { headers: { Authorization: authHeader } },
    });
    const { data: { user }, error: authError } = await userClient.auth.getUser();
    if (authError || !user) throw new Error("Authentication failed");

    // Get user profile for company_id
    const serviceClient = createClient(SUPABASE_URL, SUPABASE_SERVICE_ROLE_KEY);
    const { data: profile } = await serviceClient
      .from("profiles")
      .select("company_id")
      .eq("user_id", user.id)
      .maybeSingle();

    if (!profile) throw new Error("User profile not found");

    // Build vulnerability summary for AI
    const vulnSummary = Object.entries(vulnerabilities || {})
      .map(([key, val]: [string, any]) => `- ${key}: Score ${val.score}/10 — ${val.details}`)
      .join("\n");

    const systemPrompt = `You are an AI compliance advisor. Given an AI service's vulnerability assessment, generate a detailed, step-by-step compliance remediation plan.

Each step should be specific, actionable, and ordered by priority (most critical first). Include:
- A clear title
- A detailed description of what needs to be done
- The step should reference specific standards (SOC 2, ISO 27001, GDPR, NIST AI RMF, EU AI Act) where applicable

Return ONLY valid JSON array of steps:
[
  {
    "step_number": 1,
    "title": "Step title",
    "description": "Detailed description of what to do"
  }
]

Generate 8-15 steps depending on severity.`;

    const aiRes = await fetch("https://ai.gateway.lovable.dev/v1/chat/completions", {
      method: "POST",
      headers: {
        Authorization: `Bearer ${LOVABLE_API_KEY}`,
        "Content-Type": "application/json",
      },
      body: JSON.stringify({
        model: "google/gemini-2.5-flash",
        messages: [
          { role: "system", content: systemPrompt },
          {
            role: "user",
            content: `Generate a compliance plan for "${serviceName}".\n\nVulnerability Assessment:\n${vulnSummary}`,
          },
        ],
        temperature: 0.3,
      }),
    });

    if (!aiRes.ok) {
      const errText = await aiRes.text();
      console.error("AI error:", aiRes.status, errText);
      throw new Error(`AI API error: ${aiRes.status}`);
    }

    const aiData = await aiRes.json();
    let content = aiData.choices?.[0]?.message?.content || "";
    content = content.replace(/```json\s*/g, "").replace(/```\s*/g, "").trim();

    let stepsData;
    try {
      stepsData = JSON.parse(content);
    } catch {
      console.error("Failed to parse AI response:", content.substring(0, 500));
      throw new Error("AI returned invalid JSON");
    }

    // Create compliance plan
    const { data: plan, error: planError } = await serviceClient
      .from("compliance_plans")
      .insert({
        report_id: reportId,
        company_id: profile.company_id,
        user_id: user.id,
        title: `Compliance Plan: ${serviceName}`,
      })
      .select()
      .single();

    if (planError) throw planError;

    // Insert steps
    const stepsToInsert = stepsData.map((step: any) => ({
      plan_id: plan.id,
      step_number: step.step_number,
      title: step.title,
      description: step.description,
    }));

    const { error: stepsError } = await serviceClient
      .from("compliance_steps")
      .insert(stepsToInsert);

    if (stepsError) throw stepsError;

    return new Response(
      JSON.stringify({ success: true, planId: plan.id }),
      { headers: { ...corsHeaders, "Content-Type": "application/json" } }
    );
  } catch (e) {
    console.error("generate-compliance error:", e);
    return new Response(
      JSON.stringify({ error: e instanceof Error ? e.message : "Unknown error" }),
      { status: 500, headers: { ...corsHeaders, "Content-Type": "application/json" } }
    );
  }
});
