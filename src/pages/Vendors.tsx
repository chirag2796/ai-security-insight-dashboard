import { useEffect, useState, useCallback } from "react";
import { motion, AnimatePresence } from "framer-motion";
import { Building2, Search, ExternalLink, Plus } from "lucide-react";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/hooks/useAuth";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogTrigger } from "@/components/ui/dialog";
import { Input } from "@/components/ui/input";
import { useToast } from "@/hooks/use-toast";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
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

  return (
    <>
      <AnimatePresence>
        {isScanning && <ScanningAnimation serviceName={scanningName} />}
      </AnimatePresence>

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
                </TableRow>
              </TableHeader>
              <TableBody>
                {loading ? (
                  <TableRow><TableCell colSpan={4} className="text-center text-muted-foreground">Loading...</TableCell></TableRow>
                ) : vendors.length === 0 ? (
                  <TableRow><TableCell colSpan={4} className="text-center text-muted-foreground">No vendors yet</TableCell></TableRow>
                ) : (
                  vendors.map((v) => (
                    <TableRow key={v.id} className="cursor-pointer hover:bg-accent/30" onClick={() => setSelectedVendor(v)}>
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
