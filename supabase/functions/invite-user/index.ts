import { createClient } from "https://esm.sh/@supabase/supabase-js@2";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type",
};

Deno.serve(async (req) => {
  if (req.method === "OPTIONS") {
    return new Response(null, { headers: corsHeaders });
  }

  try {
    const supabaseUrl = Deno.env.get("SUPABASE_URL")!;
    const serviceRoleKey = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!;
    const anonKey = Deno.env.get("SUPABASE_ANON_KEY")!;
    const resendApiKey = Deno.env.get("RESEND_API_KEY")!;

    // Verify caller is authenticated
    const authHeader = req.headers.get("Authorization")!;
    const callerClient = createClient(supabaseUrl, anonKey, {
      global: { headers: { Authorization: authHeader } },
    });
    const { data: { user: caller } } = await callerClient.auth.getUser();
    if (!caller) {
      return new Response(JSON.stringify({ error: "Unauthorized" }), {
        status: 401, headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    const adminClient = createClient(supabaseUrl, serviceRoleKey);

    // Check admin role
    const { data: roleData } = await adminClient
      .from("user_roles")
      .select("role")
      .eq("user_id", caller.id)
      .eq("role", "admin")
      .maybeSingle();

    if (!roleData) {
      return new Response(JSON.stringify({ error: "Only admins can invite users" }), {
        status: 403, headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    // Get caller's org and name
    const { data: profile } = await adminClient
      .from("profiles")
      .select("company_id, full_name")
      .eq("user_id", caller.id)
      .maybeSingle();

    if (!profile) {
      return new Response(JSON.stringify({ error: "Profile not found" }), {
        status: 400, headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    const { data: company } = await adminClient
      .from("companies")
      .select("name")
      .eq("id", profile.company_id)
      .maybeSingle();

    const { email, full_name } = await req.json();
    if (!email) {
      return new Response(JSON.stringify({ error: "Email is required" }), {
        status: 400, headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    const inviteeName = full_name || email.split("@")[0];
    const orgName = company?.name || "the organization";

    // Determine the app URL (use the Lovable published URL)
    const appUrl = supabaseUrl.replace('.supabase.co', '.lovable.app');
    const redirectTo = `${appUrl}/set-password`;

    // 1. Generate an invite link (creates user if needed + generates token)
    const { data: inviteData, error: inviteError } = await adminClient.auth.admin.generateLink({
      type: "invite",
      email,
      options: {
        data: {
          full_name: inviteeName,
          invited_to_org: profile.company_id,
        },
        redirectTo,
      },
    });

    if (inviteError) {
      console.error("Generate link error:", inviteError);
      return new Response(JSON.stringify({ error: inviteError.message }), {
        status: 400, headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    // Build the confirmation URL from the returned properties
    const tokenHash = inviteData.properties.hashed_token;
    const confirmUrl = `${supabaseUrl}/auth/v1/verify?token_hash=${tokenHash}&type=invite&redirect_to=${encodeURIComponent(redirectTo)}`;

    // 2. Create pending member record (upsert to avoid duplicates)
    const { error: memberError } = await adminClient.from("members").upsert({
      org_id: profile.company_id,
      user_id: inviteData.user.id,
      role: "member",
      invite_email: email,
      invite_status: "pending_signup",
    }, { onConflict: "org_id,user_id" });

    if (memberError) {
      console.error("Member upsert error:", memberError);
    }

    // 3. Log admin activity
    await adminClient.from("activity_log").insert({
      org_id: profile.company_id,
      actor_id: caller.id,
      action: `Invited ${inviteeName} (${email}) to join the organization`,
      entity_type: "member",
      entity_id: inviteData.user.id,
      metadata: { invited_email: email, invited_name: inviteeName },
    });

    // 4. Send invitation email via Resend
    const emailRes = await fetch("https://api.resend.com/emails", {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        Authorization: `Bearer ${resendApiKey}`,
      },
      body: JSON.stringify({
        from: "GRC Platform <noreply@deep-ai-audit.cgupta.tech>",
        to: [email],
        subject: `${profile.full_name} has invited you to join ${orgName}`,
        html: `
          <div style="font-family: Arial, sans-serif; max-width: 600px; margin: 0 auto; padding: 20px;">
            <h2 style="color: #1a1a2e;">You've been invited!</h2>
            <p>Hi ${inviteeName},</p>
            <p><strong>${profile.full_name}</strong> has invited you to join <strong>${orgName}</strong> on the GRC Platform.</p>
            <p>Click the button below to accept your invitation and set your password:</p>
            <div style="text-align: center; margin: 30px 0;">
              <a href="${confirmUrl}" 
                 style="background-color: #3b82f6; color: white; padding: 12px 32px; text-decoration: none; border-radius: 8px; font-weight: bold; display: inline-block;">
                Accept Invitation & Set Password
              </a>
            </div>
            <p style="color: #666; font-size: 14px;">If you didn't expect this invitation, you can safely ignore this email.</p>
          </div>
        `,
      }),
    });

    const emailResult = await emailRes.json();

    if (!emailRes.ok) {
      console.error("Resend error:", emailResult);
      return new Response(JSON.stringify({ error: `Email failed: ${emailResult.message || "Unknown error"}` }), {
        status: 500, headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    console.log("Invite sent successfully:", emailResult);

    return new Response(JSON.stringify({ success: true, email_id: emailResult.id }), {
      headers: { ...corsHeaders, "Content-Type": "application/json" },
    });
  } catch (err) {
    console.error("Invite error:", err);
    return new Response(JSON.stringify({ error: err.message }), {
      status: 500, headers: { ...corsHeaders, "Content-Type": "application/json" },
    });
  }
});
