import { useEffect, useState } from "react";
import { useParams, Link } from "react-router-dom";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/hooks/useAuth";
import { ArrowLeft, CheckCircle, Circle, Calendar, User, Save, Loader2 } from "lucide-react";
import { motion } from "framer-motion";
import { useToast } from "@/hooks/use-toast";

interface Step {
  id: string;
  step_number: number;
  title: string;
  description: string | null;
  is_completed: boolean;
  memo: string | null;
  assigned_to: string | null;
  due_date: string | null;
}

interface Plan {
  id: string;
  title: string;
  status: string;
  report_id: string;
}

const CompliancePlan = () => {
  const { id } = useParams<{ id: string }>();
  const { profile } = useAuth();
  const [plan, setPlan] = useState<Plan | null>(null);
  const [steps, setSteps] = useState<Step[]>([]);
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState<string | null>(null);
  const { toast } = useToast();

  useEffect(() => {
    if (!id) return;
    const fetchData = async () => {
      const [planRes, stepsRes] = await Promise.all([
        supabase.from("compliance_plans").select("*").eq("id", id).maybeSingle(),
        supabase.from("compliance_steps").select("*").eq("plan_id", id).order("step_number"),
      ]);
      setPlan(planRes.data);
      setSteps(stepsRes.data || []);
      setLoading(false);
    };
    fetchData();
  }, [id]);

  const toggleStep = async (step: Step) => {
    const newCompleted = !step.is_completed;
    setSteps((prev) => prev.map((s) => (s.id === step.id ? { ...s, is_completed: newCompleted } : s)));
    await supabase.from("compliance_steps").update({ is_completed: newCompleted }).eq("id", step.id);

    const updatedSteps = steps.map((s) => s.id === step.id ? { ...s, is_completed: newCompleted } : s);
    const allDone = updatedSteps.every((s) => s.is_completed);
    if (allDone && plan) {
      await supabase.from("compliance_plans").update({ status: "completed" }).eq("id", plan.id);
      setPlan({ ...plan, status: "completed" });
      toast({ title: "Plan completed!" });
    } else if (!allDone && plan?.status === "completed") {
      await supabase.from("compliance_plans").update({ status: "in_progress" }).eq("id", plan.id);
      setPlan({ ...plan, status: "in_progress" });
    }
  };

  const updateStepField = async (stepId: string, field: string, value: string | null) => {
    setSaving(stepId);
    await supabase.from("compliance_steps").update({ [field]: value }).eq("id", stepId);
    setSteps((prev) => prev.map((s) => (s.id === stepId ? { ...s, [field]: value } : s)));
    setSaving(null);
  };

  if (loading) {
    return (
      <div className="flex items-center justify-center py-20">
        <Loader2 className="h-8 w-8 text-primary animate-spin" />
      </div>
    );
  }

  if (!plan) {
    return (
      <div className="text-center py-20">
        <p className="text-muted-foreground">Plan not found.</p>
      </div>
    );
  }

  const completedCount = steps.filter((s) => s.is_completed).length;

  return (
    <div className="p-6 max-w-4xl mx-auto">
      <div className="flex items-center gap-3 mb-6">
        <Link to="/compliance" className="flex items-center gap-1 text-sm text-muted-foreground hover:text-foreground transition-colors">
          <ArrowLeft className="h-4 w-4" /> Back
        </Link>
      </div>

      <motion.div initial={{ opacity: 0, y: 10 }} animate={{ opacity: 1, y: 0 }}>
        <div className="flex items-start justify-between mb-6">
          <div>
            <h1 className="font-display text-2xl font-bold text-foreground">{plan.title}</h1>
            <p className="text-sm text-muted-foreground mt-1">{completedCount}/{steps.length} steps completed</p>
          </div>
          <span className={`text-xs px-3 py-1 rounded-full border ${plan.status === "completed" ? "text-green-400 border-green-400/30 bg-green-400/10" : "text-yellow-400 border-yellow-400/30 bg-yellow-400/10"}`}>
            {plan.status === "completed" ? "Completed" : "In Progress"}
          </span>
        </div>

        <div className="w-full h-2 rounded-full bg-secondary/50 mb-8">
          <div className="h-full rounded-full bg-primary transition-all duration-500" style={{ width: `${steps.length > 0 ? (completedCount / steps.length) * 100 : 0}%` }} />
        </div>

        <div className="space-y-4">
          {steps.map((step, i) => (
            <motion.div key={step.id} initial={{ opacity: 0, y: 10 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: i * 0.05 }} className="glass-card p-5">
              <div className="flex items-start gap-3">
                <button onClick={() => toggleStep(step)} className="mt-0.5 shrink-0">
                  {step.is_completed ? <CheckCircle className="h-5 w-5 text-green-400" /> : <Circle className="h-5 w-5 text-muted-foreground hover:text-primary transition-colors" />}
                </button>
                <div className="flex-1 min-w-0">
                  <h3 className={`font-medium text-sm ${step.is_completed ? "text-muted-foreground line-through" : "text-foreground"}`}>
                    Step {step.step_number}: {step.title}
                  </h3>
                  {step.description && <p className="text-xs text-muted-foreground mt-1">{step.description}</p>}
                  <div className="mt-3 grid grid-cols-1 sm:grid-cols-2 gap-3">
                    <div>
                      <label className="text-xs text-muted-foreground flex items-center gap-1 mb-1"><User className="h-3 w-3" /> Assigned To</label>
                      <input type="text" value={step.assigned_to || ""} onChange={(e) => setSteps((prev) => prev.map((s) => s.id === step.id ? { ...s, assigned_to: e.target.value } : s))} onBlur={(e) => updateStepField(step.id, "assigned_to", e.target.value || null)} className="w-full px-2 py-1.5 rounded bg-secondary/50 border border-border/50 text-foreground text-xs outline-none focus:border-primary/50" placeholder="Name or email" />
                    </div>
                    <div>
                      <label className="text-xs text-muted-foreground flex items-center gap-1 mb-1"><Calendar className="h-3 w-3" /> Due Date</label>
                      <input type="date" value={step.due_date || ""} onChange={(e) => { const val = e.target.value || null; setSteps((prev) => prev.map((s) => s.id === step.id ? { ...s, due_date: val } : s)); updateStepField(step.id, "due_date", val); }} className="w-full px-2 py-1.5 rounded bg-secondary/50 border border-border/50 text-foreground text-xs outline-none focus:border-primary/50" />
                    </div>
                  </div>
                  <div className="mt-3">
                    <label className="text-xs text-muted-foreground mb-1 block">Memo / Notes</label>
                    <textarea value={step.memo || ""} onChange={(e) => setSteps((prev) => prev.map((s) => s.id === step.id ? { ...s, memo: e.target.value } : s))} onBlur={(e) => updateStepField(step.id, "memo", e.target.value || null)} rows={2} className="w-full px-2 py-1.5 rounded bg-secondary/50 border border-border/50 text-foreground text-xs outline-none focus:border-primary/50 resize-none" placeholder="Add notes..." />
                  </div>
                  {saving === step.id && <p className="text-xs text-primary mt-1 flex items-center gap-1"><Save className="h-3 w-3" /> Saving...</p>}
                </div>
              </div>
            </motion.div>
          ))}
        </div>
      </motion.div>
    </div>
  );
};

export default CompliancePlan;
