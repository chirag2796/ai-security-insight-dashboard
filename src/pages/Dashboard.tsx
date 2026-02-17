import { useEffect, useState } from "react";
import { useNavigate } from "react-router-dom";
import { motion } from "framer-motion";
import {
  Wrench, GitPullRequest, TrendingUp, Activity, Plus, ShieldCheck,
  FileText, ArrowRight, CheckCircle2, XCircle, Clock, Eye,
} from "lucide-react";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/hooks/useAuth";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Progress } from "@/components/ui/progress";

const Dashboard = () => {
  const { profile, isAdmin } = useAuth();
  const navigate = useNavigate();
  const [stats, setStats] = useState({
    tools: 0, approvedTools: 0, pendingTools: 0, rejectedTools: 0,
    draftRequests: 0, reviewRequests: 0, approvedRequests: 0, rejectedRequests: 0,
    totalControls: 0, attestedControls: 0,
    reports: 0, maturityScore: 0,
  });
  const [recentRequests, setRecentRequests] = useState<any[]>([]);
  const [activity, setActivity] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    if (!profile?.company_id) return;
    const orgId = profile.company_id;

    const fetchData = async () => {
      const [toolsRes, requestsRes, controlsRes, reportsRes, activityRes] = await Promise.all([
        supabase.from("tools").select("id, status").eq("org_id", orgId),
        supabase.from("requests").select("id, workflow_stage, created_at, tools(name, report_id)").eq("org_id", orgId).order("created_at", { ascending: false }),
        supabase.from("controls").select("id, status").eq("org_id", orgId),
        supabase.from("reports").select("id").eq("company_id", orgId),
        supabase.from("activity_log").select("*").eq("org_id", orgId).order("created_at", { ascending: false }).limit(8),
      ]);

      const tools = toolsRes.data || [];
      const requests = requestsRes.data || [];
      const controls = controlsRes.data || [];
      const approved = tools.filter((t) => t.status === "approved").length;
      const attested = controls.filter((c) => c.status === "compliant").length;
      const toolRatio = tools.length > 0 ? approved / tools.length : 0;
      const controlRatio = controls.length > 0 ? attested / controls.length : 0;

      setStats({
        tools: tools.length,
        approvedTools: approved,
        pendingTools: tools.filter((t) => t.status === "pending").length,
        rejectedTools: tools.filter((t) => t.status === "rejected").length,
        draftRequests: requests.filter((r) => r.workflow_stage === "draft").length,
        reviewRequests: requests.filter((r) => r.workflow_stage === "review").length,
        approvedRequests: requests.filter((r) => r.workflow_stage === "approved").length,
        rejectedRequests: requests.filter((r) => r.workflow_stage === "rejected").length,
        totalControls: controls.length,
        attestedControls: attested,
        reports: reportsRes.data?.length || 0,
        maturityScore: Math.round(toolRatio * 40 + controlRatio * 60),
      });
      setRecentRequests(requests.slice(0, 5));
      setActivity(activityRes.data || []);
      setLoading(false);
    };
    fetchData();
  }, [profile?.company_id]);

  const pipelineStages = [
    {
      label: "Requested",
      count: stats.draftRequests + stats.reviewRequests,
      icon: GitPullRequest,
      color: "text-yellow-400",
      bgColor: "bg-yellow-500/10 border-yellow-500/20",
      onClick: () => navigate("/requests"),
    },
    {
      label: "Approved",
      count: stats.approvedTools,
      icon: CheckCircle2,
      color: "text-green-400",
      bgColor: "bg-green-500/10 border-green-500/20",
      onClick: () => navigate("/tools"),
    },
    {
      label: "Controls Attested",
      count: stats.attestedControls,
      icon: ShieldCheck,
      color: "text-primary",
      bgColor: "bg-primary/10 border-primary/20",
      onClick: () => navigate("/compliance"),
    },
    {
      label: "Reports Generated",
      count: stats.reports,
      icon: FileText,
      color: "text-blue-400",
      bgColor: "bg-blue-500/10 border-blue-500/20",
      onClick: () => navigate("/reports"),
    },
  ];

  const stageColors: Record<string, string> = {
    draft: "bg-muted text-muted-foreground",
    review: "bg-yellow-500/10 text-yellow-400 border-yellow-500/20",
    approved: "bg-green-500/10 text-green-400 border-green-500/20",
    rejected: "bg-red-500/10 text-red-400 border-red-500/20",
  };

  return (
    <div className="p-6 max-w-7xl mx-auto space-y-6">
      <motion.div initial={{ opacity: 0, y: 10 }} animate={{ opacity: 1, y: 0 }} className="flex items-center justify-between">
        <div>
          <h1 className="font-display text-3xl font-bold text-foreground">Dashboard</h1>
          <p className="text-muted-foreground text-sm mt-1">AI Governance Pipeline Overview</p>
        </div>
        <Button onClick={() => navigate("/requests")} className="gap-2">
          <Plus className="h-4 w-4" /> Request New Tool
        </Button>
      </motion.div>

      {/* Pipeline Visualization */}
      <motion.div initial={{ opacity: 0, y: 20 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: 0.1 }}>
        <Card className="glass-card border-border/50">
          <CardHeader className="pb-3">
            <CardTitle className="text-sm font-medium text-muted-foreground">Governance Pipeline</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="flex items-center gap-2">
              {pipelineStages.map((stage, i) => (
                <div key={stage.label} className="flex items-center flex-1">
                  <button
                    onClick={stage.onClick}
                    className={`flex-1 p-4 rounded-lg border ${stage.bgColor} hover:opacity-80 transition-opacity cursor-pointer text-center`}
                  >
                    <stage.icon className={`h-5 w-5 ${stage.color} mx-auto mb-2`} />
                    <p className={`text-2xl font-bold font-display ${stage.color}`}>{loading ? "—" : stage.count}</p>
                    <p className="text-xs text-muted-foreground mt-1">{stage.label}</p>
                  </button>
                  {i < pipelineStages.length - 1 && (
                    <ArrowRight className="h-4 w-4 text-muted-foreground/40 shrink-0 mx-1" />
                  )}
                </div>
              ))}
            </div>
          </CardContent>
        </Card>
      </motion.div>

      {/* Stats Row */}
      <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
        <motion.div initial={{ opacity: 0, y: 20 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: 0.15 }}>
          <Card className="glass-card border-border/50 cursor-pointer hover:border-primary/30 transition-colors" onClick={() => navigate("/tools")}>
            <CardHeader className="flex flex-row items-center justify-between pb-2">
              <CardTitle className="text-sm font-medium text-muted-foreground">Total AI Tools</CardTitle>
              <Wrench className="h-5 w-5 text-primary" />
            </CardHeader>
            <CardContent>
              <div className="text-3xl font-bold font-display text-foreground">{loading ? "—" : stats.tools}</div>
              <p className="text-xs text-muted-foreground mt-1">
                {stats.approvedTools} approved · {stats.pendingTools} pending
              </p>
            </CardContent>
          </Card>
        </motion.div>
        <motion.div initial={{ opacity: 0, y: 20 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: 0.2 }}>
          <Card className="glass-card border-border/50 cursor-pointer hover:border-primary/30 transition-colors" onClick={() => navigate("/compliance")}>
            <CardHeader className="flex flex-row items-center justify-between pb-2">
              <CardTitle className="text-sm font-medium text-muted-foreground">Compliance Rate</CardTitle>
              <ShieldCheck className="h-5 w-5 text-green-400" />
            </CardHeader>
            <CardContent>
              <div className="text-3xl font-bold font-display text-foreground">
                {loading ? "—" : `${stats.totalControls > 0 ? Math.round((stats.attestedControls / stats.totalControls) * 100) : 0}%`}
              </div>
              <Progress value={stats.totalControls > 0 ? (stats.attestedControls / stats.totalControls) * 100 : 0} className="mt-2" />
            </CardContent>
          </Card>
        </motion.div>
        <motion.div initial={{ opacity: 0, y: 20 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: 0.25 }}>
          <Card className="glass-card border-border/50 cursor-pointer hover:border-primary/30 transition-colors" onClick={() => navigate("/maturity")}>
            <CardHeader className="flex flex-row items-center justify-between pb-2">
              <CardTitle className="text-sm font-medium text-muted-foreground">Maturity Score</CardTitle>
              <TrendingUp className="h-5 w-5 text-yellow-400" />
            </CardHeader>
            <CardContent>
              <div className="text-3xl font-bold font-display text-foreground">{loading ? "—" : `${stats.maturityScore}/100`}</div>
              <Progress value={stats.maturityScore} className="mt-2" />
            </CardContent>
          </Card>
        </motion.div>
      </div>

      {/* Recent Requests + Activity */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        <motion.div initial={{ opacity: 0, y: 20 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: 0.3 }}>
          <Card className="glass-card border-border/50">
            <CardHeader className="flex flex-row items-center justify-between">
              <CardTitle className="flex items-center gap-2 text-lg">
                <GitPullRequest className="h-5 w-5 text-primary" /> Recent Requests
              </CardTitle>
              <Button variant="ghost" size="sm" onClick={() => navigate("/requests")} className="text-xs">
                View All <ArrowRight className="h-3 w-3 ml-1" />
              </Button>
            </CardHeader>
            <CardContent>
              {recentRequests.length === 0 ? (
                <div className="text-center py-6">
                  <GitPullRequest className="h-8 w-8 text-muted-foreground mx-auto mb-2" />
                  <p className="text-muted-foreground text-sm">No requests yet.</p>
                  <Button variant="outline" size="sm" className="mt-3" onClick={() => navigate("/requests")}>
                    Request Your First Tool
                  </Button>
                </div>
              ) : (
                <div className="space-y-3">
                  {recentRequests.map((r: any) => (
                    <div
                      key={r.id}
                      className="flex items-center justify-between p-2 rounded-lg hover:bg-secondary/30 cursor-pointer transition-colors"
                      onClick={() => {
                        const reportId = r.tools?.report_id;
                        if (reportId) navigate(`/reports/${reportId}`);
                      }}
                    >
                      <div className="flex items-center gap-3">
                        <GitPullRequest className="h-4 w-4 text-muted-foreground" />
                        <div>
                          <p className="text-sm font-medium text-foreground">{r.tools?.name || "Unknown"}</p>
                          <p className="text-xs text-muted-foreground">{new Date(r.created_at).toLocaleDateString()}</p>
                        </div>
                      </div>
                      <Badge variant="outline" className={stageColors[r.workflow_stage]}>{r.workflow_stage}</Badge>
                    </div>
                  ))}
                </div>
              )}
            </CardContent>
          </Card>
        </motion.div>

        <motion.div initial={{ opacity: 0, y: 20 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: 0.35 }}>
          <Card className="glass-card border-border/50">
            <CardHeader>
              <CardTitle className="flex items-center gap-2 text-lg">
                <Activity className="h-5 w-5 text-primary" /> Recent Activity
              </CardTitle>
            </CardHeader>
            <CardContent>
              {activity.length === 0 ? (
                <p className="text-muted-foreground text-sm">No activity yet. Start by requesting a new tool.</p>
              ) : (
                <div className="space-y-3">
                  {activity.map((a) => (
                    <div key={a.id} className="flex items-start gap-3 text-sm">
                      <div className="w-2 h-2 rounded-full bg-primary mt-1.5 shrink-0" />
                      <div>
                        <p className="text-foreground">{a.action}</p>
                        <p className="text-xs text-muted-foreground">{new Date(a.created_at).toLocaleString()}</p>
                      </div>
                    </div>
                  ))}
                </div>
              )}
            </CardContent>
          </Card>
        </motion.div>
      </div>
    </div>
  );
};

export default Dashboard;
