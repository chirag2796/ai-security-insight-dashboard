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
    const { serviceName, reportId } = await req.json();
    if (!serviceName) throw new Error("serviceName is required");

    const SERPER_API_KEY = Deno.env.get("SERPER_API_KEY");
    const OPENROUTER_API_KEY = Deno.env.get("OPENROUTER_API_KEY");
    const SUPABASE_URL = Deno.env.get("SUPABASE_URL")!;
    const SUPABASE_SERVICE_ROLE_KEY = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!;

    if (!SERPER_API_KEY) throw new Error("SERPER_API_KEY not configured");
    if (!OPENROUTER_API_KEY) throw new Error("OPENROUTER_API_KEY not configured");

    const supabase = createClient(SUPABASE_URL, SUPABASE_SERVICE_ROLE_KEY);

    // Step 1: Web search via Serper
    const searchQueries = [
      `${serviceName} AI security vulnerabilities 2025`,
      `${serviceName} AI data privacy concerns CVE`,
      `${serviceName} vs competitors comparison features pricing`,
      `${serviceName} AI bias fairness audit`,
    ];

    const searchResults = await Promise.all(
      searchQueries.map(async (q) => {
        const res = await fetch("https://google.serper.dev/search", {
          method: "POST",
          headers: {
            "X-API-KEY": SERPER_API_KEY,
            "Content-Type": "application/json",
          },
          body: JSON.stringify({ q, num: 8 }),
        });
        if (!res.ok) {
          console.error(`Serper error for "${q}":`, res.status);
          return { query: q, organic: [] };
        }
        const data = await res.json();
        return { query: q, organic: data.organic || [] };
      })
    );

    // Save raw search data
    if (reportId) {
      await supabase
        .from("reports")
        .update({ search_data: searchResults, status: "analyzing" })
        .eq("id", reportId);
    }

    // Step 2: Synthesize with OpenRouter
    const allResults = searchResults
      .flatMap((s) =>
        s.organic.map((r: any) => `- [${r.title}](${r.link}): ${r.snippet || ""}`)
      )
      .join("\n");

    const systemPrompt = `You are Aegis Insight, an AI security intelligence analyst. You produce structured security intelligence reports about AI services and products.

Given web search results about an AI service, produce a comprehensive JSON analysis. Be specific, cite real data from the search results, and be balanced but thorough about risks.

SCORING RUBRICS — use these criteria strictly:

**Vulnerability Scores (1-10, higher = MORE risk):**

Data Privacy:
1-3: End-to-end encryption, no data retention, SOC 2 Type II, transparent data handling policies
4-6: Standard encryption, some data retention for training (opt-out available), basic compliance
7-10: Data used for training by default, unclear retention policies, past breaches, no opt-out

Prompt Injection:
1-3: Documented guardrails, input sanitization, known red-team testing, no public exploits
4-6: Basic guardrails, some known bypasses patched, limited adversarial testing
7-10: No documented protections, known unpatched exploits, easy jailbreaks widely shared

Model Bias:
1-3: Published model cards, regular bias audits, diverse training data documentation, fairness benchmarks
4-6: Some bias documentation, occasional audits, known moderate biases acknowledged
7-10: No bias audits, documented discriminatory outputs, no fairness commitments

Infrastructure Security:
1-3: SOC 2 + ISO 27001, bug bounty program, regular pentests, zero known breaches
4-6: Basic certifications, no bug bounty, minor past incidents resolved quickly
7-10: No certifications, known breaches, poor incident response, infrastructure vulnerabilities

Output Reliability:
1-3: Low hallucination rates, citations/grounding, confidence scoring, factual benchmarks published
4-6: Moderate hallucination rates, some grounding features, no published benchmarks
7-10: High hallucination rates, no grounding/citations, known misinformation incidents

Compliance Risk:
1-3: GDPR, CCPA, HIPAA compliant, regional data residency, DPAs available
4-6: Partial compliance, some regions supported, DPA available on request
7-10: No compliance certifications, unclear jurisdiction, no DPA, regulatory actions pending

**Trust Score (0-100):**
90-100: Industry-leading security posture, all certifications, transparent practices
70-89: Strong security with minor gaps, most certifications, good transparency
50-69: Average security, some certifications, notable gaps in transparency
30-49: Below average, few certifications, significant concerns
0-29: Poor security posture, no certifications, major unresolved issues

Trust Score formula guidance: Start at 100, subtract weighted vulnerability averages. Data Privacy and Infrastructure carry 2x weight.

Return ONLY valid JSON with this exact structure:
{
  "trustScore": <number 0-100>,
  "executiveSummary": "<3 sentences about the service's security posture>",
  "vulnerabilities": {
    "dataPrivacy": { "score": <1-10>, "details": "<specific findings>" },
    "promptInjection": { "score": <1-10>, "details": "<specific findings>" },
    "modelBias": { "score": <1-10>, "details": "<specific findings>" },
    "infrastructureSecurity": { "score": <1-10>, "details": "<specific findings>" },
    "outputReliability": { "score": <1-10>, "details": "<specific findings>" },
    "complianceRisk": { "score": <1-10>, "details": "<specific findings>" }
  },
  "knowledgeFeed": [
    {
      "title": "<article title>",
      "source": "<source name>",
      "url": "<url>",
      "date": "<date or 'Recent'>",
      "snippet": "<2-3 sentence summary>",
      "credibility": "<High|Medium|Low>"
    }
  ],
  "competitors": [
    {
      "name": "<competitor name>",
      "trustScore": <number 0-100>,
      "pricing": "<pricing info>",
      "securityFeatures": "<key security features>",
      "compliance": "<certifications>"
    }
  ]
}`;

    const aiRes = await fetch("https://openrouter.ai/api/v1/chat/completions", {
      method: "POST",
      headers: {
        Authorization: `Bearer ${OPENROUTER_API_KEY}`,
        "Content-Type": "application/json",
      },
      body: JSON.stringify({
        model: "google/gemini-2.5-flash",
        messages: [
          { role: "system", content: systemPrompt },
          {
            role: "user",
            content: `Analyze the AI service "${serviceName}" based on these search results:\n\n${allResults}`,
          },
        ],
        temperature: 0.3,
      }),
    });

    if (!aiRes.ok) {
      const errText = await aiRes.text();
      console.error("OpenRouter error:", aiRes.status, errText);
      throw new Error(`OpenRouter API error: ${aiRes.status}`);
    }

    const aiData = await aiRes.json();
    let content = aiData.choices?.[0]?.message?.content || "";

    // Strip markdown code fences if present
    content = content.replace(/```json\s*/g, "").replace(/```\s*/g, "").trim();

    let analysis;
    try {
      analysis = JSON.parse(content);
    } catch {
      console.error("Failed to parse AI response:", content.substring(0, 500));
      throw new Error("AI returned invalid JSON");
    }

    // Step 3: Save final analysis
    if (reportId) {
      await supabase
        .from("reports")
        .update({
          analysis,
          trust_score: analysis.trustScore,
          status: "complete",
        })
        .eq("id", reportId);
    }

    return new Response(JSON.stringify({ success: true, analysis, reportId }), {
      headers: { ...corsHeaders, "Content-Type": "application/json" },
    });
  } catch (e) {
    console.error("analyze-service error:", e);
    return new Response(
      JSON.stringify({ error: e instanceof Error ? e.message : "Unknown error" }),
      { status: 500, headers: { ...corsHeaders, "Content-Type": "application/json" } }
    );
  }
});
