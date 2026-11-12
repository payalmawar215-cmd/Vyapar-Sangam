import { useEffect, useState } from "react";
import { Users } from "lucide-react";
import { useToast } from "@/lib/ToastContext";
import PageHeader from "@/components/common/PageHeader";
import EmptyState from "@/components/common/EmptyState";
import { formatDate } from "@/lib/format";
import { adminService } from "@/services/ndaService";

const ROLES = ["buyer", "seller", "admin"];

export default function AdminUsers() {
  const { toast } = useToast();
  const [users, setUsers] = useState(null);
  const [error, setError] = useState(false);

  useEffect(() => {
    const load = async () => {
      try {
        const res = await adminService.getUsers();
        setUsers(Array.isArray(res.data) ? res.data : res.data.results || []);
      } catch (e) {
        setError(true);
      }
    };
    load();
  }, []);

  const setRole = async (u, app_role) => {
    try {
      await adminService.updateUser(u.id, { app_role });
      setUsers(users.map((x) => (x.id === u.id ? { ...x, app_role, role: app_role.toUpperCase() } : x)));
      toast({ description: `${u.email} is now a ${app_role}.` });
    } catch (e) {
      toast({ description: "Could not update this user.", variant: "destructive" });
    }
  };

  return (
    <div>
      <PageHeader
        eyebrow="Admin"
        title="Platform"
        titleAccent="users"
        subtitle="Everyone who has joined Vyapar Sangam. Assign or change their marketplace role here."
      />
      <section className="px-[4%] md:px-[2%] pb-24">
        <div className="max-w-[1400px] mx-auto">
          {error ? (
            <EmptyState title="Something went wrong." subtitle="We couldn't load the user list. Please refresh and try again." icon={Users} />
          ) : users === null ? (
            <div className="space-y-4">{[...Array(4)].map((_, i) => <div key={i} className="h-14 bg-secondary animate-pulse rounded" />)}</div>
          ) : users.length === 0 ? (
            <EmptyState
              title="No users yet."
              subtitle="Users appear here as people register and join the platform."
              icon={Users}
            />
          ) : (
            <div className="overflow-x-auto border-t border-b border-border">
              <table className="w-full min-w-[640px]">
                <thead>
                  <tr className="border-b border-border">
                    {["User", "Email", "Joined", "Role"].map((h) => (
                      <th key={h} className="text-left font-body text-[10px] tracking-label uppercase text-muted-foreground py-4 pr-6">{h}</th>
                    ))}
                  </tr>
                </thead>
                <tbody className="divide-y divide-border">
                  {users.map((u) => (
                    <tr key={u.id}>
                      <td className="py-4 pr-6 font-body text-sm text-foreground">{u.full_name || u.username || "—"}</td>
                      <td className="py-4 pr-6 font-body text-sm text-muted-foreground">{u.email}</td>
                      <td className="py-4 pr-6 font-body text-xs text-muted-foreground">{formatDate(u.created_date || u.date_joined)}</td>
                      <td className="py-4 pr-6">
                        <select
                          value={u.app_role || u.role?.toLowerCase() || ""}
                          onChange={(e) => setRole(u, e.target.value)}
                          aria-label={`Role for ${u.email}`}
                          className="bg-transparent border border-border rounded-full px-4 py-1.5 font-body text-xs text-foreground focus:outline-none focus:border-accent cursor-pointer"
                        >
                          <option value="">No role yet</option>
                          {ROLES.map((r) => <option key={r} value={r}>{r}</option>)}
                        </select>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          )}
        </div>
      </section>
    </div>
  );
}
