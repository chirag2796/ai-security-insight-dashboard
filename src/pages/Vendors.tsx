import { useEffect, useState, useCallback } from "react";
import { motion, AnimatePresence } from "framer-motion";
import { Building2, Search, ExternalLink, Pencil, Trash2 } from "lucide-react";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/hooks/useAuth";
import { Button } from "@/components/ui/button";
import { Card, CardContent } from "@/components/ui/card";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogTrigger } from "@/components/ui/dialog";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { useToast } from "@/hooks/use-toast";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { AlertDialog, AlertDialogAction, AlertDialogCancel, AlertDialogContent, AlertDialogDescription, AlertDialogFooter, AlertDialogHeader, AlertDialogTitle } from "@/components/ui/alert-dialog";
import ScanningAnimation from "@/components/ScanningAnimation";

const Vendors = () => {
  const { profile, user } = useAuth();
  const { toast } = useToast();
  const [vendors, setVendors] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  const [dialogOpen, setDialogOpen] = useState(false);
  const [vendorName, setVendorName] = useState("");
  const [vendorUrl, setVendorUrl] = useState("");
  const [isScanning, setIsScanning] = useState(false);
  const [scanningName, setScanningName] = useState("");
  const [selectedVendor, setSelectedVendor] = useState<any>(null);
  const [editVendor, setEditVendor] = useState<any>(null);
  const [editForm, setEditForm] = useState({ name: "", website: "" });
  const [deleteId, setDeleteId] = useState<string | null>(null);

  const fetchVendors = async () => {
    if (!profile?.company_id) return;
    const { data } = await supabase.from("vendors").select("*").eq("org_id", profile.company_id).order("created_at", { ascending: false });
    setVendors(data || []);
    setLoading(false);
  };

  useEffect(() => { fetchVendors(); }, [profile?.company_id]);

  const handleResearch = useCallback(async () => {
    if (!vendorName.trim() || !profile?.company_id) return;
    setDialogOpen(false);
    setScanningName(vendorName.trim());
    setIsScanning(true);

    try {
      await fetch(`${import.meta.env.VITE_SUPABASE_URL}/functions/v1/ai-action`, {
        method: "POST",
        headers: { "Content-Type": "application/json", Authorization: `Bearer ${import.meta.env.VITE_SUPABASE_PUBLISHABLE_KEY}` },
        body: JSON.stringify({ type: "vendor-research", vendorName: vendorName.trim(), vendorUrl: vendorUrl.trim() || null, orgId: profile.company_id }),
      });
      toast({ title: "Vendor research complete" });
      setVendorName("");
      setVendorUrl("");
      fetchVendors();
    } catch (e: any) {
      toast({ title: "Research failed", description: e?.message, variant: "destructive" });
    } finally {
      setIsScanning(false);
    }
  }, [vendorName, vendorUrl, profile, toast]);

  const openEdit = (v: any, e: React.MouseEvent) => {
    e.stopPropagation();
    setEditVendor(v);
    setEditForm({ name: v.name, website: v.website || "" });
  };

  const handleEditSave = async () => {
    if (!editVendor || !editForm.name.trim()) return;
    const { error } = await supabase.from("vendors").update({
      name: editForm.name.trim(),
      website: editForm.website.trim() || null,
    }).eq("id", editVendor.id);
    if (error) {
      toast({ title: "Failed to update", description: error.message, variant: "destructive" });
    } else {
      toast({ title: "Vendor updated" });
    }
    setEditVendor(null);
    fetchVendors();
  };

  const handleDelete = async () => {
    if (!deleteId) return;
    const { error } = await supabase.from("vendors").delete().eq("id", deleteId);
    if (error) {
      toast({ title: "Failed to delete", description: error.message, variant: "destructive" });
    } else {
      toast({ title: "Vendor deleted" });
    }
    setDeleteId(null);
    fetchVendors();
  };

  return (
    <>
      <AnimatePresence>
        {isScanning && <ScanningAnimation serviceName={scanningName} />}
      </AnimatePresence>

      <AlertDialog open={!!deleteId} onOpenChange={() => setDeleteId(null)}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>Delete Vendor</AlertDialogTitle>
            <AlertDialogDescription>This will permanently remove this vendor and its research data.</AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel>Cancel</AlertDialogCancel>
            <AlertDialogAction onClick={handleDelete} className="bg-destructive text-destructive-foreground hover:bg-destructive/90">Delete</AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>

      {/* Edit vendor dialog */}
      <Dialog open={!!editVendor} onOpenChange={() => setEditVendor(null)}>
        <DialogContent>
          <DialogHeader><DialogTitle>Edit Vendor</DialogTitle></DialogHeader>
          <div className="space-y-4 pt-2">
            <div><Label>Name</Label><Input value={editForm.name} onChange={(e) => setEditForm({ ...editForm, name: e.target.value })} /></div>
            <div><Label>Website</Label><Input value={editForm.website} onChange={(e) => setEditForm({ ...editForm, website: e.target.value })} /></div>
            <Button onClick={handleEditSave} className="w-full">Save Changes</Button>
          </div>
        </DialogContent>
      </Dialog>

      {/* Vendor detail dialog */}
      <Dialog open={!!selectedVendor} onOpenChange={() => setSelectedVendor(null)}>
        <DialogContent className="max-w-2xl max-h-[80vh] overflow-y-auto">
          <DialogHeader><DialogTitle>{selectedVendor?.name}</DialogTitle></DialogHeader>
          {selectedVendor?.research_data && (
            <div className="space-y-4 text-sm">
              {selectedVendor.research_data.executiveSummary && (
                <div>
                  <h4 className="font-semibold text-foreground mb-1">Executive Summary</h4>
                  <p className="text-muted-foreground">{selectedVendor.research_data.executiveSummary}</p>
                </div>
              )}
              {selectedVendor.research_data.trustScore != null && (
                <div>
                  <span className="text-primary font-bold text-2xl">{selectedVendor.research_data.trustScore}/100</span>
                  <span className="text-muted-foreground ml-2">Trust Score</span>
                </div>
              )}
              {selectedVendor.research_data.vulnerabilities && (
                <div>
                  <h4 className="font-semibold text-foreground mb-2">Vulnerabilities</h4>
                  {Object.entries(selectedVendor.research_data.vulnerabilities).map(([key, val]: any) => (
                    <div key={key} className="mb-2 p-2 rounded bg-secondary/30">
                      <span className="font-medium capitalize">{key.replace(/([A-Z])/g, " $1")}</span>
                      <span className="ml-2 text-primary font-bold">{val.score}/10</span>
                      <p className="text-xs text-muted-foreground mt-1">{val.details}</p>
                    </div>
                  ))}
                </div>
              )}
            </div>
          )}
        </DialogContent>
      </Dialog>

      <div className="p-6 max-w-7xl mx-auto space-y-6">
        <motion.div initial={{ opacity: 0, y: 10 }} animate={{ opacity: 1, y: 0 }} className="flex items-center justify-between">
          <div>
            <h1 className="font-display text-3xl font-bold text-foreground">Vendors</h1>
            <p className="text-muted-foreground text-sm mt-1">AI vendor research and intelligence</p>
          </div>
          <Dialog open={dialogOpen} onOpenChange={setDialogOpen}>
            <DialogTrigger asChild>
              <Button className="gap-2"><Search className="h-4 w-4" /> Research Vendor</Button>
            </DialogTrigger>
            <DialogContent>
              <DialogHeader><DialogTitle>Research a Vendor</DialogTitle></DialogHeader>
              <div className="space-y-4 pt-4">
                <Input placeholder="Vendor name *" value={vendorName} onChange={(e) => setVendorName(e.target.value)} />
                <Input placeholder="Website URL (optional)" value={vendorUrl} onChange={(e) => setVendorUrl(e.target.value)} />
                <Button onClick={handleResearch} className="w-full" disabled={!vendorName.trim()}>Start Research</Button>
              </div>
            </DialogContent>
          </Dialog>
        </motion.div>

        <Card className="glass-card border-border/50">
          <CardContent className="p-0">
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead>Vendor</TableHead>
                  <TableHead>Website</TableHead>
                  <TableHead>Trust Score</TableHead>
                  <TableHead>Last Updated</TableHead>
                  <TableHead className="w-[80px]">Actions</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {loading ? (
                  <TableRow><TableCell colSpan={5} className="text-center text-muted-foreground">Loading...</TableCell></TableRow>
                ) : vendors.length === 0 ? (
                  <TableRow><TableCell colSpan={5} className="text-center text-muted-foreground">No vendors yet</TableCell></TableRow>
                ) : (
                  vendors.map((v) => (
                    <TableRow key={v.id} className="cursor-pointer hover:bg-accent/30 group" onClick={() => setSelectedVendor(v)}>
                      <TableCell className="font-medium flex items-center gap-2">
                        <Building2 className="h-4 w-4 text-primary" />
                        {v.name}
                      </TableCell>
                      <TableCell>
                        {v.website ? (
                          <a href={v.website.startsWith("http") ? v.website : `https://${v.website}`} target="_blank" rel="noopener" className="flex items-center gap-1 text-primary hover:underline text-sm" onClick={(e) => e.stopPropagation()}>
                            {(() => { try { return new URL(v.website.startsWith("http") ? v.website : `https://${v.website}`).hostname; } catch { return v.website; } })()} <ExternalLink className="h-3 w-3" />
                          </a>
                        ) : "—"}
                      </TableCell>
                      <TableCell>
                        {v.research_data?.trustScore != null ? (
                          <span className="font-semibold text-primary">{v.research_data.trustScore}/100</span>
                        ) : "—"}
                      </TableCell>
                      <TableCell className="text-muted-foreground text-sm">{new Date(v.updated_at).toLocaleDateString()}</TableCell>
                      <TableCell>
                        <div className="flex items-center gap-1 opacity-0 group-hover:opacity-100 transition-opacity">
                          <Button variant="ghost" size="icon" className="h-7 w-7" onClick={(e) => openEdit(v, e)}>
                            <Pencil className="h-3.5 w-3.5" />
                          </Button>
                          <Button variant="ghost" size="icon" className="h-7 w-7 text-destructive hover:text-destructive" onClick={(e) => { e.stopPropagation(); setDeleteId(v.id); }}>
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

export default Vendors;
