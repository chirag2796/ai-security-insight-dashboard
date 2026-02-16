import { SidebarProvider, SidebarTrigger } from "@/components/ui/sidebar";
import { AppSidebar } from "@/components/AppSidebar";
import { useAuth } from "@/hooks/useAuth";

export default function AppLayout({ children }: { children: React.ReactNode }) {
  const { profile } = useAuth();

  return (
    <SidebarProvider>
      <div className="min-h-screen flex w-full">
        <AppSidebar />
        <div className="flex-1 flex flex-col min-w-0">
          <header className="sticky top-0 z-40 backdrop-blur-xl bg-background/80 border-b border-border/50 h-12 flex items-center px-4 gap-3">
            <SidebarTrigger />
            <div className="ml-auto flex items-center gap-3">
              {profile && (
                <div className="text-right hidden sm:block">
                  <p className="text-sm font-medium text-foreground">{profile.full_name}</p>
                  <p className="text-xs text-muted-foreground">{profile.company_name}</p>
                </div>
              )}
            </div>
          </header>
          <main className="flex-1 overflow-auto">
            {children}
          </main>
        </div>
      </div>
    </SidebarProvider>
  );
}
