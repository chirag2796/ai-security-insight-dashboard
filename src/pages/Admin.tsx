import { useEffect, useState } from "react";
import { motion } from "framer-motion";
import { Settings, Users, Activity, Shield, UserPlus, Mail } from "lucide-react";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/hooks/useAuth";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Input } from "@/components/ui/input";
import { Button } from "@/components/ui/button";
import { useToast } from "@/hooks/use-toast";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogTrigger } from "@/components/ui/dialog";

const roleColors: Record<string, string> = {
  owner: "bg-primary/10 text-primary border-primary/20",
  admin: "bg-yellow-500/10 text-yellow-400 border-yellow-500/20",
  member: "bg-muted text-muted-foreground border-border",
};

const statusColors: Record<string, string> = {
  active: "bg-green-500/10 text-green-400 border-green-500/20",
  pending_signup: "bg-orange-500/10 text-orange-400 border-orange-500/20",
};

const Admin = () => {
  const { profile, user } = useAuth();
  const { toast } = useToast();
  const [orgName, setOrgName] = useState("");
  const [orgSlug, setOrgSlug] = useState("");
  const [members, setMembers] = useState<any[]>([]);
  const [activity, setActivity] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  const [inviteEmail, setInviteEmail] = useState("");
  const [inviteName, setInviteName] = useState("");
  const [inviting, setInviting] = useState(false);
  const [inviteOpen, setInviteOpen] = useState(false);

  useEffect(() => {
    if (!profile?.company_id) return;
    const fetchAll = async () => {
      const [orgRes, membersRes, activityRes] = await Promise.all([
        supabase.from("companies").select("*").eq("id", profile.company_id).maybeSingle(),
        supabase.from("members").select("*, profiles(full_name)").eq("org_id", profile.company_id),
        supabase.from("activity_log").select("*").eq("org_id", profile.company_id).order("created_at", { ascending: false }).limit(50),
      ]);
      if (orgRes.data) {
        setOrgName(orgRes.data.name);
        setOrgSlug(orgRes.data.slug || "");
      }
      setMembers(membersRes.data || []);
      setActivity(activityRes.data || []);
      setLoading(false);
    };
    fetchAll();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [profile?.company_id]);

  const handleSaveOrg = async () => {
    if (!profile?.company_id) return;
    const { error } = await supabase.from("companies").update({ name: orgName, slug: orgSlug }).eq("id", profile.company_id);
    if (error) toast({ title: "Failed to update", description: error.message, variant: "destructive" });
    else toast({ title: "Organization updated" });
  };

  const refreshData = async () => {
    if (!profile?.company_id) return;
    const [membersRes, activityRes] = await Promise.all([
      supabase.from("members").select("*, profiles(full_name)").eq("org_id", profile.company_id),
      supabase.from("activity_log").select("*").eq("org_id", profile.company_id).order("created_at", { ascending: false }).limit(50),
    ]);
    setMembers(membersRes.data || []);
    setActivity(activityRes.data || []);
  };

  const handleInvite = async () => {
    if (!inviteEmail) return;
    setInviting(true);
    try {
      const { data: { session } } = await supabase.auth.getSession();
      const res = await fetch(`${import.meta.env.VITE_SUPABASE_URL}/functions/v1/invite-user`, {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          Authorization: `Bearer ${session?.access_token}`,
        },
        body: JSON.stringify({ email: inviteEmail, full_name: inviteName }),
      });
      const result = await res.json();
      if (!res.ok) {
        toast({ title: "Invite failed", description: result.error, variant: "destructive" });
      } else {
        toast({ title: "Invite sent!", description: `Invitation email sent to ${inviteEmail}` });
        setInviteEmail("");
        setInviteName("");
        setInviteOpen(false);
        await refreshData();
      }
    } catch (err: any) {
      toast({ title: "Error", description: err.message, variant: "destructive" });
    } finally {
      setInviting(false);
    }
  };

  return (
    <div className="p-6 max-w-5xl mx-auto space-y-6">
      <motion.div initial={{ opacity: 0, y: 10 }} animate={{ opacity: 1, y: 0 }}>
        <h1 className="font-display text-3xl font-bold text-foreground">Admin</h1>
        <p className="text-muted-foreground text-sm mt-1">Organization settings and management</p>
      </motion.div>

      <Tabs defaultValue="members">
        <TabsList>
          <TabsTrigger value="members" className="gap-2"><Users className="h-4 w-4" /> Members</TabsTrigger>
          <TabsTrigger value="settings" className="gap-2"><Settings className="h-4 w-4" /> Settings</TabsTrigger>
          <TabsTrigger value="activity" className="gap-2"><Activity className="h-4 w-4" /> Activity Log</TabsTrigger>
        </TabsList>

        <TabsContent value="members" className="mt-6">
          <Card className="glass-card border-border/50">
            <CardHeader className="flex flex-row items-center justify-between">
              <CardTitle>Team Members</CardTitle>
              <Dialog open={inviteOpen} onOpenChange={setInviteOpen}>
                <DialogTrigger asChild>
                  <Button size="sm" className="gap-2">
                    <UserPlus className="h-4 w-4" /> Invite User
                  </Button>
                </DialogTrigger>
                <DialogContent>
                  <DialogHeader>
                    <DialogTitle>Invite Team Member</DialogTitle>
                  </DialogHeader>
                  <div className="space-y-4 mt-2">
                    <p className="text-sm text-muted-foreground">
                      Send an invitation email. The user will be added to your organization with the <Badge variant="outline" className="ml-1">User</Badge> role.
                    </p>
                    <div>
                      <label className="text-sm text-muted-foreground mb-1 block">Full Name</label>
                      <Input value={inviteName} onChange={(e) => setInviteName(e.target.value)} placeholder="Jane Doe" />
                    </div>
                    <div>
                      <label className="text-sm text-muted-foreground mb-1 block">Email</label>
                      <Input type="email" value={inviteEmail} onChange={(e) => setInviteEmail(e.target.value)} placeholder="jane@company.com" />
                    </div>
                    <Button onClick={handleInvite} disabled={inviting || !inviteEmail} className="w-full gap-2">
                      <Mail className="h-4 w-4" />
                      {inviting ? "Sending..." : "Send Invitation"}
                    </Button>
                  </div>
                </DialogContent>
              </Dialog>
            </CardHeader>
            <CardContent>
              {members.length === 0 ? (
                <p className="text-muted-foreground text-sm">No members yet. Invite your first team member above.</p>
              ) : (
                <div className="space-y-3">
                  {members.map((m) => (
                    <div key={m.id} className="flex items-center justify-between p-3 rounded-lg border border-border/50 bg-secondary/20">
                      <div className="flex items-center gap-3">
                        <Shield className="h-4 w-4 text-primary" />
                        <div>
                          <span className="text-sm font-medium text-foreground">
                            {m.profiles?.full_name || m.invite_email || "Unknown"}
                          </span>
                          {m.invite_email && m.invite_status === "pending_signup" && (
                            <p className="text-xs text-muted-foreground">{m.invite_email}</p>
                          )}
                        </div>
                      </div>
                      <div className="flex items-center gap-2">
                        {m.invite_status === "pending_signup" && (
                          <Badge variant="outline" className={statusColors.pending_signup}>Pending Signup</Badge>
                        )}
                        <Badge variant="outline" className={roleColors[m.role] || ""}>{m.role}</Badge>
                      </div>
                    </div>
                  ))}
                </div>
              )}
            </CardContent>
          </Card>
        </TabsContent>

        <TabsContent value="settings" className="mt-6">
          <Card className="glass-card border-border/50">
            <CardHeader><CardTitle>Organization Settings</CardTitle></CardHeader>
            <CardContent className="space-y-4">
              <div>
                <label className="text-sm text-muted-foreground mb-1 block">Organization Name</label>
                <Input value={orgName} onChange={(e) => setOrgName(e.target.value)} />
              </div>
              <div>
                <label className="text-sm text-muted-foreground mb-1 block">Slug</label>
                <Input value={orgSlug} onChange={(e) => setOrgSlug(e.target.value)} placeholder="my-org" />
              </div>
              <Button onClick={handleSaveOrg}>Save Changes</Button>
            </CardContent>
          </Card>
        </TabsContent>

        <TabsContent value="activity" className="mt-6">
          <Card className="glass-card border-border/50">
            <CardHeader><CardTitle>Activity Log</CardTitle></CardHeader>
            <CardContent>
              {activity.length === 0 ? (
                <p className="text-muted-foreground text-sm">No activity recorded yet.</p>
              ) : (
                <div className="space-y-2">
                  {activity.map((a) => (
                    <div key={a.id} className="flex items-start gap-3 text-sm p-2 rounded hover:bg-secondary/30">
                      <div className="w-2 h-2 rounded-full bg-primary mt-1.5 shrink-0" />
                      <div className="flex-1">
                        <p className="text-foreground">{a.action}</p>
                        <p className="text-xs text-muted-foreground">{new Date(a.created_at).toLocaleString()}</p>
                      </div>
                      {a.entity_type && (
                        <Badge variant="outline" className="text-xs">{a.entity_type}</Badge>
                      )}
                    </div>
                  ))}
                </div>
              )}
            </CardContent>
          </Card>
        </TabsContent>
      </Tabs>
    </div>
  );
};

export default Admin;
