import { useEffect, useState } from "react";
import { useNavigate } from "react-router-dom";
import { motion } from "framer-motion";
import { Wrench, GitPullRequest, TrendingUp, Activity, Plus } from "lucide-react";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/hooks/useAuth";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";

const Dashboard = () => {
  const { profile } = useAuth();
  const navigate = useNavigate();
  const [stats, setStats] = useState({ tools: 0, openRequests: 0, maturityScore: 0 });
  const [activity, setActivity] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    if (!profile?.company_id) return;
    const orgId = profile.company_id;

    const fetchData = async () => {
      const [toolsRes, requestsRes, controlsRes, activityRes] = await Promise.all([
        supabase.from("tools").select("id, status").eq("org_id", orgId),
        supabase.from("requests").select("id, workflow_stage").eq("org_id", orgId),
        supabase.from("controls").select("id, status").eq("org_id", orgId),
        supabase.from("activity_log").select("*").eq("org_id", orgId).order("created_at", { ascending: false }).limit(10),
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
        openRequests: requests.filter((r) => r.workflow_stage !== "approved" && r.workflow_stage !== "rejected").length,
        maturityScore: Math.round(toolRatio * 40 + controlRatio * 60),
      });
      setActivity(activityRes.data || []);
      setLoading(false);
    };
    fetchData();
  }, [profile?.company_id]);

  const cards = [
    { label: "Total AI Tools", value: stats.tools, icon: Wrench, color: "text-primary" },
    { label: "Open Requests", value: stats.openRequests, icon: GitPullRequest, color: "text-yellow-400" },
    { label: "Maturity Score", value: `${stats.maturityScore}/100`, icon: TrendingUp, color: "text-green-400" },
  ];

  return (
    <div className="p-6 max-w-7xl mx-auto space-y-6">
      <motion.div initial={{ opacity: 0, y: 10 }} animate={{ opacity: 1, y: 0 }} className="flex items-center justify-between">
        <div>
          <h1 className="font-display text-3xl font-bold text-foreground">Dashboard</h1>
          <p className="text-muted-foreground text-sm mt-1">{profile?.company_name || "Organization"} overview</p>
        </div>
        <Button onClick={() => navigate("/requests")} className="gap-2">
          <Plus className="h-4 w-4" /> Request New Tool
        </Button>
      </motion.div>

      <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
        {cards.map((card, i) => (
          <motion.div key={card.label} initial={{ opacity: 0, y: 20 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: i * 0.1 }}>
            <Card className="glass-card border-border/50">
              <CardHeader className="flex flex-row items-center justify-between pb-2">
                <CardTitle className="text-sm font-medium text-muted-foreground">{card.label}</CardTitle>
                <card.icon className={`h-5 w-5 ${card.color}`} />
              </CardHeader>
              <CardContent>
                <div className="text-3xl font-bold font-display text-foreground">{loading ? "—" : card.value}</div>
              </CardContent>
            </Card>
          </motion.div>
        ))}
      </div>

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
    </div>
  );
};

export default Dashboard;
