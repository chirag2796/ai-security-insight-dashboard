import { useState, useEffect, createContext, useContext, ReactNode } from "react";
import { supabase } from "@/integrations/supabase/client";
import type { User, Session } from "@supabase/supabase-js";

interface Profile {
  id: string;
  full_name: string;
  company_id: string;
  company_name?: string;
}

interface AuthContextType {
  user: User | null;
  session: Session | null;
  profile: Profile | null;
  loading: boolean;
  signUp: (email: string, password: string, fullName: string, companyName: string, existingCompanyId?: string) => Promise<{ error: any }>;
  signIn: (email: string, password: string) => Promise<{ error: any }>;
  signOut: () => Promise<void>;
}

const AuthContext = createContext<AuthContextType>({} as AuthContextType);

export const AuthProvider = ({ children }: { children: ReactNode }) => {
  const [user, setUser] = useState<User | null>(null);
  const [session, setSession] = useState<Session | null>(null);
  const [profile, setProfile] = useState<Profile | null>(null);
  const [loading, setLoading] = useState(true);

  const fetchProfile = async (userId: string) => {
    const { data } = await supabase
      .from("profiles")
      .select("id, full_name, company_id")
      .eq("user_id", userId)
      .maybeSingle();

    if (data) {
      const { data: company } = await supabase
        .from("companies")
        .select("name")
        .eq("id", data.company_id)
        .maybeSingle();

      setProfile({
        ...data,
        company_name: company?.name || "Unknown",
      });
    }
  };

  useEffect(() => {
    const { data: { subscription } } = supabase.auth.onAuthStateChange(
      async (_event, session) => {
        setSession(session);
        setUser(session?.user ?? null);
        if (session?.user) {
          setTimeout(() => fetchProfile(session.user.id), 0);
        } else {
          setProfile(null);
        }
        setLoading(false);
      }
    );

    supabase.auth.getSession().then(({ data: { session } }) => {
      setSession(session);
      setUser(session?.user ?? null);
      if (session?.user) {
        fetchProfile(session.user.id);
      }
      setLoading(false);
    });

    return () => subscription.unsubscribe();
  }, []);

  const signUp = async (email: string, password: string, fullName: string, companyName: string, existingCompanyId?: string) => {
    const { data, error } = await supabase.auth.signUp({
      email,
      password,
      options: { emailRedirectTo: window.location.origin },
    });

    if (error) return { error };
    if (!data.user) return { error: { message: "Signup failed — no user returned" } };

    if (data.session) {
      await supabase.auth.setSession({
        access_token: data.session.access_token,
        refresh_token: data.session.refresh_token,
      });
    }

    let companyId = existingCompanyId;

    if (!companyId) {
      const { data: newCompany, error: companyError } = await supabase
        .from("companies")
        .insert({ name: companyName })
        .select()
        .single();
      if (companyError) {
        console.error("Company creation failed:", companyError);
        return { error: companyError };
      }
      companyId = newCompany.id;
    }

    const { error: profileError } = await supabase
      .from("profiles")
      .insert({
        user_id: data.user.id,
        full_name: fullName,
        company_id: companyId!,
      });
    if (profileError) {
      console.error("Profile creation failed:", profileError);
      return { error: profileError };
    }

    // Create member record with owner role for new org
    await supabase.from("members").insert({
      org_id: companyId!,
      user_id: data.user.id,
      role: "owner",
    });

    await fetchProfile(data.user.id);

    return { error: null };
  };

  const signIn = async (email: string, password: string) => {
    const { error } = await supabase.auth.signInWithPassword({ email, password });
    return { error };
  };

  const signOut = async () => {
    await supabase.auth.signOut();
    setProfile(null);
  };

  return (
    <AuthContext.Provider value={{ user, session, profile, loading, signUp, signIn, signOut }}>
      {children}
    </AuthContext.Provider>
  );
};

export const useAuth = () => useContext(AuthContext);
