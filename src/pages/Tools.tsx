import { useEffect, useState, useRef } from "react";
import { useNavigate } from "react-router-dom";
import { motion } from "framer-motion";
import { Plus, Wrench, ExternalLink, Filter, Pencil, Trash2 } from "lucide-react";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/hooks/useAuth";
import { Button } from "@/components/ui/button";
import { Card, CardContent } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Dialog, DialogContent, DialogHeader, DialogTitle } from "@/components/ui/dialog";
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

// Default well-known enterprise tools for autocomplete
const DEFAULT_TOOLS: { name: string; url: string; category: string; description: string }[] = [
  { name: "GitHub Copilot", url: "https://github.com/features/copilot", category: "Software Development", description: "AI pair programmer that suggests code completions" },
  { name: "Cursor", url: "https://cursor.com", category: "Software Development", description: "AI-first code editor" },
  { name: "ChatGPT", url: "https://chat.openai.com", category: "AI & Machine Learning", description: "Conversational AI assistant by OpenAI" },
  { name: "OpenAI API", url: "https://platform.openai.com", category: "AI & Machine Learning", description: "API access to GPT and other models" },
  { name: "Claude", url: "https://claude.ai", category: "AI & Machine Learning", description: "AI assistant by Anthropic" },
  { name: "Gemini", url: "https://gemini.google.com", category: "AI & Machine Learning", description: "Google's multimodal AI model" },
  { name: "Notion AI", url: "https://notion.so", category: "Productivity", description: "AI-enhanced workspace and documentation" },
  { name: "Slack", url: "https://slack.com", category: "Communication", description: "Team messaging and collaboration" },
  { name: "Zoom", url: "https://zoom.us", category: "Communication", description: "Video conferencing and meetings" },
  { name: "Microsoft Teams", url: "https://teams.microsoft.com", category: "Communication", description: "Team collaboration and video calls" },
  { name: "Fireflies.ai", url: "https://fireflies.ai", category: "Communication", description: "AI meeting assistant and transcription" },
  { name: "Otter.ai", url: "https://otter.ai", category: "Communication", description: "AI meeting notes and transcription" },
  { name: "Microsoft Copilot", url: "https://copilot.microsoft.com", category: "Productivity", description: "AI assistant for Microsoft 365" },
  { name: "Grammarly", url: "https://grammarly.com", category: "Productivity", description: "AI writing assistant" },
  { name: "Midjourney", url: "https://midjourney.com", category: "Design", description: "AI image generation" },
  { name: "Figma AI", url: "https://figma.com", category: "Design", description: "AI-powered design tool features" },
  { name: "Jasper", url: "https://jasper.ai", category: "Sales & Marketing", description: "AI content creation for marketing" },
  { name: "Salesforce Einstein", url: "https://salesforce.com", category: "Sales & Marketing", description: "AI-powered CRM analytics" },
  { name: "HubSpot AI", url: "https://hubspot.com", category: "Sales & Marketing", description: "AI-powered marketing automation" },
  { name: "Tableau", url: "https://tableau.com", category: "Data & Analytics", description: "Data visualization and analytics" },
  { name: "Power BI", url: "https://powerbi.microsoft.com", category: "Data & Analytics", description: "Business intelligence and reporting" },
  { name: "Copilot for Finance", url: "https://microsoft.com", category: "Finance", description: "AI assistant for financial workflows" },
  { name: "Jira", url: "https://atlassian.com/jira", category: "Project Management", description: "Project tracking and management" },
  { name: "Linear", url: "https://linear.app", category: "Project Management", description: "Modern project management tool" },
  { name: "Intercom Fin", url: "https://intercom.com", category: "Customer Support", description: "AI-powered customer support agent" },
  { name: "Zendesk AI", url: "https://zendesk.com", category: "Customer Support", description: "AI-powered support automation" },
  { name: "Perplexity", url: "https://perplexity.ai", category: "AI & Machine Learning", description: "AI-powered search and research" },
  { name: "Copilot Studio", url: "https://copilotstudio.microsoft.com", category: "AI & Machine Learning", description: "Build custom AI copilots" },
  { name: "AWS Bedrock", url: "https://aws.amazon.com/bedrock", category: "AI & Machine Learning", description: "Managed foundation model service" },
  { name: "Google Vertex AI", url: "https://cloud.google.com/vertex-ai", category: "AI & Machine Learning", description: "Google Cloud AI platform" },
];

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
  const [nameQuery, setNameQuery] = useState("");
  const [showSuggestions, setShowSuggestions] = useState(false);
  const nameInputRef = useRef<HTMLInputElement>(null);

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
    setNameQuery("");
    setShowSuggestions(false);
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
    setNameQuery(tool.name);
    setCustomCategory(isPreset ? "" : (tool.category || ""));
    setShowSuggestions(false);
    setDialogOpen(true);
  };

  const selectDefaultTool = (dt: typeof DEFAULT_TOOLS[0]) => {
    setFormData((prev) => ({
      ...prev,
      name: dt.name,
      url: dt.url,
      category: dt.category,
      description: dt.description,
    }));
    setNameQuery(dt.name);
    setShowSuggestions(false);
  };

  const handleNameChange = (val: string) => {
    setNameQuery(val);
    setFormData((prev) => ({ ...prev, name: val }));
    setShowSuggestions(val.length > 0);
  };

  const filteredDefaults = DEFAULT_TOOLS.filter((dt) =>
    dt.name.toLowerCase().includes(nameQuery.toLowerCase())
  ).slice(0, 8);

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
            <div className="relative">
              <Label>Name *</Label>
              <Input
                ref={nameInputRef}
                placeholder="Search or type a tool name..."
                value={nameQuery}
                onChange={(e) => handleNameChange(e.target.value)}
                onFocus={() => nameQuery.length > 0 && setShowSuggestions(true)}
                onBlur={() => setTimeout(() => setShowSuggestions(false), 200)}
                autoComplete="off"
              />
              {showSuggestions && filteredDefaults.length > 0 && (
                <div className="absolute z-50 top-full left-0 right-0 mt-1 bg-popover border border-border rounded-md shadow-lg max-h-[200px] overflow-y-auto">
                  {filteredDefaults.map((dt) => (
                    <button
                      key={dt.name}
                      type="button"
                      className="w-full text-left px-3 py-2 hover:bg-accent/50 text-sm flex items-center justify-between"
                      onMouseDown={(e) => e.preventDefault()}
                      onClick={() => selectDefaultTool(dt)}
                    >
                      <div>
                        <span className="font-medium text-foreground">{dt.name}</span>
                        <span className="text-muted-foreground ml-2 text-xs">{dt.category}</span>
                      </div>
                    </button>
                  ))}
                </div>
              )}
              {nameQuery && filteredDefaults.length === 0 && showSuggestions && (
                <div className="absolute z-50 top-full left-0 right-0 mt-1 bg-popover border border-border rounded-md shadow-lg px-3 py-2 text-sm text-muted-foreground">
                  No match — "{nameQuery}" will be added as a new tool
                </div>
              )}
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
