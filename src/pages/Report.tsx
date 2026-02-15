import { useEffect, useState } from "react";
import { useParams, Link } from "react-router-dom";
import { supabase } from "@/integrations/supabase/client";
import { Shield, ArrowLeft, Download, ExternalLink, AlertTriangle, CheckCircle, Info } from "lucide-react";
import { motion } from "framer-motion";
import { Tooltip, TooltipContent, TooltipProvider, TooltipTrigger } from "@/components/ui/tooltip";
import {
  Radar, RadarChart, PolarGrid, PolarAngleAxis, PolarRadiusAxis,
  ResponsiveContainer,
} from "recharts";
import TrustGauge from "@/components/TrustGauge";
import { generatePDF } from "@/lib/pdf-export";

interface VulnCategory {
  score: number;
  details: string;
}

interface KnowledgeItem {
  title: string;
  source: string;
  url: string;
  date: string;
  snippet: string;
  credibility: "High" | "Medium" | "Low";
}

interface Competitor {
  name: string;
  trustScore: number;
  pricing: string;
  securityFeatures: string;
  compliance: string;
}

interface Analysis {
  trustScore: number;
  executiveSummary: string;
  vulnerabilities: Record<string, VulnCategory>;
  knowledgeFeed: KnowledgeItem[];
  competitors: Competitor[];
}

const VULN_LABELS: Record<string, string> = {
  dataPrivacy: "Data Privacy",
  promptInjection: "Prompt Injection",
  modelBias: "Model Bias",
  infrastructureSecurity: "Infrastructure",
  outputReliability: "Output Reliability",
  complianceRisk: "Compliance",
};

const VULN_RUBRICS: Record<string, { low: string; mid: string; high: string }> = {
  dataPrivacy: {
    low: "1-3: E2E encryption, no data retention, SOC 2 Type II",
    mid: "4-6: Standard encryption, some retention, opt-out available",
    high: "7-10: Data used for training, unclear policies, past breaches",
  },
  promptInjection: {
    low: "1-3: Documented guardrails, red-team tested, no public exploits",
    mid: "4-6: Basic guardrails, some bypasses patched",
    high: "7-10: No protections, known unpatched exploits",
  },
  modelBias: {
    low: "1-3: Published model cards, regular bias audits, fairness benchmarks",
    mid: "4-6: Some bias docs, occasional audits",
    high: "7-10: No audits, documented discriminatory outputs",
  },
  infrastructureSecurity: {
    low: "1-3: SOC 2 + ISO 27001, bug bounty, zero breaches",
    mid: "4-6: Basic certs, no bug bounty, minor incidents",
    high: "7-10: No certs, known breaches, poor incident response",
  },
  outputReliability: {
    low: "1-3: Low hallucination, citations/grounding, benchmarks published",
    mid: "4-6: Moderate hallucination, some grounding",
    high: "7-10: High hallucination, no grounding, misinformation incidents",
  },
  complianceRisk: {
    low: "1-3: GDPR, CCPA, HIPAA compliant, DPAs available",
    mid: "4-6: Partial compliance, DPA on request",
    high: "7-10: No compliance certs, regulatory actions pending",
  },
};

const credibilityColor: Record<string, string> = {
  High: "text-green-400 border-green-400/30 bg-green-400/10",
  Medium: "text-yellow-400 border-yellow-400/30 bg-yellow-400/10",
  Low: "text-red-400 border-red-400/30 bg-red-400/10",
};

const Report = () => {
  const { id } = useParams<{ id: string }>();
  const [report, setReport] = useState<any>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    if (!id) return;
    const fetchReport = async () => {
      const { data } = await supabase
        .from("reports")
        .select("*")
        .eq("id", id)
        .single();
      setReport(data);
      setLoading(false);
    };
    fetchReport();

    // Poll while pending/analyzing
    const interval = setInterval(async () => {
      const { data } = await supabase
        .from("reports")
        .select("*")
        .eq("id", id)
        .single();
      if (data) {
        setReport(data);
        if (data.status === "complete" || data.status === "error") {
          clearInterval(interval);
          setLoading(false);
        }
      }
    }, 3000);

    return () => clearInterval(interval);
  }, [id]);

  if (loading || !report || report.status !== "complete") {
    return (
      <div className="min-h-screen bg-background grid-bg flex items-center justify-center">
        <div className="text-center">
          <motion.div
            animate={{ scale: [1, 1.1, 1], opacity: [0.6, 1, 0.6] }}
            transition={{ duration: 2, repeat: Infinity }}
            className="mb-4 inline-block"
          >
            <Shield className="h-12 w-12 text-primary" />
          </motion.div>
          <p className="text-muted-foreground font-mono text-sm">
            {report?.status === "analyzing" ? "Synthesizing intelligence..." : "Loading report..."}
          </p>
        </div>
      </div>
    );
  }

  const analysis: Analysis = report.analysis;
  const radarData = Object.entries(analysis.vulnerabilities).map(([key, val]) => ({
    category: VULN_LABELS[key] || key,
    risk: val.score,
    fullMark: 10,
  }));

  const scoreColor = analysis.trustScore >= 70 ? "text-green-400" : analysis.trustScore >= 40 ? "text-yellow-400" : "text-red-400";

  return (
    <div className="min-h-screen bg-background grid-bg">
      {/* Header */}
      <header className="sticky top-0 z-40 backdrop-blur-xl bg-background/80 border-b border-border/50">
        <div className="max-w-7xl mx-auto px-4 py-3 flex items-center justify-between">
          <div className="flex items-center gap-3">
            <Link to="/" className="flex items-center gap-2 text-muted-foreground hover:text-foreground transition-colors">
              <ArrowLeft className="h-4 w-4" />
              <span className="text-sm">Back</span>
            </Link>
            <div className="w-px h-6 bg-border/50" />
            <div className="flex items-center gap-2">
              <Shield className="h-5 w-5 text-primary" />
              <span className="font-display font-bold text-foreground">AI Security Insight</span>
            </div>
          </div>
          <div className="flex items-center gap-3">
            <span className="text-xs text-muted-foreground font-mono">
              {new Date(report.created_at).toLocaleDateString()}
            </span>
            <button
              onClick={() => generatePDF(report)}
              className="flex items-center gap-1.5 px-4 py-2 rounded-lg bg-primary text-primary-foreground font-medium text-sm hover:bg-primary/90 transition-colors"
            >
              <Download className="h-4 w-4" />
              Export PDF
            </button>
          </div>
        </div>
      </header>

      <main className="max-w-7xl mx-auto px-4 py-8" id="report-content">
        <motion.h1
          initial={{ opacity: 0, y: 10 }}
          animate={{ opacity: 1, y: 0 }}
          className="font-display text-3xl font-bold text-foreground mb-8"
        >
          Security Intelligence: <span className="text-gradient-blue">{report.service_name}</span>
        </motion.h1>

        {/* Bento Grid */}
        <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
          {/* Executive Summary - spans 2 cols */}
          <motion.div
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ delay: 0.1 }}
            className="lg:col-span-2 glass-card p-6"
          >
            <h2 className="font-display text-lg font-semibold text-foreground mb-4 flex items-center gap-2">
              <CheckCircle className="h-5 w-5 text-primary" />
              Executive Summary
            </h2>
            <p className="text-muted-foreground leading-relaxed text-sm">
              {analysis.executiveSummary}
            </p>
            <TooltipProvider delayDuration={200}>
              <div className="mt-4 grid grid-cols-2 sm:grid-cols-3 gap-3">
                {Object.entries(analysis.vulnerabilities).map(([key, val]) => {
                  const rubric = VULN_RUBRICS[key];
                  return (
                    <Tooltip key={key}>
                      <TooltipTrigger asChild>
                        <div className="bg-secondary/50 rounded-lg p-3 cursor-help group relative">
                          <div className="flex items-center gap-1 mb-1">
                            <p className="text-xs text-muted-foreground">{VULN_LABELS[key] || key}</p>
                            <Info className="h-3 w-3 text-muted-foreground/50 group-hover:text-muted-foreground transition-colors" />
                          </div>
                          <p className={`font-mono font-bold text-lg ${val.score >= 7 ? "text-red-400" : val.score >= 4 ? "text-yellow-400" : "text-green-400"}`}>
                            {val.score}/10
                          </p>
                        </div>
                      </TooltipTrigger>
                      {rubric && (
                        <TooltipContent side="top" className="max-w-xs space-y-1.5 p-3">
                          <p className="font-semibold text-xs mb-2">Scoring Rubric</p>
                          <p className="text-xs text-green-400">{rubric.low}</p>
                          <p className="text-xs text-yellow-400">{rubric.mid}</p>
                          <p className="text-xs text-red-400">{rubric.high}</p>
                        </TooltipContent>
                      )}
                    </Tooltip>
                  );
                })}
              </div>
            </TooltipProvider>
          </motion.div>

          {/* Trust Score Gauge */}
          <motion.div
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ delay: 0.2 }}
            className="glass-card p-6 flex flex-col items-center justify-center"
          >
            <h2 className="font-display text-lg font-semibold text-foreground mb-4">Trust Score</h2>
            <TrustGauge score={analysis.trustScore} />
            <p className={`mt-4 font-display text-4xl font-bold ${scoreColor}`}>
              {analysis.trustScore}
            </p>
            <p className="text-muted-foreground text-xs mt-1">out of 100</p>
          </motion.div>

          {/* Vulnerability Radar */}
          <motion.div
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ delay: 0.3 }}
            className="lg:col-span-2 glass-card p-6"
          >
            <h2 className="font-display text-lg font-semibold text-foreground mb-4 flex items-center gap-2">
              <AlertTriangle className="h-5 w-5 text-destructive" />
              Vulnerability Radar
            </h2>
            <div className="h-[300px]">
              <ResponsiveContainer width="100%" height="100%">
                <RadarChart data={radarData}>
                  <PolarGrid stroke="hsl(220 15% 16%)" />
                  <PolarAngleAxis
                    dataKey="category"
                    tick={{ fill: "hsl(215 15% 55%)", fontSize: 11 }}
                  />
                  <PolarRadiusAxis
                    angle={30}
                    domain={[0, 10]}
                    tick={{ fill: "hsl(215 15% 55%)", fontSize: 10 }}
                  />
                  <Radar
                    name="Risk"
                    dataKey="risk"
                    stroke="hsl(0 84% 60%)"
                    fill="hsl(0 84% 60%)"
                    fillOpacity={0.25}
                    strokeWidth={2}
                  />
                </RadarChart>
              </ResponsiveContainer>
            </div>
            {/* Vulnerability details */}
            <div className="mt-4 space-y-3">
              {Object.entries(analysis.vulnerabilities).map(([key, val]) => (
                <div key={key} className="text-sm">
                  <span className="font-medium text-foreground">{VULN_LABELS[key] || key}:</span>{" "}
                  <span className="text-muted-foreground" dangerouslySetInnerHTML={{ __html: val.details.replace(/\[([^\]]+)\]\((https?:\/\/[^\)]+)\)/g, '<a href="$2" target="_blank" rel="noopener noreferrer" class="text-primary hover:underline inline-flex items-center gap-0.5">$1<svg xmlns="http://www.w3.org/2000/svg" width="10" height="10" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round" class="inline"><path d="M18 13v6a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2V8a2 2 0 0 1 2-2h6"/><polyline points="15 3 21 3 21 9"/><line x1="10" y1="14" x2="21" y2="3"/></svg></a>') }} />
                </div>
              ))}
            </div>
          </motion.div>

          {/* Competitive Context */}
          <motion.div
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ delay: 0.4 }}
            className="glass-card p-6"
          >
            <h2 className="font-display text-lg font-semibold text-foreground mb-4">
              Competitive Context
            </h2>
            <div className="space-y-4">
              {analysis.competitors?.map((comp, i) => (
                <div key={i} className="bg-secondary/50 rounded-lg p-3">
                  <p className="font-medium text-foreground text-sm">{comp.name}</p>
                  <div className="mt-2 space-y-1.5">
                    <div className="flex justify-between text-xs">
                      <span className="text-muted-foreground">Trust Score</span>
                      <span className={`font-mono ${comp.trustScore >= 70 ? "text-green-400" : comp.trustScore >= 40 ? "text-yellow-400" : "text-red-400"}`}>
                        {comp.trustScore}/100
                      </span>
                    </div>
                    <div className="text-xs text-muted-foreground">
                      <span className="text-foreground">Pricing:</span> {comp.pricing}
                    </div>
                    <div className="text-xs text-muted-foreground">
                      <span className="text-foreground">Security:</span> {comp.securityFeatures}
                    </div>
                    <div className="text-xs text-muted-foreground">
                      <span className="text-foreground">Compliance:</span> {comp.compliance}
                    </div>
                  </div>
                </div>
              ))}
            </div>
          </motion.div>

          {/* Knowledge Feed - full width */}
          <motion.div
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ delay: 0.5 }}
            className="lg:col-span-3 glass-card p-6"
          >
            <h2 className="font-display text-lg font-semibold text-foreground mb-4">
              Intelligence Feed
            </h2>
            <div className="space-y-4">
              {analysis.knowledgeFeed?.map((item, i) => (
                <div
                  key={i}
                  className="flex items-start gap-4 p-4 bg-secondary/30 rounded-lg hover:bg-secondary/50 transition-colors"
                >
                  <div className="w-1 h-full min-h-[60px] rounded-full bg-primary/30 shrink-0" />
                  <div className="flex-1 min-w-0">
                    <div className="flex items-start justify-between gap-2 mb-1">
                      <a
                        href={item.url}
                        target="_blank"
                        rel="noopener noreferrer"
                        className="font-medium text-foreground text-sm hover:text-primary transition-colors flex items-center gap-1"
                      >
                        {item.title}
                        <ExternalLink className="h-3 w-3 shrink-0" />
                      </a>
                      <span
                        className={`text-xs px-2 py-0.5 rounded-full border shrink-0 ${credibilityColor[item.credibility] || credibilityColor.Medium}`}
                      >
                        {item.credibility}
                      </span>
                    </div>
                    <p className="text-xs text-muted-foreground mb-1">
                      {item.source} · {item.date}
                    </p>
                    <p className="text-sm text-muted-foreground">{item.snippet}</p>
                  </div>
                </div>
              ))}
            </div>
          </motion.div>
        </div>
      </main>
    </div>
  );
};

export default Report;
