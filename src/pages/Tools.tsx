import { useEffect, useState } from "react";
import { useNavigate } from "react-router-dom";
import { motion } from "framer-motion";
import { Wrench, ExternalLink, Filter, ArrowRight, GitPullRequest, ShieldCheck, FileText } from "lucide-react";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/hooks/useAuth";
import { Button } from "@/components/ui/button";
import { Card, CardContent } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { Progress } from "@/components/ui/progress";

const TOOL_STATUSES = ["pending", "approved", "rejected", "sunset"] as const;
const RISK_LEVELS = ["high", "medium", "low"] as const;

const statusColors: Record<string, string> = {
  pending: "bg-yellow-500/10 text-yellow-400 border-yellow-500/20",
  approved: "bg-green-500/10 text-green-400 border-green-500/20",
  rejected: "bg-red-500/10 text-red-400 border-red-500/20",
  sunset: "bg-muted text-muted-foreground border-border",
};

const riskColors: Record<string, string> = {
  high: "bg-red-500/10 text-red-400 border-red-500/20",
  medium: "bg-yellow-500/10 text-yellow-400 border-yellow-500/20",
  low: "bg-green-500/10 text-green-400 border-green-500/20",
};

const Tools = () => {
  const { profile } = useAuth();
  const navigate = useNavigate();
  const [tools, setTools] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  const [filterStatus, setFilterStatus] = useState("all");
  const [filterRisk, setFilterRisk] = useState("all");

  useEffect(() => {
    if (!profile?.company_id) return;
    const fetchTools = async () => {
      const { data } = await supabase
        .from("tools")
        .select("*, reports:report_id(id, trust_score, status)")
        .eq("org_id", profile.company_id)
        .order("created_at", { ascending: false });
      setTools(data || []);
      setLoading(false);
    };
    fetchTools();
  }, [profile?.company_id]);

  const filtered = tools.filter((t) => {
    if (filterStatus !== "all" && t.status !== filterStatus) return false;
    if (filterRisk !== "all" && t.risk_level !== filterRisk) return false;
    return true;
  });

  const approvedCount = tools.filter((t) => t.status === "approved").length;
  const pendingCount = tools.filter((t) => t.status === "pending").length;
  const avgTrustScore = (() => {
    const withScores = tools.filter((t) => t.reports?.trust_score != null);
    if (withScores.length === 0) return null;
    return Math.round(withScores.reduce((sum, t) => sum + (t.reports?.trust_score || 0), 0) / withScores.length);
  })();

  return (
    <div className="p-6 max-w-7xl mx-auto space-y-6">
      <motion.div initial={{ opacity: 0, y: 10 }} animate={{ opacity: 1, y: 0 }} className="flex items-center justify-between">
        <div>
          <h1 className="font-display text-3xl font-bold text-foreground">Tool Inventory</h1>
          <p className="text-muted-foreground text-sm mt-1">
            All AI tools in your organization — added via the{" "}
            <button onClick={() => navigate("/requests")} className="text-primary hover:underline">request pipeline</button>
          </p>
        </div>
        <Button onClick={() => navigate("/requests")} className="gap-2">
          <GitPullRequest className="h-4 w-4" /> Request New Tool
        </Button>
      </motion.div>

      {/* Summary Stats */}
      <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
        <Card className="glass-card border-border/50">
          <CardContent className="p-4 text-center">
            <p className="text-2xl font-bold font-display text-foreground">{tools.length}</p>
            <p className="text-xs text-muted-foreground">Total Tools</p>
          </CardContent>
        </Card>
        <Card className="glass-card border-border/50">
          <CardContent className="p-4 text-center">
            <p className="text-2xl font-bold font-display text-green-400">{approvedCount}</p>
            <p className="text-xs text-muted-foreground">Approved</p>
          </CardContent>
        </Card>
        <Card className="glass-card border-border/50">
          <CardContent className="p-4 text-center">
            <p className="text-2xl font-bold font-display text-yellow-400">{pendingCount}</p>
            <p className="text-xs text-muted-foreground">Pending Review</p>
          </CardContent>
        </Card>
        <Card className="glass-card border-border/50">
          <CardContent className="p-4 text-center">
            <p className="text-2xl font-bold font-display text-primary">{avgTrustScore != null ? `${avgTrustScore}/100` : "—"}</p>
            <p className="text-xs text-muted-foreground">Avg Trust Score</p>
          </CardContent>
        </Card>
      </div>

      {/* Filters */}
      <div className="flex gap-3 items-center flex-wrap">
        <Filter className="h-4 w-4 text-muted-foreground" />
        <Select value={filterStatus} onValueChange={setFilterStatus}>
          <SelectTrigger className="w-[140px]"><SelectValue placeholder="Status" /></SelectTrigger>
          <SelectContent>
            <SelectItem value="all">All Status</SelectItem>
            {TOOL_STATUSES.map((s) => <SelectItem key={s} value={s} className="capitalize">{s}</SelectItem>)}
          </SelectContent>
        </Select>
        <Select value={filterRisk} onValueChange={setFilterRisk}>
          <SelectTrigger className="w-[140px]"><SelectValue placeholder="Risk" /></SelectTrigger>
          <SelectContent>
            <SelectItem value="all">All Risk</SelectItem>
            {RISK_LEVELS.map((r) => <SelectItem key={r} value={r} className="capitalize">{r}</SelectItem>)}
          </SelectContent>
        </Select>
      </div>

      {/* Tool Table */}
      {loading ? (
        <p className="text-muted-foreground">Loading...</p>
      ) : filtered.length === 0 ? (
        <Card className="glass-card border-border/50">
          <CardContent className="p-12 text-center">
            <Wrench className="h-12 w-12 text-muted-foreground mx-auto mb-4" />
            <p className="text-muted-foreground mb-2">No tools in your inventory yet.</p>
            <p className="text-muted-foreground text-sm mb-4">Tools are added automatically when approved through the request pipeline.</p>
            <Button onClick={() => navigate("/requests")} className="gap-2">
              <GitPullRequest className="h-4 w-4" /> Go to Requests
            </Button>
          </CardContent>
        </Card>
      ) : (
        <Card className="glass-card border-border/50">
          <Table>
            <TableHeader>
              <TableRow>
                <TableHead>Tool</TableHead>
                <TableHead>Category</TableHead>
                <TableHead>Status</TableHead>
                <TableHead>Risk</TableHead>
                <TableHead>Trust Score</TableHead>
                <TableHead className="text-right">Actions</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {filtered.map((tool) => (
                <TableRow
                  key={tool.id}
                  className="cursor-pointer hover:bg-secondary/30"
                  onClick={() => {
                    if (tool.report_id) navigate(`/reports/${tool.report_id}`);
                  }}
                >
                  <TableCell>
                    <div className="flex items-center gap-2">
                      <Wrench className="h-4 w-4 text-primary shrink-0" />
                      <div>
                        <p className="font-medium text-foreground">{tool.name}</p>
                        {tool.url && (
                          <a
                            href={tool.url}
                            target="_blank"
                            rel="noopener noreferrer"
                            className="text-xs text-muted-foreground hover:text-primary flex items-center gap-1"
                            onClick={(e) => e.stopPropagation()}
                          >
                            <ExternalLink className="h-3 w-3" /> {(() => { try { return new URL(tool.url).hostname; } catch { return tool.url; } })()}
                          </a>
                        )}
                      </div>
                    </div>
                  </TableCell>
                  <TableCell>
                    <span className="text-sm text-muted-foreground">{tool.category || "—"}</span>
                  </TableCell>
                  <TableCell>
                    <Badge variant="outline" className={statusColors[tool.status]}>{tool.status}</Badge>
                  </TableCell>
                  <TableCell>
                    {tool.risk_level ? (
                      <Badge variant="outline" className={riskColors[tool.risk_level]}>{tool.risk_level}</Badge>
                    ) : (
                      <span className="text-xs text-muted-foreground">—</span>
                    )}
                  </TableCell>
                  <TableCell>
                    {tool.reports?.trust_score != null ? (
                      <span className={`font-mono font-semibold ${
                        tool.reports.trust_score >= 70 ? "text-green-400" : tool.reports.trust_score >= 40 ? "text-yellow-400" : "text-red-400"
                      }`}>
                        {tool.reports.trust_score}/100
                      </span>
                    ) : (
                      <span className="text-xs text-muted-foreground">—</span>
                    )}
                  </TableCell>
                  <TableCell className="text-right">
                    {tool.report_id ? (
                      <Button variant="ghost" size="sm" className="gap-1 text-xs" onClick={(e) => { e.stopPropagation(); navigate(`/reports/${tool.report_id}`); }}>
                        <FileText className="h-3 w-3" /> View Report
                      </Button>
                    ) : (
                      <span className="text-xs text-muted-foreground">No report</span>
                    )}
                  </TableCell>
                </TableRow>
              ))}
            </TableBody>
          </Table>
        </Card>
      )}
    </div>
  );
};

export default Tools;
