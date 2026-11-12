import { useEffect, useState } from "react";
import { Link } from "react-router-dom";
import { Heart, Handshake, KeyRound, ArrowRight } from "lucide-react";
import { useAuth } from "@/context/AuthContext";
import StatCard from "@/components/common/StatCard";
import PageHeader from "@/components/common/PageHeader";
import EmptyState from "@/components/common/EmptyState";
import { favoriteService, ndaService, dealService } from "@/services/ndaService";
import { requestService } from "@/services/requestService";
import { formatDate, DEAL_STATUS_LABEL } from "@/lib/format";

const REQUEST_STATUS_LABEL = { pending: "Pending", accepted: "Accepted", rejected: "Rejected" };

export default function BuyerDashboard() {
  const { user } = useAuth();
  const [stats, setStats] = useState(null);
  const [requests, setRequests] = useState([]);
  const [saved, setSaved] = useState([]);
  const [deals, setDeals] = useState([]);

  useEffect(() => {
    if (!user) return;
    const load = async () => {
      try {
        const [favRes, reqRes, ndaRes, dealRes] = await Promise.all([
          favoriteService.getAll().catch(() => ({ data: [] })),
          requestService.getAll().catch(() => ({ data: [] })),
          ndaService.getAll().catch(() => ({ data: [] })),
          dealService.getAll().catch(() => ({ data: [] })),
        ]);

        const allFavs = Array.isArray(favRes.data) ? favRes.data : favRes.data.results || [];
        const allReqs = Array.isArray(reqRes.data) ? reqRes.data : reqRes.data.results || [];
        const allNdas = Array.isArray(ndaRes.data) ? ndaRes.data : ndaRes.data.results || [];
        const allDeals = Array.isArray(dealRes.data) ? dealRes.data : dealRes.data.results || [];

        const favCount = allFavs.length;
        const reqCount = allReqs.length;
        const accCount = allReqs.filter((r) => r.status === "accepted").length;
        const ndaCount = allNdas.filter((n) => n.status !== "completed").length;
        const dealCount = allDeals.filter((d) => !["completed", "cancelled"].includes(d.status)).length;

        setStats({
          saved: favCount,
          requests: reqCount,
          accepted: accCount,
          nda: ndaCount,
          deals: dealCount,
        });

        setRequests(allReqs.slice(0, 5));
        setSaved(allFavs.slice(0, 6).map((f) => f.business_details || f.business || f).filter(Boolean));
        setDeals(allDeals.slice(0, 4));
      } catch (e) {
        setStats({ saved: 0, requests: 0, accepted: 0, nda: 0, deals: 0 });
      }
    };
    load();
  }, [user]);

  return (
    <div>
      <PageHeader
        eyebrow="Buyer Dashboard"
        title={`Welcome${user?.full_name ? `, ${user.full_name.split(" ")[0]}` : ""}`}
        titleAccent="— your acquisitions"
      />

      <section className="px-[4%] md:px-[2%] pb-24">
        <div className="max-w-[1400px] mx-auto">
          <div className="grid grid-cols-2 md:grid-cols-5 gap-8">
            <StatCard value={stats ? stats.saved : "…"} label="Saved Businesses" />
            <StatCard value={stats ? stats.requests : "…"} label="Interest Requests" />
            <StatCard value={stats ? stats.accepted : "…"} label="Accepted Requests" />
            <StatCard value={stats ? stats.nda : "…"} label="Pending NDA" />
            <StatCard value={stats ? stats.deals : "…"} label="Active Deals" />
          </div>

          {/* Recent requests */}
          <div className="mt-20">
            <div className="flex items-end justify-between mb-10">
              <h2 className="font-display text-display-md font-light text-foreground">Recent requests</h2>
              <Link to="/requests" className="font-body text-xs tracking-label uppercase text-muted-foreground hover:text-foreground flex items-center gap-2">
                View all <ArrowRight size={13} />
              </Link>
            </div>
            {requests.length === 0 ? (
              <EmptyState
                title="No interest requests yet."
                subtitle="When you express interest in a business, it will appear here with its live status."
                action="Explore Businesses"
                actionTo="/businesses"
                icon={Handshake}
              />
            ) : (
              <div className="divide-y divide-border border-t border-b border-border">
                {requests.map((r) => (
                  <div key={r.id} className="py-5 flex flex-wrap items-center justify-between gap-3">
                    <div>
                      <p className="font-body text-sm text-foreground">
                        {r.listing || r.business_id ? (
                          <Link
                            to={`/business/${r.listing || r.business_id}`}
                            className="hover:text-accent transition-colors"
                          >
                            {r.listing_title || r.business?.name || r.business_name || "Business"}
                          </Link>
                        ) : (
                          r.listing_title || r.business?.name || r.business_name || "Business"
                        )}
                      </p>
                      <p className="font-body text-xs text-muted-foreground mt-0.5">
                        {r.request_type === "contact" ? "Contact request" : "Interest"} · {formatDate(r.created_at || r.created_date)}
                      </p>
                    </div>
                    <span className={`font-body text-[10px] tracking-label uppercase px-3 py-1.5 rounded-full border ${
                      r.status === "accepted" ? "border-accent text-accent" : r.status === "rejected" ? "border-border text-muted-foreground" : "border-foreground/30 text-foreground/70"
                    }`}>
                      {REQUEST_STATUS_LABEL[r.status] || r.status}
                    </span>
                  </div>
                ))}
              </div>
            )}
          </div>

          {/* Saved businesses */}
          <div className="mt-20">
            <div className="flex items-end justify-between mb-10">
              <h2 className="font-display text-display-md font-light text-foreground">Saved businesses</h2>
              <Link to="/favorites" className="font-body text-xs tracking-label uppercase text-muted-foreground hover:text-foreground flex items-center gap-2">
                View all <ArrowRight size={13} />
              </Link>
            </div>
            {saved.length === 0 ? (
              <EmptyState
                title="You haven't saved any businesses yet."
                subtitle="Tap the heart on any listing to keep it here for easy comparison."
                action="Explore Businesses"
                actionTo="/businesses"
                icon={Heart}
              />
            ) : (
              <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-8">
                {saved.map((b) => (
                  <Link key={b.id} to={`/business/${b.id}`} className="group border border-border p-6 hover:border-accent transition-colors block">
                    <p className="font-body text-[10px] tracking-label uppercase text-muted-foreground">{b.category_name || b.category} · {b.city || b.location}</p>
                    <h3 className="font-display text-xl font-light mt-2 group-hover:text-accent transition-colors text-foreground">{b.name || b.title}</h3>
                  </Link>
                ))}
              </div>
            )}
          </div>

          {/* Deal progress */}
          <div className="mt-20">
            <div className="flex items-end justify-between mb-10">
              <h2 className="font-display text-display-md font-light text-foreground">Deal progress</h2>
              <Link to="/deals" className="font-body text-xs tracking-label uppercase text-muted-foreground hover:text-foreground flex items-center gap-2">
                View all <ArrowRight size={13} />
              </Link>
            </div>
            {deals.length === 0 ? (
              <EmptyState
                title="No active deals yet."
                subtitle="Once an NDA is completed on an accepted request, your deal will appear here."
                icon={KeyRound}
              />
            ) : (
              <div className="divide-y divide-border border-t border-b border-border">
                {deals.map((d) => (
                  <div key={d.id} className="py-5 flex flex-wrap items-center justify-between gap-3">
                    <p className="font-body text-sm text-foreground">
                      <Link to="/deals" className="hover:text-accent transition-colors">
                        {d.business_title || d.business?.name || d.business_name || "Business"}
                      </Link>
                    </p>
                    <span className="font-body text-[10px] tracking-label uppercase px-3 py-1.5 rounded-full border border-accent text-accent">
                      {DEAL_STATUS_LABEL[d.status] || d.status}
                    </span>
                  </div>
                ))}
              </div>
            )}
          </div>
        </div>
      </section>
    </div>
  );
}
