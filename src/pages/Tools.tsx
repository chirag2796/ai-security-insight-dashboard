import { useEffect, useState } from "react";
import { useNavigate } from "react-router-dom";
import { motion } from "framer-motion";
import { Plus, Wrench, ExternalLink, Filter } from "lucide-react";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/hooks/useAuth";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogTrigger } from "@/components/ui/dialog";
import { Input } from "@/components/ui/input";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { useToast } from "@/hooks/use-toast";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";

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
  const { profile, user } = useAuth();
  const navigate = useNavigate();
  const { toast } = useToast();
  const [tools, setTools] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  const [dialogOpen, setDialogOpen] = useState(false);
  const [newTool, setNewTool] = useState({ name: "", url: "", category: "" });
  const [filterStatus, setFilterStatus] = useState("all");
  const [filterRisk, setFilterRisk] = useState("all");

  const fetchTools = async () => {
    if (!profile?.company_id) return;
    const { data } = await supabase.from("tools").select("*").eq("org_id", profile.company_id).order("created_at", { ascending: false });
    setTools(data || []);
    setLoading(false);
  };

  useEffect(() => { fetchTools(); }, [profile?.company_id]);

  const handleAddTool = async () => {
    if (!newTool.name.trim() || !profile?.company_id || !user) return;
    const { error } = await supabase.from("tools").insert({
      name: newTool.name.trim(),
      url: newTool.url.trim() || null,
      category: newTool.category.trim() || null,
      org_id: profile.company_id,
      created_by: user.id,
    });
    if (error) {
      toast({ title: "Failed to add tool", description: error.message, variant: "destructive" });
    } else {
      toast({ title: "Tool added" });
      setDialogOpen(false);
      setNewTool({ name: "", url: "", category: "" });
      fetchTools();
    }
  };

  const filtered = tools.filter((t) => {
    if (filterStatus !== "all" && t.status !== filterStatus) return false;
    if (filterRisk !== "all" && t.risk_level !== filterRisk) return false;
    return true;
  });

  return (
    <div className="p-6 max-w-7xl mx-auto space-y-6">
      <motion.div initial={{ opacity: 0, y: 10 }} animate={{ opacity: 1, y: 0 }} className="flex items-center justify-between">
        <div>
          <h1 className="font-display text-3xl font-bold text-foreground">Tool Inventory</h1>
          <p className="text-muted-foreground text-sm mt-1">Manage your organization's AI tools</p>
        </div>
        <Dialog open={dialogOpen} onOpenChange={setDialogOpen}>
          <DialogTrigger asChild>
            <Button className="gap-2"><Plus className="h-4 w-4" /> Add Tool</Button>
          </DialogTrigger>
          <DialogContent>
            <DialogHeader><DialogTitle>Add New Tool</DialogTitle></DialogHeader>
            <div className="space-y-4 pt-4">
              <Input placeholder="Tool name *" value={newTool.name} onChange={(e) => setNewTool({ ...newTool, name: e.target.value })} />
              <Input placeholder="URL (optional)" value={newTool.url} onChange={(e) => setNewTool({ ...newTool, url: e.target.value })} />
              <Input placeholder="Category (optional)" value={newTool.category} onChange={(e) => setNewTool({ ...newTool, category: e.target.value })} />
              <Button onClick={handleAddTool} className="w-full">Add Tool</Button>
            </div>
          </DialogContent>
        </Dialog>
      </motion.div>

      <div className="flex gap-3 items-center">
        <Filter className="h-4 w-4 text-muted-foreground" />
        <Select value={filterStatus} onValueChange={setFilterStatus}>
          <SelectTrigger className="w-[140px]"><SelectValue placeholder="Status" /></SelectTrigger>
          <SelectContent>
            <SelectItem value="all">All Status</SelectItem>
            <SelectItem value="pending">Pending</SelectItem>
            <SelectItem value="approved">Approved</SelectItem>
            <SelectItem value="rejected">Rejected</SelectItem>
            <SelectItem value="sunset">Sunset</SelectItem>
          </SelectContent>
        </Select>
        <Select value={filterRisk} onValueChange={setFilterRisk}>
          <SelectTrigger className="w-[140px]"><SelectValue placeholder="Risk" /></SelectTrigger>
          <SelectContent>
            <SelectItem value="all">All Risk</SelectItem>
            <SelectItem value="high">High</SelectItem>
            <SelectItem value="medium">Medium</SelectItem>
            <SelectItem value="low">Low</SelectItem>
          </SelectContent>
        </Select>
      </div>

      <Card className="glass-card border-border/50">
        <CardContent className="p-0">
          <Table>
            <TableHeader>
              <TableRow>
                <TableHead>Name</TableHead>
                <TableHead>Category</TableHead>
                <TableHead>Status</TableHead>
                <TableHead>Risk</TableHead>
                <TableHead>Added</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {loading ? (
                <TableRow><TableCell colSpan={5} className="text-center text-muted-foreground">Loading...</TableCell></TableRow>
              ) : filtered.length === 0 ? (
                <TableRow><TableCell colSpan={5} className="text-center text-muted-foreground">No tools found</TableCell></TableRow>
              ) : (
                filtered.map((tool) => (
                  <TableRow
                    key={tool.id}
                    className="cursor-pointer hover:bg-accent/30"
                    onClick={() => tool.report_id ? navigate(`/reports/${tool.report_id}`) : null}
                  >
                    <TableCell className="font-medium">
                      <div className="flex items-center gap-2">
                        <Wrench className="h-4 w-4 text-primary shrink-0" />
                        {tool.name}
                        {tool.url && <ExternalLink className="h-3 w-3 text-muted-foreground" />}
                      </div>
                    </TableCell>
                    <TableCell className="text-muted-foreground">{tool.category || "—"}</TableCell>
                    <TableCell>
                      <Badge variant="outline" className={statusColors[tool.status] || ""}>{tool.status}</Badge>
                    </TableCell>
                    <TableCell>
                      {tool.risk_level ? (
                        <Badge variant="outline" className={riskColors[tool.risk_level] || ""}>{tool.risk_level}</Badge>
                      ) : "—"}
                    </TableCell>
                    <TableCell className="text-muted-foreground text-sm">{new Date(tool.created_at).toLocaleDateString()}</TableCell>
                  </TableRow>
                ))
              )}
            </TableBody>
          </Table>
        </CardContent>
      </Card>
    </div>
  );
};

export default Tools;
