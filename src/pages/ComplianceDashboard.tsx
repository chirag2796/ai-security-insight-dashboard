import { useEffect, useState } from "react";
import { Link } from "react-router-dom";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/hooks/useAuth";
import AppHeader from "@/components/AppHeader";
import { ClipboardList, CheckCircle, Clock, ArrowRight } from "lucide-react";
import { motion } from "framer-motion";

interface CompliancePlan {
  id: string;
  title: string;
  status: string;
  created_at: string;
  updated_at: string;
  report_id: string;
}

const ComplianceDashboard = () => {
  const { profile } = useAuth();
  const [plans, setPlans] = useState<CompliancePlan[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    const fetchPlans = async () => {
      const { data } = await supabase
        .from("compliance_plans")
        .select("*")
        .order("updated_at", { ascending: false });
      setPlans(data || []);
      setLoading(false);
    };
    fetchPlans();
  }, []);

  const inProgress = plans.filter((p) => p.status === "in_progress");
  const completed = plans.filter((p) => p.status === "completed");

  return (
    <div className="min-h-screen bg-background grid-bg">
      <AppHeader />
      <main className="max-w-5xl mx-auto px-4 py-8">
        <motion.div initial={{ opacity: 0, y: 10 }} animate={{ opacity: 1, y: 0 }}>
          <h1 className="font-display text-3xl font-bold text-foreground mb-2">
            Compliance Plans
          </h1>
          <p className="text-muted-foreground mb-8">
            {profile?.company_name && `${profile.company_name} · `}Track and manage your AI compliance initiatives
          </p>
        </motion.div>

        {loading ? (
          <p className="text-muted-foreground text-sm">Loading plans...</p>
        ) : plans.length === 0 ? (
          <div className="glass-card p-12 text-center">
            <ClipboardList className="h-12 w-12 text-muted-foreground mx-auto mb-4" />
            <p className="text-muted-foreground">No compliance plans yet.</p>
            <p className="text-sm text-muted-foreground mt-1">
              Start a compliance plan from any{" "}
              <Link to="/" className="text-primary hover:underline">security report</Link>.
            </p>
          </div>
        ) : (
          <div className="space-y-8">
            {inProgress.length > 0 && (
              <section>
                <h2 className="font-display text-lg font-semibold text-foreground mb-4 flex items-center gap-2">
                  <Clock className="h-5 w-5 text-yellow-400" />
                  In Progress ({inProgress.length})
                </h2>
                <div className="grid gap-4">
                  {inProgress.map((plan) => (
                    <PlanCard key={plan.id} plan={plan} />
                  ))}
                </div>
              </section>
            )}

            {completed.length > 0 && (
              <section>
                <h2 className="font-display text-lg font-semibold text-foreground mb-4 flex items-center gap-2">
                  <CheckCircle className="h-5 w-5 text-green-400" />
                  Completed ({completed.length})
                </h2>
                <div className="grid gap-4">
                  {completed.map((plan) => (
                    <PlanCard key={plan.id} plan={plan} />
                  ))}
                </div>
              </section>
            )}
          </div>
        )}
      </main>
    </div>
  );
};

const PlanCard = ({ plan }: { plan: CompliancePlan }) => (
  <Link to={`/compliance/${plan.id}`}>
    <div className="glass-card p-5 hover:border-primary/30 transition-colors group">
      <div className="flex items-center justify-between">
        <div>
          <h3 className="font-medium text-foreground text-sm group-hover:text-primary transition-colors">
            {plan.title}
          </h3>
          <p className="text-xs text-muted-foreground mt-1">
            Updated {new Date(plan.updated_at).toLocaleDateString()}
          </p>
        </div>
        <ArrowRight className="h-4 w-4 text-muted-foreground group-hover:text-primary transition-colors" />
      </div>
    </div>
  </Link>
);

export default ComplianceDashboard;
