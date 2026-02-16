import { useEffect, useState } from "react";
import { Link } from "react-router-dom";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/hooks/useAuth";
import AppHeader from "@/components/AppHeader";
import { FileText, ArrowRight, Clock } from "lucide-react";

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
    <div className="min-h-screen bg-background">
      <AppHeader />
      <main className="max-w-4xl mx-auto px-4 py-10">
        <h1 className="text-2xl font-display font-bold text-foreground mb-6">Past Reports</h1>

        {loading ? (
          <p className="text-muted-foreground">Loading…</p>
        ) : reports.length === 0 ? (
          <p className="text-muted-foreground">No reports yet. Run your first scan from the <Link to="/" className="text-primary underline">home page</Link>.</p>
        ) : (
          <div className="space-y-3">
            {reports.map((r) => (
              <Link
                key={r.id}
                to={`/report/${r.id}`}
                className="flex items-center justify-between p-4 rounded-lg border border-border bg-card hover:bg-accent/40 transition-colors group"
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
                  <ArrowRight className="h-4 w-4 text-muted-foreground group-hover:text-foreground transition-colors" />
                </div>
              </Link>
            ))}
          </div>
        )}
      </main>
    </div>
  );
};

export default ReportsHistory;
