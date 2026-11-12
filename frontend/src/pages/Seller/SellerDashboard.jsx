import { useEffect, useState } from "react";
import { Link } from "react-router-dom";
import { Store, Handshake, KeyRound, Plus, ArrowRight } from "lucide-react";
import { useAuth } from "@/context/AuthContext";
import StatCard from "@/components/common/StatCard";
import PageHeader from "@/components/common/PageHeader";
import EmptyState from "@/components/common/EmptyState";
import { listingService } from "@/services/listingService";
import { requestService } from "@/services/requestService";
import { dealService } from "@/services/ndaService";
import { formatINR, formatDate, DEAL_STATUS_LABEL } from "@/lib/format";

const STATUS_LABEL = { draft: "Draft", pending: "Pending Approval", approved: "Approved", rejected: "Rejected", changes_required: "Changes Required" };

export default function SellerDashboard() {
  const { user } = useAuth();
  const [stats, setStats] = useState(null);
  const [listings, setListings] = useState([]);
  const [requests, setRequests] = useState([]);
  const [deals, setDeals] = useState([]);

  useEffect(() => {
    if (!user) return;
    const load = async () => {
      try {
        const [myListingsRes, requestsRes, dealsRes] = await Promise.all([
          listingService.getMyListings().catch(() => ({ data: [] })),
          requestService.getAll().catch(() => ({ data: [] })),
          dealService.getAll().catch(() => ({ data: [] })),
        ]);

        const myListings = Array.isArray(myListingsRes.data) ? myListingsRes.data : myListingsRes.data.results || [];
        const allRequests = Array.isArray(requestsRes.data) ? requestsRes.data : requestsRes.data.results || [];
        const allDeals = Array.isArray(dealsRes.data) ? dealsRes.data : dealsRes.data.results || [];

        const total = myListings.length;
        const draft = myListings.filter((b) => b.status === "draft").length;
        const pending = myListings.filter((b) => b.status === "pending").length;
        const approved = myListings.filter((b) => b.status === "approved").length;
        const reqCount = allRequests.length;
        const activeDeals = allDeals.filter((d) => !["completed", "cancelled"].includes(d.status)).length;

        setStats({ total, draft, pending, approved, requests: reqCount, deals: activeDeals });
        setListings(myListings.slice(0, 6));
        setRequests(allRequests.slice(0, 5));
        setDeals(allDeals.filter((d) => !["completed", "cancelled"].includes(d.status)).slice(0, 4));
      } catch (err) {
        setStats({ total: 0, draft: 0, pending: 0, approved: 0, requests: 0, deals: 0 });
      }
    };
    load();
  }, [user]);

  return (
    <div>
      <PageHeader
        eyebrow="Seller Dashboard"
        title={`Welcome${user?.full_name ? `, ${user.full_name.split(" ")[0]}` : ""}`}
        titleAccent="— your legacy"
      />

      <section className="px-[4%] md:px-[2%] pb-24">
        <div className="max-w-[1400px] mx-auto">
          <div className="grid grid-cols-2 md:grid-cols-6 gap-8">
            <StatCard value={stats ? stats.total : "…"} label="Total Listings" />
            <StatCard value={stats ? stats.draft : "…"} label="Drafts" />
            <StatCard value={stats ? stats.pending : "…"} label="Pending Approval" />
            <StatCard value={stats ? stats.approved : "…"} label="Approved" />
            <StatCard value={stats ? stats.requests : "…"} label="Buyer Requests" />
            <StatCard value={stats ? stats.deals : "…"} label="Active Deals" />
          </div>

          <div className="flex flex-wrap items-center gap-4 mt-14">
            <Link
              to="/add-business"
              className="text-xs px-8 py-3 font-body tracking-widest uppercase rounded-full border border-foreground bg-foreground text-background hover:bg-foreground/80 transition-all duration-500 inline-flex items-center gap-2"
            >
              <Plus size={14} /> Add Business
            </Link>
            <Link to="/my-listings" className="ghost-btn text-xs">
              My Listings
            </Link>
          </div>

          {/* Listings */}
          <div className="mt-20">
            <div className="flex items-end justify-between mb-10">
              <h2 className="font-display text-display-md font-light text-foreground">Your listings</h2>
              <Link to="/my-listings" className="font-body text-xs tracking-label uppercase text-muted-foreground hover:text-foreground flex items-center gap-2">
                Manage all <ArrowRight size={13} />
              </Link>
            </div>
            {listings.length === 0 ? (
              <EmptyState
                title="You haven't listed a business yet."
                subtitle="Create your first listing — tell the story of your business and let the right buyer find it."
                action="Add Business"
                actionTo="/add-business"
                icon={Store}
              />
            ) : (
              <div className="divide-y divide-border border-t border-b border-border">
                {listings.map((b) => (
                  <div key={b.id} className="py-5 flex flex-wrap items-center justify-between gap-3">
                    <div>
                      <p className="font-body text-sm text-foreground">{b.name || b.title}</p>
                      <p className="font-body text-xs text-muted-foreground mt-0.5">
                        {b.category_name || b.category} · {b.city || b.location} · {formatINR(b.asking_price)}
                      </p>
                      {(b.status === "rejected" || b.status === "changes_required") && b.rejection_reason && (
                        <p className="font-body text-xs text-destructive mt-1">{b.rejection_reason}</p>
                      )}
                    </div>
                    <div className="flex items-center gap-3">
                      <span className={`font-body text-[10px] tracking-label uppercase px-3 py-1.5 rounded-full border ${
                        b.status === "approved" ? "border-accent text-accent" :
                        b.status === "rejected" ? "border-destructive/40 text-destructive" :
                        b.status === "changes_required" ? "border-orange-400/60 text-orange-600" :
                        "border-border text-muted-foreground"
                      }`}>
                        {STATUS_LABEL[b.status] || b.status}
                      </span>
                      {b.is_verified && (
                        <span className="font-body text-[10px] tracking-label uppercase px-2.5 py-1 rounded-full border border-accent/60 text-accent" title="Verified Business">
                          ✓ Verified
                        </span>
                      )}
                      <Link to={`/business/${b.id}/edit`} className="font-body text-xs text-muted-foreground hover:text-foreground underline underline-offset-4">
                        Edit
                      </Link>
                    </div>
                  </div>
                ))}
              </div>
            )}
          </div>

          {/* Recent buyer requests */}
          <div className="mt-20">
            <div className="flex items-end justify-between mb-10">
              <h2 className="font-display text-display-md font-light text-foreground">Recent buyer requests</h2>
              <Link to="/requests" className="font-body text-xs tracking-label uppercase text-muted-foreground hover:text-foreground flex items-center gap-2">
                Review all <ArrowRight size={13} />
              </Link>
            </div>
            {requests.length === 0 ? (
              <EmptyState
                title="No interest requests yet."
                subtitle="When buyers discover your approved listings, their requests will appear here."
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
                        From {r.buyer_name || r.buyer_username || r.created_by || "Buyer"} · {formatDate(r.created_at || r.created_date)}
                      </p>
                    </div>
                    <span className={`font-body text-[10px] tracking-label uppercase px-3 py-1.5 rounded-full border ${
                      r.status === "accepted" ? "border-accent text-accent" : r.status === "rejected" ? "border-border text-muted-foreground" : "border-foreground/30 text-foreground/70"
                    }`}>
                      {r.status}
                    </span>
                  </div>
                ))}
              </div>
            )}
          </div>

          {/* Active deals */}
          <div className="mt-20">
            <div className="flex items-end justify-between mb-10">
              <h2 className="font-display text-display-md font-light text-foreground">Active deals</h2>
              <Link to="/deals" className="font-body text-xs tracking-label uppercase text-muted-foreground hover:text-foreground flex items-center gap-2">
                View all <ArrowRight size={13} />
              </Link>
            </div>
            {deals.length === 0 ? (
              <EmptyState title="No active deals yet." subtitle="Deals open automatically once an NDA is completed." icon={KeyRound} />
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
