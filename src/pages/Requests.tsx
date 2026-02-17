import { useEffect, useState, useCallback } from "react";
import { useNavigate } from "react-router-dom";
import { motion, AnimatePresence } from "framer-motion";
import { Plus, GitPullRequest, ChevronRight } from "lucide-react";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/hooks/useAuth";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogTrigger } from "@/components/ui/dialog";
import { Input } from "@/components/ui/input";
import { useToast } from "@/hooks/use-toast";
import ScanningAnimation from "@/components/ScanningAnimation";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";

const stageColors: Record<string, string> = {
  draft: "bg-muted text-muted-foreground",
  review: "bg-yellow-500/10 text-yellow-400 border-yellow-500/20",
  approved: "bg-green-500/10 text-green-400 border-green-500/20",
  rejected: "bg-red-500/10 text-red-400 border-red-500/20",
};

const Requests = () => {
  const { profile, user, isAdmin } = useAuth();
  const navigate = useNavigate();
  const { toast } = useToast();
  const [requests, setRequests] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  const [dialogOpen, setDialogOpen] = useState(false);
  const [toolName, setToolName] = useState("");
  const [toolUrl, setToolUrl] = useState("");
  const [isScanning, setIsScanning] = useState(false);
  const [scanningName, setScanningName] = useState("");

  const fetchRequests = async () => {
    if (!profile?.company_id) return;
    const { data } = await supabase
      .from("requests")
      .select("*, tools(name, url, status, risk_level, report_id)")
      .eq("org_id", profile.company_id)
      .order("created_at", { ascending: false });
    setRequests(data || []);
    setLoading(false);
  };

  useEffect(() => { fetchRequests(); }, [profile?.company_id]);

  const handleNewRequest = useCallback(async () => {
    if (!toolName.trim() || !profile?.company_id || !user) return;
    setDialogOpen(false);
    setScanningName(toolName.trim());
    setIsScanning(true);

    try {
      // Create tool record
      const { data: tool, error: toolErr } = await supabase.from("tools").insert({
        name: toolName.trim(), url: toolUrl.trim() || null, org_id: profile.company_id, created_by: user.id, status: "pending",
      }).select().single();
      if (toolErr || !tool) throw toolErr;

      // Create report record
      const { data: report, error: repErr } = await supabase.from("reports").insert({
        service_name: toolName.trim(), status: "pending", user_id: user.id, company_id: profile.company_id,
      }).select().single();
      if (repErr || !report) throw repErr;

      // Link tool to report
      await supabase.from("tools").update({ report_id: report.id }).eq("id", tool.id);

      // Create request record
      const { data: request, error: reqErr } = await supabase.from("requests").insert({
        tool_id: tool.id, requester_id: user.id, org_id: profile.company_id, workflow_stage: "draft",
      }).select().single();
      if (reqErr) throw reqErr;

      // Trigger AI analysis
      await fetch(`${import.meta.env.VITE_SUPABASE_URL}/functions/v1/ai-action`, {
        method: "POST",
        headers: { "Content-Type": "application/json", Authorization: `Bearer ${import.meta.env.VITE_SUPABASE_PUBLISHABLE_KEY}` },
        body: JSON.stringify({
          type: "vendor-research", vendorName: toolName.trim(), vendorUrl: toolUrl.trim() || null,
          orgId: profile.company_id, toolId: tool.id, requestId: request?.id, reportId: report.id,
        }),
      });

      // Log activity
      await supabase.from("activity_log").insert({
        org_id: profile.company_id, actor_id: user.id, action: `Requested new tool: ${toolName.trim()}`,
        entity_type: "request", entity_id: request?.id,
      });

      toast({ title: "Tool analysis complete" });
      setToolName("");
      setToolUrl("");
      fetchRequests();
    } catch (e: any) {
      console.error("Request failed:", e);
      toast({ title: "Request failed", description: e?.message, variant: "destructive" });
    } finally {
      setIsScanning(false);
    }
  }, [toolName, toolUrl, profile, user, toast]);

  const handleStageChange = async (requestId: string, newStage: string) => {
    await supabase.from("requests").update({ workflow_stage: newStage as any }).eq("id", requestId);
    if (newStage === "approved") {
      const req = requests.find((r) => r.id === requestId);
      if (req?.tool_id) {
        await supabase.from("tools").update({ status: "approved" as any }).eq("id", req.tool_id);
      }
    } else if (newStage === "rejected") {
      const req = requests.find((r) => r.id === requestId);
      if (req?.tool_id) {
        await supabase.from("tools").update({ status: "rejected" as any }).eq("id", req.tool_id);
      }
    }
    if (profile?.company_id && user) {
      await supabase.from("activity_log").insert({
        org_id: profile.company_id, actor_id: user.id, action: `Changed request stage to ${newStage}`,
        entity_type: "request", entity_id: requestId,
      });
    }
    fetchRequests();
  };

  return (
    <>
      <AnimatePresence>
        {isScanning && <ScanningAnimation serviceName={scanningName} onComplete={() => setIsScanning(false)} />}
      </AnimatePresence>

      <div className="p-6 max-w-7xl mx-auto space-y-6">
        <motion.div initial={{ opacity: 0, y: 10 }} animate={{ opacity: 1, y: 0 }} className="flex items-center justify-between">
          <div>
            <h1 className="font-display text-3xl font-bold text-foreground">Requests</h1>
            <p className="text-muted-foreground text-sm mt-1">Request and track new AI tool approvals</p>
          </div>
          <Dialog open={dialogOpen} onOpenChange={setDialogOpen}>
            <DialogTrigger asChild>
              <Button className="gap-2"><Plus className="h-4 w-4" /> Request New Tool</Button>
            </DialogTrigger>
            <DialogContent>
              <DialogHeader><DialogTitle>Request a New Tool</DialogTitle></DialogHeader>
              <div className="space-y-4 pt-4">
                <Input placeholder="Tool / Service name *" value={toolName} onChange={(e) => setToolName(e.target.value)} />
                <Input placeholder="URL (optional)" value={toolUrl} onChange={(e) => setToolUrl(e.target.value)} />
                <p className="text-xs text-muted-foreground">A deep AI security scan will run automatically.</p>
                <Button onClick={handleNewRequest} className="w-full" disabled={!toolName.trim()}>Submit & Scan</Button>
              </div>
            </DialogContent>
          </Dialog>
        </motion.div>

        <div className="space-y-3">
          {loading ? (
            <p className="text-muted-foreground">Loading...</p>
          ) : requests.length === 0 ? (
            <Card className="glass-card border-border/50">
              <CardContent className="p-12 text-center">
                <GitPullRequest className="h-12 w-12 text-muted-foreground mx-auto mb-4" />
                <p className="text-muted-foreground">No requests yet. Start by requesting a new tool.</p>
              </CardContent>
            </Card>
          ) : (
            requests.map((r) => (
              <Card
                key={r.id}
                className="glass-card border-border/50 hover:border-primary/30 transition-colors cursor-pointer"
                onClick={() => {
                  const reportId = r.tools?.report_id;
                  if (reportId) navigate(`/reports/${reportId}`);
                }}
              >
                <CardContent className="p-4 flex items-center justify-between">
                  <div className="flex items-center gap-4">
                    <GitPullRequest className="h-5 w-5 text-primary shrink-0" />
                    <div>
                      <p className="font-medium text-foreground">{r.tools?.name || "Unknown tool"}</p>
                      <p className="text-xs text-muted-foreground">{new Date(r.created_at).toLocaleDateString()}</p>
                    </div>
                  </div>
                  <div className="flex items-center gap-3">
                    {r.submission_data?.trustScore != null && (
                      <span className="text-sm font-semibold text-primary">{r.submission_data.trustScore}/100</span>
                    )}
                    {isAdmin ? (
                      <Select value={r.workflow_stage} onValueChange={(v) => handleStageChange(r.id, v)}>
                        <SelectTrigger className="w-[120px]" onClick={(e) => e.stopPropagation()}>
                          <Badge variant="outline" className={stageColors[r.workflow_stage]}>{r.workflow_stage}</Badge>
                        </SelectTrigger>
                        <SelectContent>
                          <SelectItem value="draft">Draft</SelectItem>
                          <SelectItem value="review">Review</SelectItem>
                          <SelectItem value="approved">Approved</SelectItem>
                          <SelectItem value="rejected">Rejected</SelectItem>
                        </SelectContent>
                      </Select>
                    ) : (
                      <Badge variant="outline" className={stageColors[r.workflow_stage]}>{r.workflow_stage}</Badge>
                    )}
                    {r.tools?.report_id && <ChevronRight className="h-4 w-4 text-muted-foreground" />}
                  </div>
                </CardContent>
              </Card>
            ))
          )}
        </div>
      </div>
    </>
  );
};

export default Requests;
