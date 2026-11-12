import { useEffect, useState } from "react";
import { useToast } from "@/lib/ToastContext";
import { useAuth } from "@/context/AuthContext";
import PageHeader from "@/components/common/PageHeader";

export default function ProfilePage() {
  const { user, updateMe } = useAuth();
  const { toast } = useToast();
  const [form, setForm] = useState({ phone: "", city: "", organization: "", bio: "" });
  const [busy, setBusy] = useState(false);

  useEffect(() => {
    if (user) {
      setForm({
        phone: user.phone || user.phone_number || "",
        city: user.city || "",
        organization: user.organization || user.company_name || "",
        bio: user.bio || "",
      });
    }
  }, [user]);

  const set = (key) => (e) => setForm({ ...form, [key]: e.target.value });

  const save = async (e) => {
    e.preventDefault();
    setBusy(true);
    try {
      if (updateMe) {
        await updateMe(form);
      }
      toast({ description: "Profile updated." });
    } catch {
      toast({ description: "Could not save your profile. Please try again.", variant: "destructive" });
    } finally {
      setBusy(false);
    }
  };

  const inputCls = "w-full bg-transparent border-b border-border pb-2 font-body text-sm text-foreground placeholder:text-muted-foreground/50 focus:outline-none focus:border-accent transition-colors";
  const labelCls = "font-body text-[10px] tracking-label uppercase text-muted-foreground block mb-2";

  const userRole = user?.app_role || (user?.role ? user.role.toLowerCase() : "No role selected");

  return (
    <div>
      <PageHeader
        eyebrow="Account"
        title="Your"
        titleAccent="profile"
        subtitle="How you appear on Vyapar Sangam. Your email stays private — sellers and buyers never see it until you choose to connect."
      />
      <section className="px-[4%] md:px-[2%] pb-24 md:pb-32">
        <div className="max-w-2xl mx-auto">
          <div className="border border-border p-8 md:p-12">
            <div className="flex items-center gap-5 pb-8 border-b border-border mb-10">
              <div className="w-14 h-14 rounded-full bg-foreground text-background flex items-center justify-center font-display text-xl">
                {(user?.full_name || user?.username || user?.email || "V").charAt(0).toUpperCase()}
              </div>
              <div>
                <p className="font-body text-sm text-foreground">{user?.full_name || user?.username || "—"}</p>
                <p className="font-body text-xs text-muted-foreground">{user?.email}</p>
                <p className="font-body text-[10px] tracking-label uppercase text-accent mt-1 capitalize">{userRole}</p>
              </div>
            </div>

            <form onSubmit={save} className="space-y-8">
              <div>
                <label className={labelCls}>Phone</label>
                <input value={form.phone} onChange={set("phone")} placeholder="Optional" className={inputCls} />
              </div>
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-8">
                <div>
                  <label className={labelCls}>City</label>
                  <input value={form.city} onChange={set("city")} placeholder="e.g. Jaipur" className={inputCls} />
                </div>
                <div>
                  <label className={labelCls}>Organization</label>
                  <input value={form.organization} onChange={set("organization")} placeholder="e.g. Sharma & Sons" className={inputCls} />
                </div>
              </div>
              <div>
                <label className={labelCls}>Bio</label>
                <textarea
                  value={form.bio}
                  onChange={set("bio")}
                  rows={3}
                  placeholder={userRole === "seller" ? "A line about your business journey…" : "A line about what you're looking for…"}
                  className={`${inputCls} resize-none`}
                />
              </div>
              <button
                type="submit"
                disabled={busy}
                className="text-xs px-8 py-3 font-body tracking-widest uppercase rounded-full border border-foreground bg-foreground text-background hover:bg-foreground/80 transition-all duration-500 disabled:opacity-50"
              >
                Save Profile
              </button>
            </form>
          </div>
        </div>
      </section>
    </div>
  );
}
