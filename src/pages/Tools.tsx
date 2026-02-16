import { useEffect, useState } from "react";
import { useNavigate } from "react-router-dom";
import { motion } from "framer-motion";
import { Plus, Wrench, ExternalLink, Filter, Pencil, Trash2 } from "lucide-react";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/hooks/useAuth";
import { Button } from "@/components/ui/button";
import { Card, CardContent } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogTrigger } from "@/components/ui/dialog";
import { Input } from "@/components/ui/input";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { useToast } from "@/hooks/use-toast";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { AlertDialog, AlertDialogAction, AlertDialogCancel, AlertDialogContent, AlertDialogDescription, AlertDialogFooter, AlertDialogHeader, AlertDialogTitle } from "@/components/ui/alert-dialog";
import { Textarea } from "@/components/ui/textarea";
import { Label } from "@/components/ui/label";

const TOOL_CATEGORIES = [
  "Software Development",
  "AI & Machine Learning",
  "Communication",
  "Productivity",
  "Design",
  "Sales & Marketing",
  "Data & Analytics",
  "Finance",
  "HR & Recruitment",
  "Security",
  "Customer Support",
  "Project Management",
  "Legal & Compliance",
  "Other",
];

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

const emptyTool = { name: "", url: "", category: "", description: "", status: "pending", risk_level: "" };

const Tools = () => {
  const { profile, user } = useAuth();
  const navigate = useNavigate();
  const { toast } = useToast();
  const [tools, setTools] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  const [dialogOpen, setDialogOpen] = useState(false);
  const [editTool, setEditTool] = useState<any>(null);
  const [formData, setFormData] = useState({ ...emptyTool });
  const [filterStatus, setFilterStatus] = useState("all");
  const [filterRisk, setFilterRisk] = useState("all");
  const [filterCategory, setFilterCategory] = useState("all");
  const [deleteId, setDeleteId] = useState<string | null>(null);
  const [customCategory, setCustomCategory] = useState("");

  const fetchTools = async () => {
    if (!profile?.company_id) return;
    const { data } = await supabase.from("tools").select("*").eq("org_id", profile.company_id).order("created_at", { ascending: false });
    setTools(data || []);
    setLoading(false);
  };

  useEffect(() => { fetchTools(); }, [profile?.company_id]);

  const openAdd = () => {
    setEditTool(null);
    setFormData({ ...emptyTool });
    setCustomCategory("");
    setDialogOpen(true);
  };

  const openEdit = (tool: any) => {
    setEditTool(tool);
    const isPreset = TOOL_CATEGORIES.includes(tool.category || "");
    setFormData({
      name: tool.name,
      url: tool.url || "",
      category: isPreset ? (tool.category || "") : "Other",
      description: tool.description || "",
      status: tool.status || "pending",
      risk_level: tool.risk_level || "",
    });
    setCustomCategory(isPreset ? "" : (tool.category || ""));
    setDialogOpen(true);
  };

  const handleSave = async () => {
    if (!formData.name.trim() || !profile?.company_id || !user) return;
    const category = formData.category === "Other" && customCategory.trim() ? customCategory.trim() : formData.category;
    const riskLevel = (formData.risk_level || null) as "high" | "medium" | "low" | null;
    const payload: any = {
      name: formData.name.trim(),
      url: formData.url.trim() || null,
      category: category || null,
      description: formData.description.trim() || null,
      status: formData.status as any,
      risk_level: riskLevel,
    };

    if (editTool) {
      const { error } = await supabase.from("tools").update(payload).eq("id", editTool.id);
      if (error) {
        toast({ title: "Failed to update", description: error.message, variant: "destructive" });
      } else {
        toast({ title: "Tool updated" });
      }
    } else {
      payload.org_id = profile.company_id;
      payload.created_by = user.id;
      const { error } = await supabase.from("tools").insert(payload);
      if (error) {
        toast({ title: "Failed to add tool", description: error.message, variant: "destructive" });
      } else {
        toast({ title: "Tool added" });
      }
    }
    setDialogOpen(false);
    fetchTools();
  };

  const handleDelete = async () => {
    if (!deleteId) return;
    const { error } = await supabase.from("tools").delete().eq("id", deleteId);
    if (error) {
      toast({ title: "Failed to delete", description: error.message, variant: "destructive" });
    } else {
      toast({ title: "Tool deleted" });
    }
    setDeleteId(null);
    fetchTools();
  };

  // Collect unique categories from tools for filter
  const allCategories = [...new Set(tools.map((t) => t.category).filter(Boolean))].sort();

  const filtered = tools.filter((t) => {
    if (filterStatus !== "all" && t.status !== filterStatus) return false;
    if (filterRisk !== "all" && t.risk_level !== filterRisk) return false;
    if (filterCategory !== "all" && t.category !== filterCategory) return false;
    return true;
  });

  return (
    <>
      <AlertDialog open={!!deleteId} onOpenChange={() => setDeleteId(null)}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>Delete Tool</AlertDialogTitle>
            <AlertDialogDescription>This will permanently remove this tool from your inventory. This action cannot be undone.</AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel>Cancel</AlertDialogCancel>
            <AlertDialogAction onClick={handleDelete} className="bg-destructive text-destructive-foreground hover:bg-destructive/90">Delete</AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>

      <Dialog open={dialogOpen} onOpenChange={setDialogOpen}>
        <DialogContent className="max-w-lg">
          <DialogHeader><DialogTitle>{editTool ? "Edit Tool" : "Add New Tool"}</DialogTitle></DialogHeader>
          <div className="space-y-4 pt-2">
            <div>
              <Label>Name *</Label>
              <Input placeholder="Tool name" value={formData.name} onChange={(e) => setFormData({ ...formData, name: e.target.value })} />
            </div>
            <div>
              <Label>URL</Label>
              <Input placeholder="https://example.com" value={formData.url} onChange={(e) => setFormData({ ...formData, url: e.target.value })} />
            </div>
            <div>
              <Label>Category</Label>
              <Select value={formData.category} onValueChange={(v) => setFormData({ ...formData, category: v })}>
                <SelectTrigger><SelectValue placeholder="Select category" /></SelectTrigger>
                <SelectContent>
                  {TOOL_CATEGORIES.map((c) => (
                    <SelectItem key={c} value={c}>{c}</SelectItem>
                  ))}
                </SelectContent>
              </Select>
              {formData.category === "Other" && (
                <Input className="mt-2" placeholder="Enter custom category" value={customCategory} onChange={(e) => setCustomCategory(e.target.value)} />
              )}
            </div>
            <div>
              <Label>Description</Label>
              <Textarea placeholder="Brief description" value={formData.description} onChange={(e) => setFormData({ ...formData, description: e.target.value })} />
            </div>
            <div className="grid grid-cols-2 gap-4">
              <div>
                <Label>Status</Label>
                <Select value={formData.status} onValueChange={(v) => setFormData({ ...formData, status: v })}>
                  <SelectTrigger><SelectValue /></SelectTrigger>
                  <SelectContent>
                    {TOOL_STATUSES.map((s) => (
                      <SelectItem key={s} value={s} className="capitalize">{s}</SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>
              <div>
                <Label>Risk Level</Label>
                <Select value={formData.risk_level || "none"} onValueChange={(v) => setFormData({ ...formData, risk_level: v === "none" ? "" : v })}>
                  <SelectTrigger><SelectValue /></SelectTrigger>
                  <SelectContent>
                    <SelectItem value="none">Not set</SelectItem>
                    {RISK_LEVELS.map((r) => (
                      <SelectItem key={r} value={r} className="capitalize">{r}</SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>
            </div>
            <Button onClick={handleSave} className="w-full">{editTool ? "Save Changes" : "Add Tool"}</Button>
          </div>
        </DialogContent>
      </Dialog>

      <div className="p-6 max-w-7xl mx-auto space-y-6">
        <motion.div initial={{ opacity: 0, y: 10 }} animate={{ opacity: 1, y: 0 }} className="flex items-center justify-between">
          <div>
            <h1 className="font-display text-3xl font-bold text-foreground">Tool Inventory</h1>
            <p className="text-muted-foreground text-sm mt-1">Manage your organization's AI tools</p>
          </div>
          <Button onClick={openAdd} className="gap-2"><Plus className="h-4 w-4" /> Add Tool</Button>
        </motion.div>

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
          <Select value={filterCategory} onValueChange={setFilterCategory}>
            <SelectTrigger className="w-[180px]"><SelectValue placeholder="Category" /></SelectTrigger>
            <SelectContent>
              <SelectItem value="all">All Categories</SelectItem>
              {allCategories.map((c) => <SelectItem key={c} value={c}>{c}</SelectItem>)}
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
                  <TableHead className="w-[80px]">Actions</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {loading ? (
                  <TableRow><TableCell colSpan={6} className="text-center text-muted-foreground">Loading...</TableCell></TableRow>
                ) : filtered.length === 0 ? (
                  <TableRow><TableCell colSpan={6} className="text-center text-muted-foreground">No tools found</TableCell></TableRow>
                ) : (
                  filtered.map((tool) => (
                    <TableRow key={tool.id} className="group">
                      <TableCell className="font-medium">
                        <div className="flex items-center gap-2">
                          <Wrench className="h-4 w-4 text-primary shrink-0" />
                          <div>
                            <span>{tool.name}</span>
                            {tool.description && <p className="text-xs text-muted-foreground line-clamp-1">{tool.description}</p>}
                          </div>
                          {tool.url && (
                            <a href={tool.url.startsWith("http") ? tool.url : `https://${tool.url}`} target="_blank" rel="noopener" onClick={(e) => e.stopPropagation()}>
                              <ExternalLink className="h-3 w-3 text-muted-foreground hover:text-primary" />
                            </a>
                          )}
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
                      <TableCell>
                        <div className="flex items-center gap-1 opacity-0 group-hover:opacity-100 transition-opacity">
                          <Button variant="ghost" size="icon" className="h-7 w-7" onClick={() => openEdit(tool)}>
                            <Pencil className="h-3.5 w-3.5" />
                          </Button>
                          <Button variant="ghost" size="icon" className="h-7 w-7 text-destructive hover:text-destructive" onClick={() => setDeleteId(tool.id)}>
                            <Trash2 className="h-3.5 w-3.5" />
                          </Button>
                        </div>
                      </TableCell>
                    </TableRow>
                  ))
                )}
              </TableBody>
            </Table>
          </CardContent>
        </Card>
      </div>
    </>
  );
};

export default Tools;
