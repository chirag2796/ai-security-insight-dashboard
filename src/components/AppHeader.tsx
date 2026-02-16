import { Link } from "react-router-dom";
import { Shield, LogOut, ClipboardList, FileText, User } from "lucide-react";
import { useAuth } from "@/hooks/useAuth";

const AppHeader = () => {
  const { profile, signOut } = useAuth();

  return (
    <header className="sticky top-0 z-40 backdrop-blur-xl bg-background/80 border-b border-border/50">
      <div className="max-w-7xl mx-auto px-4 py-3 flex items-center justify-between">
        <Link to="/" className="flex items-center gap-2">
          <Shield className="h-5 w-5 text-primary" />
          <span className="font-display font-bold text-foreground">AI Security Insight</span>
        </Link>

        <div className="flex items-center gap-4">
          <Link
            to="/reports"
            className="flex items-center gap-1.5 text-sm text-muted-foreground hover:text-foreground transition-colors"
          >
            <FileText className="h-4 w-4" />
            Reports
          </Link>
          <Link
            to="/compliance"
            className="flex items-center gap-1.5 text-sm text-muted-foreground hover:text-foreground transition-colors"
          >
            <ClipboardList className="h-4 w-4" />
            Compliance Plans
          </Link>

          {profile && (
            <div className="flex items-center gap-3">
              <div className="text-right hidden sm:block">
                <p className="text-sm font-medium text-foreground">{profile.full_name}</p>
                <p className="text-xs text-muted-foreground">{profile.company_name}</p>
              </div>
              <div className="flex items-center gap-1">
                <div className="p-1.5 rounded-full bg-primary/10">
                  <User className="h-4 w-4 text-primary" />
                </div>
                <button
                  onClick={signOut}
                  className="p-1.5 rounded-full hover:bg-secondary/50 text-muted-foreground hover:text-foreground transition-colors"
                  title="Sign out"
                >
                  <LogOut className="h-4 w-4" />
                </button>
              </div>
            </div>
          )}
        </div>
      </div>
    </header>
  );
};

export default AppHeader;
