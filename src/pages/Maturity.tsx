import { useEffect, useState, useCallback } from "react";
import { motion } from "framer-motion";
import { TrendingUp, FileText, RefreshCw } from "lucide-react";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/hooks/useAuth";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { useToast } from "@/hooks/use-toast";
import TrustGauge from "@/components/TrustGauge";
import { Badge } from "@/components/ui/badge";

const Maturity = () => {
  const { profile } = useAuth();
  const { toast } = useToast();
  const [assessment, setAssessment] = useState<any>(null);
  const [loading, setLoading] = useState(false);
  const [stats, setStats] = useState({ totalTools: 0, approvedTools: 0, totalControls: 0, attestedControls: 0 });

  const fetchStats = async () => {
    if (!profile?.company_id) return;
    const [toolsRes, controlsRes] = await Promise.all([
      supabase.from("tools").select("id, status").eq("org_id", profile.company_id),
      supabase.from("controls").select("id, status").eq("org_id", profile.company_id),
    ]);
    const tools = toolsRes.data || [];
    const controls = controlsRes.data || [];
    setStats({
      totalTools: tools.length,
      approvedTools: tools.filter((t) => t.status === "approved").length,
      totalControls: controls.length,
      attestedControls: controls.filter((c) => c.status === "compliant").length,
    });
  };

  useEffect(() => { fetchStats(); }, [profile?.company_id]);

  const calculateMaturity = useCallback(async () => {
    if (!profile?.company_id) return;
    setLoading(true);
    try {
      const res = await fetch(`${import.meta.env.VITE_SUPABASE_URL}/functions/v1/ai-action`, {
        method: "POST",
        headers: { "Content-Type": "application/json", Authorization: `Bearer ${import.meta.env.VITE_SUPABASE_PUBLISHABLE_KEY}` },
        body: JSON.stringify({ type: "maturity-recs", orgId: profile.company_id }),
      });
      const data = await res.json();
      if (data.assessment) setAssessment(data.assessment);
      else throw new Error(data.error || "Failed");
    } catch (e: any) {
      toast({ title: "Assessment failed", description: e?.message, variant: "destructive" });
    } finally {
      setLoading(false);
    }
  }, [profile, toast]);

  const score = assessment?.score ?? Math.round(
    (stats.totalTools > 0 ? stats.approvedTools / stats.totalTools : 0) * 40 +
    (stats.totalControls > 0 ? stats.attestedControls / stats.totalControls : 0) * 60
  );

  return (
    <div className="p-6 max-w-5xl mx-auto space-y-6">
      <motion.div initial={{ opacity: 0, y: 10 }} animate={{ opacity: 1, y: 0 }} className="flex items-center justify-between">
        <div>
          <h1 className="font-display text-3xl font-bold text-foreground">Maturity Assessment</h1>
          <p className="text-muted-foreground text-sm mt-1">AI governance maturity score and recommendations</p>
        </div>
        <Button onClick={calculateMaturity} disabled={loading} className="gap-2">
          <RefreshCw className={`h-4 w-4 ${loading ? "animate-spin" : ""}`} />
          {loading ? "Calculating..." : "Calculate Score"}
        </Button>
      </motion.div>

      <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
        <Card className="glass-card border-border/50">
          <CardHeader><CardTitle className="text-lg">Maturity Score</CardTitle></CardHeader>
          <CardContent className="flex flex-col items-center">
            <TrustGauge score={score} />
            <p className="text-4xl font-bold font-display text-foreground mt-4">{score}/100</p>
            {assessment?.grade && (
              <Badge variant="outline" className="mt-2 text-lg px-4 py-1">Grade: {assessment.grade}</Badge>
            )}
          </CardContent>
        </Card>

        <Card className="glass-card border-border/50">
          <CardHeader><CardTitle className="text-lg">Breakdown</CardTitle></CardHeader>
          <CardContent className="space-y-4">
            <div className="flex justify-between text-sm">
              <span className="text-muted-foreground">Approved Tools</span>
              <span className="font-medium text-foreground">{stats.approvedTools} / {stats.totalTools}</span>
            </div>
            <div className="flex justify-between text-sm">
              <span className="text-muted-foreground">Attested Controls</span>
              <span className="font-medium text-foreground">{stats.attestedControls} / {stats.totalControls}</span>
            </div>
            <div className="flex justify-between text-sm">
              <span className="text-muted-foreground">Tool Approval Rate</span>
              <span className="font-medium text-foreground">{stats.totalTools > 0 ? Math.round((stats.approvedTools / stats.totalTools) * 100) : 0}%</span>
            </div>
            <div className="flex justify-between text-sm">
              <span className="text-muted-foreground">Control Attestation Rate</span>
              <span className="font-medium text-foreground">{stats.totalControls > 0 ? Math.round((stats.attestedControls / stats.totalControls) * 100) : 0}%</span>
            </div>
          </CardContent>
        </Card>
      </div>

      {assessment?.recommendations && (
        <Card className="glass-card border-border/50">
          <CardHeader><CardTitle className="text-lg">Recommendations</CardTitle></CardHeader>
          <CardContent className="space-y-3">
            {assessment.recommendations.map((rec: any, i: number) => (
              <div key={i} className="p-3 rounded-lg border border-border/50 bg-secondary/20">
                <div className="flex items-center justify-between mb-1">
                  <span className="font-medium text-foreground text-sm">{rec.title}</span>
                  <Badge variant="outline" className={rec.priority === "high" ? "text-red-400" : rec.priority === "medium" ? "text-yellow-400" : "text-green-400"}>
                    {rec.priority}
                  </Badge>
                </div>
                <p className="text-xs text-muted-foreground">{rec.description}</p>
              </div>
            ))}
          </CardContent>
        </Card>
      )}

      {assessment?.strengths && (
        <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
          <Card className="glass-card border-border/50">
            <CardHeader><CardTitle className="text-lg text-green-400">Strengths</CardTitle></CardHeader>
            <CardContent>
              <ul className="space-y-2">
                {assessment.strengths.map((s: string, i: number) => (
                  <li key={i} className="text-sm text-muted-foreground flex items-start gap-2">
                    <span className="text-green-400 mt-0.5">✓</span> {s}
                  </li>
                ))}
              </ul>
            </CardContent>
          </Card>
          <Card className="glass-card border-border/50">
            <CardHeader><CardTitle className="text-lg text-yellow-400">Gaps</CardTitle></CardHeader>
            <CardContent>
              <ul className="space-y-2">
                {assessment.gaps?.map((g: string, i: number) => (
                  <li key={i} className="text-sm text-muted-foreground flex items-start gap-2">
                    <span className="text-yellow-400 mt-0.5">!</span> {g}
                  </li>
                ))}
              </ul>
            </CardContent>
          </Card>
        </div>
      )}
    </div>
  );
};

export default Maturity;
