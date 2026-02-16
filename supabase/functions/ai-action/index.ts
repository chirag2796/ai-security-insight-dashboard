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
    const body = await req.json();
    const { type } = body;

    const SERPER_API_KEY = Deno.env.get("SERPER_API_KEY");
    const LOVABLE_API_KEY = Deno.env.get("LOVABLE_API_KEY");
    const SUPABASE_URL = Deno.env.get("SUPABASE_URL")!;
    const SUPABASE_SERVICE_ROLE_KEY = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!;

    if (!SERPER_API_KEY) throw new Error("SERPER_API_KEY not configured");
    if (!LOVABLE_API_KEY) throw new Error("LOVABLE_API_KEY not configured");

    const supabase = createClient(SUPABASE_URL, SUPABASE_SERVICE_ROLE_KEY);

    if (type === "vendor-research") {
      return await handleVendorResearch(body, supabase, SERPER_API_KEY, LOVABLE_API_KEY);
    } else if (type === "request-analysis") {
      return await handleRequestAnalysis(body, supabase, SERPER_API_KEY, LOVABLE_API_KEY);
    } else if (type === "maturity-recs") {
      return await handleMaturityRecs(body, supabase, LOVABLE_API_KEY);
    } else {
      throw new Error(`Unknown action type: ${type}`);
    }
  } catch (e) {
    console.error("ai-action error:", e);
    return new Response(
      JSON.stringify({ error: e instanceof Error ? e.message : "Unknown error" }),
      { status: 500, headers: { ...corsHeaders, "Content-Type": "application/json" } }
    );
  }
});

async function searchSerper(query: string, apiKey: string) {
  const res = await fetch("https://google.serper.dev/search", {
    method: "POST",
    headers: { "X-API-KEY": apiKey, "Content-Type": "application/json" },
    body: JSON.stringify({ q: query, num: 8 }),
  });
  if (!res.ok) return { query, organic: [] };
  const data = await res.json();
  return { query, organic: data.organic || [] };
}

async function callAI(systemPrompt: string, userPrompt: string, apiKey: string) {
  const res = await fetch("https://ai.gateway.lovable.dev/v1/chat/completions", {
    method: "POST",
    headers: { Authorization: `Bearer ${apiKey}`, "Content-Type": "application/json" },
    body: JSON.stringify({
      model: "google/gemini-2.5-flash",
      messages: [
        { role: "system", content: systemPrompt },
        { role: "user", content: userPrompt },
      ],
      temperature: 0.3,
    }),
  });
  if (!res.ok) {
    const errText = await res.text();
    console.error("AI error:", res.status, errText);
    throw new Error(`AI API error: ${res.status}`);
  }
  const data = await res.json();
  let content = data.choices?.[0]?.message?.content || "";
  content = content.replace(/```json\s*/g, "").replace(/```\s*/g, "").trim();
  return JSON.parse(content);
}

async function handleVendorResearch(body: any, supabase: any, serperKey: string, aiKey: string) {
  const { vendorName, vendorUrl, orgId, toolId, requestId, reportId } = body;
  if (!vendorName) throw new Error("vendorName is required");

  const searchQueries = [
    `${vendorName} AI security vulnerabilities 2025`,
    `${vendorName} AI data privacy concerns CVE`,
    `${vendorName} vs competitors comparison features pricing`,
    `${vendorName} AI bias fairness audit`,
  ];

  const searchResults = await Promise.all(searchQueries.map((q) => searchSerper(q, serperKey)));

  // Save search data to report if provided
  if (reportId) {
    await supabase.from("reports").update({ search_data: searchResults, status: "analyzing" }).eq("id", reportId);
  }

  const allResults = searchResults
    .flatMap((s) => s.organic.map((r: any) => `- [${r.title}](${r.link}): ${r.snippet || ""}`))
    .join("\n");

  const systemPrompt = `You are an AI security intelligence analyst. Analyze the AI service and return JSON with: trustScore (0-100), executiveSummary, vulnerabilities (dataPrivacy, promptInjection, modelBias, infrastructureSecurity, outputReliability, complianceRisk - each with score 1-10 and details), knowledgeFeed (array of {title, source, url, date, snippet, credibility}), competitors (array of {name, trustScore, pricing, securityFeatures, compliance}). Include source references in details fields.`;

  const analysis = await callAI(systemPrompt, `Analyze "${vendorName}" based on:\n\n${allResults}`, aiKey);

  // Save analysis to report
  if (reportId) {
    await supabase.from("reports").update({ analysis, trust_score: analysis.trustScore, status: "complete" }).eq("id", reportId);
  }

  // Upsert vendor research data
  if (orgId) {
    const { data: existingVendor } = await supabase.from("vendors").select("id").eq("name", vendorName).eq("org_id", orgId).maybeSingle();
    if (existingVendor) {
      await supabase.from("vendors").update({ research_data: analysis, website: vendorUrl || null }).eq("id", existingVendor.id);
    } else {
      await supabase.from("vendors").insert({ name: vendorName, org_id: orgId, website: vendorUrl || null, research_data: analysis });
    }
  }

  // Update request submission_data if provided
  if (requestId) {
    await supabase.from("requests").update({ submission_data: analysis }).eq("id", requestId);
  }

  // Update tool risk_level based on trust score
  if (toolId && analysis.trustScore != null) {
    const riskLevel = analysis.trustScore >= 70 ? "low" : analysis.trustScore >= 40 ? "medium" : "high";
    await supabase.from("tools").update({ risk_level: riskLevel }).eq("id", toolId);
  }

  return new Response(JSON.stringify({ success: true, analysis }), {
    headers: { ...corsHeaders, "Content-Type": "application/json" },
  });
}

async function handleRequestAnalysis(body: any, supabase: any, serperKey: string, aiKey: string) {
  // Reuses vendor-research logic but scoped to a request
  return await handleVendorResearch(body, supabase, serperKey, aiKey);
}

async function handleMaturityRecs(body: any, supabase: any, aiKey: string) {
  const { orgId } = body;
  if (!orgId) throw new Error("orgId is required");

  const { data: tools } = await supabase.from("tools").select("*").eq("org_id", orgId);
  const { data: controls } = await supabase.from("controls").select("*").eq("org_id", orgId);

  const totalTools = tools?.length || 0;
  const approvedTools = tools?.filter((t: any) => t.status === "approved").length || 0;
  const totalControls = controls?.length || 0;
  const attestedControls = controls?.filter((c: any) => c.status === "compliant").length || 0;

  const toolRatio = totalTools > 0 ? approvedTools / totalTools : 0;
  const controlRatio = totalControls > 0 ? attestedControls / totalControls : 0;
  const maturityScore = Math.round((toolRatio * 40 + controlRatio * 60));

  const systemPrompt = `You are an AI governance maturity advisor. Given org metrics, return JSON: { score, grade (A-F), strengths (array of strings), gaps (array of strings), recommendations (array of {title, description, priority: high|medium|low}) }`;

  const userPrompt = `Org has ${totalTools} tools (${approvedTools} approved), ${totalControls} controls (${attestedControls} attested). Maturity score: ${maturityScore}/100. Provide assessment.`;

  const assessment = await callAI(systemPrompt, userPrompt, aiKey);
  assessment.score = maturityScore;

  return new Response(JSON.stringify({ success: true, assessment }), {
    headers: { ...corsHeaders, "Content-Type": "application/json" },
  });
}
