import { useState, useEffect } from "react";
import { useNavigate } from "react-router-dom";
import { Shield } from "lucide-react";
import { motion } from "framer-motion";
import { useAuth } from "@/hooks/useAuth";
import { supabase } from "@/integrations/supabase/client";
import { useToast } from "@/hooks/use-toast";

const Auth = () => {
  const [isSignUp, setIsSignUp] = useState(false);
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [fullName, setFullName] = useState("");
  const [companyName, setCompanyName] = useState("");
  const [useExisting, setUseExisting] = useState(false);
  const [existingCompanies, setExistingCompanies] = useState<{ id: string; name: string }[]>([]);
  const [selectedCompanyId, setSelectedCompanyId] = useState("");
  const [submitting, setSubmitting] = useState(false);

  const { signIn, signUp, user } = useAuth();
  const navigate = useNavigate();
  const { toast } = useToast();

  useEffect(() => {
    if (user) navigate("/");
  }, [user, navigate]);

  // Fetch companies for "join existing" flow — use service role via edge function not needed,
  // we'll just let users type the company name since RLS restricts select to own company.
  // For signup, they just type a name — if it exists, we create, if not, we create new.

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setSubmitting(true);

    try {
      if (isSignUp) {
        const { error } = await signUp(email, password, fullName, companyName);
        if (error) {
          toast({ title: "Sign up failed", description: error.message, variant: "destructive" });
        } else {
          toast({ title: "Account created!", description: "You're now signed in." });
        }
      } else {
        const { error } = await signIn(email, password);
        if (error) {
          toast({ title: "Sign in failed", description: error.message, variant: "destructive" });
        }
      }
    } finally {
      setSubmitting(false);
    }
  };

  return (
    <div className="min-h-screen bg-background grid-bg flex items-center justify-center px-4">
      <motion.div
        initial={{ opacity: 0, y: 20 }}
        animate={{ opacity: 1, y: 0 }}
        className="w-full max-w-md"
      >
        <div className="flex items-center justify-center gap-3 mb-8">
          <div className="p-2.5 rounded-xl bg-primary/10 border border-primary/20 glow-blue">
            <Shield className="h-8 w-8 text-primary" />
          </div>
          <h1 className="font-display text-3xl font-bold tracking-tight text-foreground">
            AI Security <span className="text-gradient-blue">Insight</span>
          </h1>
        </div>

        <div className="glass-card p-8">
          <h2 className="text-xl font-display font-semibold text-foreground mb-6 text-center">
            {isSignUp ? "Create Account" : "Sign In"}
          </h2>

          <form onSubmit={handleSubmit} className="space-y-4">
            {isSignUp && (
              <>
                <div>
                  <label className="text-sm text-muted-foreground mb-1 block">Full Name</label>
                  <input
                    type="text"
                    value={fullName}
                    onChange={(e) => setFullName(e.target.value)}
                    required
                    className="w-full px-3 py-2 rounded-lg bg-secondary/50 border border-border/50 text-foreground text-sm outline-none focus:border-primary/50 transition-colors"
                    placeholder="John Doe"
                  />
                </div>
                <div>
                  <label className="text-sm text-muted-foreground mb-1 block">Company Name</label>
                  <input
                    type="text"
                    value={companyName}
                    onChange={(e) => setCompanyName(e.target.value)}
                    required
                    className="w-full px-3 py-2 rounded-lg bg-secondary/50 border border-border/50 text-foreground text-sm outline-none focus:border-primary/50 transition-colors"
                    placeholder="Enter or create a company"
                  />
                  <p className="text-xs text-muted-foreground mt-1">A new company will be created if it doesn't exist.</p>
                </div>
              </>
            )}
            <div>
              <label className="text-sm text-muted-foreground mb-1 block">Email</label>
              <input
                type="email"
                value={email}
                onChange={(e) => setEmail(e.target.value)}
                required
                className="w-full px-3 py-2 rounded-lg bg-secondary/50 border border-border/50 text-foreground text-sm outline-none focus:border-primary/50 transition-colors"
                placeholder="you@company.com"
              />
            </div>
            <div>
              <label className="text-sm text-muted-foreground mb-1 block">Password</label>
              <input
                type="password"
                value={password}
                onChange={(e) => setPassword(e.target.value)}
                required
                minLength={6}
                className="w-full px-3 py-2 rounded-lg bg-secondary/50 border border-border/50 text-foreground text-sm outline-none focus:border-primary/50 transition-colors"
                placeholder="••••••••"
              />
            </div>

            <button
              type="submit"
              disabled={submitting}
              className="w-full py-2.5 rounded-lg bg-primary text-primary-foreground font-medium text-sm hover:bg-primary/90 transition-colors disabled:opacity-50"
            >
              {submitting ? "Please wait..." : isSignUp ? "Create Account" : "Sign In"}
            </button>
          </form>

          <p className="text-sm text-muted-foreground text-center mt-4">
            {isSignUp ? "Already have an account?" : "Don't have an account?"}{" "}
            <button
              onClick={() => setIsSignUp(!isSignUp)}
              className="text-primary hover:underline"
            >
              {isSignUp ? "Sign In" : "Sign Up"}
            </button>
          </p>
        </div>
      </motion.div>
    </div>
  );
};

export default Auth;
