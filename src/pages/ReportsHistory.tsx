import { useEffect, useState } from "react";
import { useNavigate } from "react-router-dom";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/hooks/useAuth";
import { FileText, ArrowRight, Clock, Trash2 } from "lucide-react";
import {
  AlertDialog, AlertDialogAction, AlertDialogCancel, AlertDialogContent,
  AlertDialogDescription, AlertDialogFooter, AlertDialogHeader, AlertDialogTitle, AlertDialogTrigger,
} from "@/components/ui/alert-dialog";
import { useToast } from "@/hooks/use-toast";

interface ReportRow {
  id: string;
  service_name: string;
  trust_score: number | null;
  status: string;
  created_at: string;
}

const ReportsHistory = () => {
  const { profile } = useAuth();
  const [reports, setReports] = useState<ReportRow[]>([]);
  const [loading, setLoading] = useState(true);
  const { toast } = useToast();
  const navigate = useNavigate();

  const handleDelete = async (e: React.MouseEvent, reportId: string) => {
    e.preventDefault();
    e.stopPropagation();
    const { data: plans } = await supabase.from("compliance_plans").select("id").eq("report_id", reportId);
    if (plans?.length) {
      for (const p of plans) {
        await supabase.from("compliance_steps").delete().eq("plan_id", p.id);
      }
      await supabase.from("compliance_plans").delete().eq("report_id", reportId);
    }
    await supabase.from("reports").delete().eq("id", reportId);
    setReports((prev) => prev.filter((r) => r.id !== reportId));
    toast({ title: "Report deleted" });
  };

  useEffect(() => {
    const fetch = async () => {
      if (!profile?.company_id) return;
      const { data } = await supabase
        .from("reports")
        .select("id, service_name, trust_score, status, created_at")
        .eq("company_id", profile.company_id)
        .order("created_at", { ascending: false });
      setReports(data ?? []);
      setLoading(false);
    };
    fetch();
  }, [profile?.company_id]);

  return (
    <div className="p-6 max-w-4xl mx-auto">
      <h1 className="text-2xl font-display font-bold text-foreground mb-6">Past Reports</h1>

      {loading ? (
        <p className="text-muted-foreground">Loading…</p>
      ) : reports.length === 0 ? (
        <p className="text-muted-foreground">No reports yet. Run a scan from the Requests page.</p>
      ) : (
        <div className="space-y-3">
          {reports.map((r) => (
            <div
              key={r.id}
              onClick={() => navigate(`/reports/${r.id}`)}
              className="flex items-center justify-between p-4 rounded-lg border border-border bg-card hover:bg-accent/40 transition-colors group cursor-pointer"
            >
              <div className="flex items-center gap-3">
                <FileText className="h-5 w-5 text-primary" />
                <div>
                  <p className="font-medium text-foreground">{r.service_name}</p>
                  <p className="text-xs text-muted-foreground flex items-center gap-1">
                    <Clock className="h-3 w-3" />
                    {new Date(r.created_at).toLocaleDateString()}
                  </p>
                </div>
              </div>
              <div className="flex items-center gap-3">
                {r.trust_score !== null && (
                  <span className="text-sm font-semibold text-primary">{r.trust_score}/100</span>
                )}
                <span className="text-xs px-2 py-0.5 rounded-full bg-secondary text-secondary-foreground capitalize">{r.status}</span>
                <AlertDialog>
                  <AlertDialogTrigger asChild>
                    <button onClick={(e) => e.stopPropagation()} className="p-1.5 rounded-md hover:bg-destructive/10 text-muted-foreground hover:text-destructive transition-colors">
                      <Trash2 className="h-4 w-4" />
                    </button>
                  </AlertDialogTrigger>
                  <AlertDialogContent onClick={(e) => e.stopPropagation()}>
                    <AlertDialogHeader>
                      <AlertDialogTitle>Delete report?</AlertDialogTitle>
                      <AlertDialogDescription>This will permanently delete this report and any associated compliance plans.</AlertDialogDescription>
                    </AlertDialogHeader>
                    <AlertDialogFooter>
                      <AlertDialogCancel>Cancel</AlertDialogCancel>
                      <AlertDialogAction onClick={(e) => handleDelete(e, r.id)} className="bg-destructive text-destructive-foreground hover:bg-destructive/90">Delete</AlertDialogAction>
                    </AlertDialogFooter>
                  </AlertDialogContent>
                </AlertDialog>
                <ArrowRight className="h-4 w-4 text-muted-foreground group-hover:text-foreground transition-colors" />
              </div>
            </div>
          ))}
        </div>
      )}
    </div>
  );
};

export default ReportsHistory;
