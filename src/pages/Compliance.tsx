import { useEffect, useState } from "react";
import { motion } from "framer-motion";
import { ShieldCheck, CheckCircle2, XCircle, MinusCircle } from "lucide-react";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/hooks/useAuth";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Dialog, DialogContent, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { Checkbox } from "@/components/ui/checkbox";
import { Textarea } from "@/components/ui/textarea";
import { useToast } from "@/hooks/use-toast";
import { Progress } from "@/components/ui/progress";

const FRAMEWORKS = [
  { id: "nist-ai-rmf", name: "NIST AI RMF", description: "AI Risk Management Framework", controls: [
    { ref: "GOV-1", title: "AI governance policies established" },
    { ref: "GOV-2", title: "Roles and responsibilities defined" },
    { ref: "MAP-1", title: "AI system context documented" },
    { ref: "MAP-2", title: "Risk identification processes" },
    { ref: "MEA-1", title: "Performance monitoring in place" },
    { ref: "MEA-2", title: "Bias detection mechanisms" },
    { ref: "MAN-1", title: "Risk response procedures" },
    { ref: "MAN-2", title: "Incident response plan" },
  ]},
  { id: "eu-ai-act", name: "EU AI Act", description: "European AI Regulation", controls: [
    { ref: "ART-9", title: "Risk management system" },
    { ref: "ART-10", title: "Data governance" },
    { ref: "ART-11", title: "Technical documentation" },
    { ref: "ART-13", title: "Transparency & information" },
    { ref: "ART-14", title: "Human oversight" },
    { ref: "ART-15", title: "Accuracy & robustness" },
  ]},
  { id: "soc2", name: "SOC 2", description: "Service Organization Controls", controls: [
    { ref: "CC1", title: "Control environment" },
    { ref: "CC2", title: "Communication & information" },
    { ref: "CC3", title: "Risk assessment" },
    { ref: "CC5", title: "Control activities" },
    { ref: "CC6", title: "Logical & physical access" },
    { ref: "CC7", title: "System operations" },
  ]},
  { id: "iso-27001", name: "ISO 27001", description: "Information Security Management", controls: [
    { ref: "A.5", title: "Information security policies" },
    { ref: "A.6", title: "Organization of information security" },
    { ref: "A.8", title: "Asset management" },
    { ref: "A.9", title: "Access control" },
    { ref: "A.12", title: "Operations security" },
    { ref: "A.18", title: "Compliance" },
  ]},
  { id: "gdpr", name: "GDPR", description: "General Data Protection Regulation", controls: [
    { ref: "ART-5", title: "Principles of processing" },
    { ref: "ART-6", title: "Lawfulness of processing" },
    { ref: "ART-25", title: "Data protection by design" },
    { ref: "ART-32", title: "Security of processing" },
    { ref: "ART-35", title: "Data protection impact assessment" },
  ]},
];

const Compliance = () => {
  const { profile, user } = useAuth();
  const { toast } = useToast();
  const [controls, setControls] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  const [selectedFramework, setSelectedFramework] = useState<typeof FRAMEWORKS[0] | null>(null);

  const fetchControls = async () => {
    if (!profile?.company_id) return;
    const { data } = await supabase.from("controls").select("*").eq("org_id", profile.company_id);
    setControls(data || []);
    setLoading(false);
  };

  useEffect(() => { fetchControls(); }, [profile?.company_id]);

  const getFrameworkStats = (frameworkId: string) => {
    const fwControls = controls.filter((c) => c.framework === frameworkId);
    const framework = FRAMEWORKS.find((f) => f.id === frameworkId);
    const total = framework?.controls.length || 0;
    const attested = fwControls.filter((c) => c.status === "compliant").length;
    return { total, attested, percent: total > 0 ? Math.round((attested / total) * 100) : 0 };
  };

  const toggleControl = async (framework: string, controlRef: string, controlTitle: string) => {
    if (!profile?.company_id || !user) return;
    const existing = controls.find((c) => c.framework === framework && c.control_ref === controlRef);

    if (existing) {
      const newStatus = existing.status === "compliant" ? "not_applicable" : "compliant";
      await supabase.from("controls").update({
        status: newStatus as any,
        attested_by: newStatus === "compliant" ? user.id : null,
        attested_at: newStatus === "compliant" ? new Date().toISOString() : null,
      }).eq("id", existing.id);
    } else {
      await supabase.from("controls").insert({
        org_id: profile.company_id,
        framework,
        control_ref: controlRef,
        title: controlTitle,
        status: "compliant" as any,
        attested_by: user.id,
        attested_at: new Date().toISOString(),
      });
    }
    fetchControls();
  };

  const updateAttestation = async (controlId: string, attestation: string) => {
    await supabase.from("controls").update({ attestation }).eq("id", controlId);
  };

  return (
    <>
      <Dialog open={!!selectedFramework} onOpenChange={() => setSelectedFramework(null)}>
        <DialogContent className="max-w-2xl max-h-[80vh] overflow-y-auto">
          <DialogHeader>
            <DialogTitle>{selectedFramework?.name} Controls</DialogTitle>
          </DialogHeader>
          {selectedFramework && (
            <div className="space-y-3 pt-2">
              {(() => {
                const stats = getFrameworkStats(selectedFramework.id);
                return (
                  <div className="flex items-center gap-3 mb-4">
                    <Progress value={stats.percent} className="flex-1" />
                    <span className="text-sm font-medium text-foreground">{stats.percent}%</span>
                  </div>
                );
              })()}
              {selectedFramework.controls.map((ctrl) => {
                const existing = controls.find((c) => c.framework === selectedFramework.id && c.control_ref === ctrl.ref);
                const isCompliant = existing?.status === "compliant";
                return (
                  <div key={ctrl.ref} className="p-3 rounded-lg border border-border/50 bg-secondary/20">
                    <div className="flex items-center gap-3">
                      <Checkbox
                        checked={isCompliant}
                        onCheckedChange={() => toggleControl(selectedFramework.id, ctrl.ref, ctrl.title)}
                      />
                      <div className="flex-1">
                        <span className="text-sm font-medium text-foreground">{ctrl.ref}: {ctrl.title}</span>
                      </div>
                      {isCompliant ? <CheckCircle2 className="h-4 w-4 text-green-400" /> : <MinusCircle className="h-4 w-4 text-muted-foreground" />}
                    </div>
                    {isCompliant && existing && (
                      <Textarea
                        className="mt-2 text-xs"
                        placeholder="Add attestation notes..."
                        defaultValue={existing.attestation || ""}
                        onBlur={(e) => updateAttestation(existing.id, e.target.value)}
                      />
                    )}
                  </div>
                );
              })}
            </div>
          )}
        </DialogContent>
      </Dialog>

      <div className="p-6 max-w-7xl mx-auto space-y-6">
        <motion.div initial={{ opacity: 0, y: 10 }} animate={{ opacity: 1, y: 0 }}>
          <h1 className="font-display text-3xl font-bold text-foreground">Compliance & Controls</h1>
          <p className="text-muted-foreground text-sm mt-1">Framework attestations and gap analysis</p>
        </motion.div>

        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
          {FRAMEWORKS.map((fw, i) => {
            const stats = getFrameworkStats(fw.id);
            return (
              <motion.div key={fw.id} initial={{ opacity: 0, y: 20 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: i * 0.05 }}>
                <Card
                  className="glass-card border-border/50 hover:border-primary/30 transition-colors cursor-pointer"
                  onClick={() => setSelectedFramework(fw)}
                >
                  <CardHeader className="pb-3">
                    <CardTitle className="flex items-center gap-2 text-lg">
                      <ShieldCheck className="h-5 w-5 text-primary" />
                      {fw.name}
                    </CardTitle>
                    <p className="text-xs text-muted-foreground">{fw.description}</p>
                  </CardHeader>
                  <CardContent>
                    <div className="flex items-center gap-3 mb-2">
                      <Progress value={stats.percent} className="flex-1" />
                      <span className="text-sm font-bold text-foreground">{stats.percent}%</span>
                    </div>
                    <p className="text-xs text-muted-foreground">{stats.attested} / {stats.total} controls attested</p>
                  </CardContent>
                </Card>
              </motion.div>
            );
          })}
        </div>
      </div>
    </>
  );
};

export default Compliance;
