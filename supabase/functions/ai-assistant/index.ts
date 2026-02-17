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
    const { messages, orgId } = await req.json();
    const LOVABLE_API_KEY = Deno.env.get("LOVABLE_API_KEY");
    if (!LOVABLE_API_KEY) throw new Error("LOVABLE_API_KEY is not configured");

    // Fetch org context if provided
    let orgContext = "";
    if (orgId) {
      const supabase = createClient(
        Deno.env.get("SUPABASE_URL")!,
        Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!
      );

      const [
        { data: company },
        { data: tools },
        { data: requests },
        { data: controls },
        { data: vendors },
        { data: reports },
      ] = await Promise.all([
        supabase.from("companies").select("name").eq("id", orgId).maybeSingle(),
        supabase.from("tools").select("name, status, risk_level, category").eq("org_id", orgId),
        supabase.from("requests").select("workflow_stage, created_at").eq("org_id", orgId),
        supabase.from("controls").select("framework, control_ref, title, status").eq("org_id", orgId),
        supabase.from("vendors").select("name, website").eq("org_id", orgId),
        supabase.from("reports").select("service_name, trust_score, status").eq("company_id", orgId).order("created_at", { ascending: false }).limit(10),
      ]);

      const approvedTools = tools?.filter((t: any) => t.status === "approved").length || 0;
      const pendingRequests = requests?.filter((r: any) => r.workflow_stage === "draft" || r.workflow_stage === "review").length || 0;
      const compliantControls = controls?.filter((c: any) => c.status === "compliant").length || 0;

      orgContext = `
CURRENT ORGANIZATION DATA for "${company?.name || "Unknown"}":
- Tools: ${tools?.length || 0} total (${approvedTools} approved). Names: ${tools?.map((t: any) => `${t.name} [${t.status}, risk: ${t.risk_level || "unassessed"}]`).join(", ") || "none"}
- Requests: ${requests?.length || 0} total (${pendingRequests} pending review)
- Compliance Controls: ${controls?.length || 0} total (${compliantControls} compliant). Frameworks: ${[...new Set(controls?.map((c: any) => c.framework) || [])].join(", ") || "none"}
- Vendors: ${vendors?.map((v: any) => v.name).join(", ") || "none"}
- Recent Reports: ${reports?.map((r: any) => `${r.service_name} (score: ${r.trust_score ?? "pending"})`).join(", ") || "none"}
`;
    }

    const systemPrompt = `You are an AI Security & Compliance Assistant for a GRC (Governance, Risk, Compliance) platform. You help users understand:
1. Their organization's security posture, tools, compliance status, and reports
2. AI security concepts (prompt injection, data privacy, model bias, etc.)
3. Compliance frameworks (NIST AI RMF, EU AI Act, SOC 2, ISO 27001)
4. How to use the platform features (requesting tools, compliance attestation, maturity assessment)

Be concise, helpful, and reference the org's actual data when relevant. Use markdown for formatting.
${orgContext}

Platform features:
- Dashboard: Overview of org security posture
- Requests: Users submit new AI tool requests which trigger automated security scans
- Tools: Inventory of approved/pending/rejected AI tools
- Vendors: Third-party vendor security research
- Compliance: Framework-based control attestation (toggle status, add notes)
- Maturity: AI governance maturity score calculated from tools + controls
- Reports: Detailed security analysis with trust scores, vulnerabilities, competitor analysis
- Admin: User management, invite members, activity log`;

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
          ...messages,
        ],
        stream: true,
      }),
    });

    if (!response.ok) {
      if (response.status === 429) {
        return new Response(JSON.stringify({ error: "Rate limit exceeded. Please try again shortly." }), {
          status: 429,
          headers: { ...corsHeaders, "Content-Type": "application/json" },
        });
      }
      if (response.status === 402) {
        return new Response(JSON.stringify({ error: "AI usage limit reached. Please add credits." }), {
          status: 402,
          headers: { ...corsHeaders, "Content-Type": "application/json" },
        });
      }
      const t = await response.text();
      console.error("AI gateway error:", response.status, t);
      return new Response(JSON.stringify({ error: "AI service error" }), {
        status: 500,
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    return new Response(response.body, {
      headers: { ...corsHeaders, "Content-Type": "text/event-stream" },
    });
  } catch (e) {
    console.error("ai-assistant error:", e);
    return new Response(JSON.stringify({ error: e instanceof Error ? e.message : "Unknown error" }), {
      status: 500,
      headers: { ...corsHeaders, "Content-Type": "application/json" },
    });
  }
});
