import { useEffect, useState } from "react";
import { Link } from "react-router-dom";
import { Store, Clock, Handshake, BadgeCheck, CalendarDays } from "lucide-react";
import StatCard from "@/components/common/StatCard";
import PageHeader from "@/components/common/PageHeader";
import EmptyState from "@/components/common/EmptyState";
import { adminService } from "@/services/ndaService";

export default function AdminDashboard() {
  const [stats, setStats] = useState(null);
  const [categoryRows, setCategoryRows] = useState(null);

  useEffect(() => {
    const load = async () => {
      try {
        const res = await adminService.getStats();
        const data = res.data;
        setStats(data);
        setCategoryRows(data.category_rows || []);
      } catch (e) {
        setStats({ error: true });
      }
    };
    load();
  }, []);

  const s = stats;

  return (
    <div>
      <PageHeader
        eyebrow="Admin"
        title="Platform"
        titleAccent="overview"
        subtitle="Live figures straight from the database — users, listings, requests and deals across Vyapar Sangam."
      />

      <section className="px-[4%] md:px-[2%] pb-24">
        <div className="max-w-[1400px] mx-auto">
          <div className="grid grid-cols-2 md:grid-cols-4 gap-8">
            <StatCard value={s ? s.users : "…"} label="Total Users" />
            <StatCard value={s ? s.buyers : "…"} label="Buyers" />
            <StatCard value={s ? s.sellers : "…"} label="Sellers" />
            <StatCard value={s ? s.businesses : "…"} label="Total Businesses" />
            <StatCard value={s ? s.pending : "…"} label="Pending Listings" />
            <StatCard value={s ? s.approved : "…"} label="Approved Listings" />
            <StatCard value={s ? s.requests : "…"} label="Interest Requests" />
            <StatCard value={s ? s.deals : "…"} label="Active Deals" />
          </div>

          <div className="mt-20">
            <h2 className="font-display text-display-md font-light mb-10">Listings by category</h2>
            {categoryRows === null ? (
              <div className="h-40 bg-secondary animate-pulse rounded" />
            ) : !categoryRows.length ? (
              <EmptyState
                title="No analytics yet."
                subtitle="Charts will appear here as soon as businesses are listed on the platform."
                icon={Store}
              />
            ) : (
              <div className="space-y-6 max-w-3xl">
                {categoryRows.map((row) => {
                  const max = Math.max(...categoryRows.map((r) => r.count), 1);
                  return (
                    <div key={row.category}>
                      <div className="flex items-center justify-between mb-2">
                        <span className="font-body text-sm text-foreground">{row.category}</span>
                        <span className="font-body text-xs text-muted-foreground">{row.count}</span>
                      </div>
                      <div className="h-1 bg-secondary rounded-full overflow-hidden">
                        <div
                          className="h-1 bg-accent rounded-full"
                          style={{ width: `${(row.count / max) * 100}%` }}
                        />
                      </div>
                    </div>
                  );
                })}
              </div>
            )}
          </div>

          <div className="mt-20 grid grid-cols-1 md:grid-cols-2 gap-8 max-w-4xl">
            {[
              {
                icon: Clock,
                label: "Awaiting your review",
                value: s ? `${s.pending} pending listing${s.pending === 1 ? "" : "s"}` : "…",
                link: "/admin/pending",
              },
              {
                icon: Handshake,
                label: "Marketplace activity",
                value: s ? `${s.requests} interest request${s.requests === 1 ? "" : "s"}` : "…",
                link: "/admin/requests",
              },
              {
                icon: BadgeCheck,
                label: "Business verification",
                value: s ? (s.under_verification != null ? `${s.under_verification} pending verification${s.under_verification === 1 ? "" : "s"}` : "Verification system active") : "…",
                link: "/admin/listings",
              },
              {
                icon: CalendarDays,
                label: "Meetings on platform",
                value: s ? (s.meetings != null ? `${s.meetings} meeting${s.meetings === 1 ? "" : "s"} scheduled` : "Meetings feature active") : "…",
                link: null,
              },
            ].map((c, i) => (
              <div key={i} className="border-t border-border pt-6 flex items-start gap-4">
                <c.icon size={18} strokeWidth={1.25} className="text-accent mt-1" />
                <div>
                  <p className="font-body text-sm text-foreground">{c.value}</p>
                  <p className="font-body text-xs text-muted-foreground mt-1">{c.label}</p>
                  {c.link && (
                    <Link to={c.link} className="font-body text-[10px] tracking-label uppercase text-accent hover:underline underline-offset-2 mt-2 inline-block">
                      Manage →
                    </Link>
                  )}
                </div>
              </div>
            ))}
          </div>
        </div>
      </section>
    </div>
  );
}
