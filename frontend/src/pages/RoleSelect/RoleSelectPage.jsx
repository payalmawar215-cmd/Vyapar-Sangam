import { useState } from "react";
import { useNavigate } from "react-router-dom";
import { ShoppingBag, Store, ShieldCheck } from "lucide-react";
import { useAuth } from "@/context/AuthContext";
import { useToast } from "@/lib/ToastContext";

export default function RoleSelectPage() {
  const { user, updateRole } = useAuth();
  const navigate = useNavigate();
  const { toast } = useToast();
  const [busy, setBusy] = useState(false);

  const choose = async (role) => {
    setBusy(true);
    try {
      await updateRole(role);
      toast({ description: `Role set to ${role}.` });
      navigate(role === "buyer" ? "/buyer" : role === "seller" ? "/seller" : "/admin");
    } catch {
      toast({ description: "Could not set role. Please try again.", variant: "destructive" });
      setBusy(false);
    }
  };

  const isPlatformAdmin = user?.app_role === "admin" || user?.role === "ADMIN" || user?.is_staff;

  const options = [
    {
      role: "buyer",
      icon: ShoppingBag,
      title: "I'm a Buyer",
      desc: "Discover established businesses, save favorites, express interest and acquire what already works.",
    },
    {
      role: "seller",
      icon: Store,
      title: "I'm a Seller",
      desc: "List your business, control what buyers see, review interest and proceed toward succession.",
    },
  ];

  return (
    <div className="min-h-[80vh] flex flex-col items-center justify-center px-[6%] pt-32 pb-24">
      <p className="font-body text-xs tracking-label uppercase text-muted-foreground mb-4">Welcome to Vyapar Sangam</p>
      <h1 className="font-display text-display-lg font-light text-center text-foreground">
        How will you use the <span className="italic text-accent">platform?</span>
      </h1>
      <p className="font-body text-sm text-muted-foreground text-center max-w-md mt-4 leading-relaxed">
        Choose your role — it shapes your dashboard, tools and permissions. You can change it later in settings.
      </p>

      <div className="grid grid-cols-1 md:grid-cols-2 gap-6 mt-14 w-full max-w-3xl">
        {options.map((o) => (
          <button
            key={o.role}
            onClick={() => choose(o.role)}
            disabled={busy}
            className="text-left border border-border p-10 hover:border-accent hover:bg-secondary/40 transition-all duration-500 disabled:opacity-50 group cursor-pointer rounded-sm"
          >
            <o.icon size={24} strokeWidth={1.25} className="text-accent mb-6" />
            <h3 className="font-display text-3xl font-light text-foreground">{o.title}</h3>
            <p className="font-body text-sm text-muted-foreground mt-3 leading-relaxed">{o.desc}</p>
            <p className="font-body text-xs tracking-label uppercase text-accent mt-8 opacity-0 group-hover:opacity-100 transition-opacity">
              Continue →
            </p>
          </button>
        ))}
      </div>

      {isPlatformAdmin && (
        <button
          onClick={() => choose("admin")}
          disabled={busy}
          className="mt-8 inline-flex items-center gap-2 font-body text-xs tracking-label uppercase text-muted-foreground hover:text-foreground transition-colors cursor-pointer"
        >
          <ShieldCheck size={14} /> Enter as Platform Admin
        </button>
      )}
    </div>
  );
}
